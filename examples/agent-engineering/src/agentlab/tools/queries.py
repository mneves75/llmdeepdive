"""Lesson 15.4: read-only business tools over a database.

Four rules, each enforced in code and tested:

- Every query is a fixed SQL text with bound parameters. A value the model
  wrote travels as data and is never pasted into SQL.
- The tenant comes from the trusted ``Principal``, never from the arguments.
- Rows are bounded: ``LIMIT`` plus ``fetchmany``, and the result says when it
  was cut short.
- Work is bounded: SQLite counts virtual-machine steps and stops a query that
  exceeds its budget; Postgres uses ``statement_timeout`` (see ``postgres.py``).

The SQL texts use ``{p}`` where a parameter goes, because SQLite writes it
``?`` and psycopg ``%s``. Only these constant templates are ever formatted;
argument values never are.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Protocol

from agentlab.domain import Principal
from agentlab.tools.contracts import ListPurchaseOrders, LookupPurchaseOrder, SearchPurchaseOrders, Tool, ToolRejected

MAX_ROWS = 50
# Progress-handler calls (each one is 1,000 SQLite VM instructions) before a query is stopped.
SQLITE_WORK_BUDGET = 1_000

COLUMNS = "po_id, supplier, item, quantity, CAST(unit_price AS TEXT) AS unit_price, currency, status"
LOOKUP = f"SELECT {COLUMNS} FROM purchases WHERE tenant_id = {{p}} AND po_id = {{p}}"
LIST_ALL = f"SELECT {COLUMNS} FROM purchases WHERE tenant_id = {{p}} ORDER BY po_id LIMIT {{p}}"
LIST_BY_STATUS = f"SELECT {COLUMNS} FROM purchases WHERE tenant_id = {{p}} AND status = {{p}} ORDER BY po_id LIMIT {{p}}"
SEARCH = f"SELECT {COLUMNS} FROM purchases WHERE tenant_id = {{p}} AND lower(item) LIKE lower({{p}}) ESCAPE '\\' ORDER BY po_id LIMIT {{p}}"


class QueryTooExpensive(ToolRejected):
    """The query ran past its time or work budget and was stopped; the model is told so."""


class ReadOnlyDatabase(Protocol):
    placeholder: str

    def fetch(self, principal: Principal, sql: str, params: tuple, max_rows: int) -> list[dict]: ...


def build_sqlite(path: str | Path, purchases: list[dict]) -> None:
    """Create the exercise database from the synthetic fixtures (a separate, writable step)."""
    with sqlite3.connect(path) as db:
        db.execute(
            "CREATE TABLE purchases (po_id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, supplier TEXT NOT NULL,"
            " item TEXT NOT NULL, quantity INTEGER NOT NULL, unit_price TEXT NOT NULL, currency TEXT NOT NULL, status TEXT NOT NULL)"
        )
        db.executemany(
            "INSERT INTO purchases VALUES (:po_id, :tenant_id, :supplier, :item, :quantity, :unit_price, :currency, :status)", purchases
        )
    db.close()


class SqliteReadOnly:
    placeholder = "?"

    def __init__(self, path: str | Path, work_budget: int = SQLITE_WORK_BUDGET) -> None:
        # mode=ro opens the file read-only; query_only also refuses writes on this connection.
        self._db = sqlite3.connect(Path(path).resolve().as_uri() + "?mode=ro", uri=True)
        self._db.execute("PRAGMA query_only = ON")
        self._db.row_factory = sqlite3.Row
        self._budget = work_budget

    def close(self) -> None:
        self._db.close()

    def fetch(self, principal: Principal, sql: str, params: tuple, max_rows: int) -> list[dict]:
        """Run one query; SQLite has no row-level security, so tenant scoping is in the SQL."""
        calls = 0

        def over_budget() -> int:
            nonlocal calls
            calls += 1
            return 1 if calls > self._budget else 0  # non-zero interrupts the query

        self._db.set_progress_handler(over_budget, 1000)
        try:
            rows = self._db.execute(sql, params).fetchmany(max_rows)
        except sqlite3.OperationalError as error:
            if "interrupted" in str(error):
                raise QueryTooExpensive("query exceeded its work budget") from error
            raise
        finally:
            self._db.set_progress_handler(None, 0)
        return [dict(row) for row in rows]


def _sql(db: ReadOnlyDatabase, template: str) -> str:
    return template.format(p=db.placeholder)


def _page(db: ReadOnlyDatabase, principal: Principal, template: str, params: tuple, limit: int) -> dict:
    """Ask for one row more than the limit, so the result can say whether it was cut."""
    limit = min(limit, MAX_ROWS)
    rows = db.fetch(principal, _sql(db, template), (*params, limit + 1), limit + 1)
    return {"rows": rows[:limit], "truncated": len(rows) > limit}


def lookup_purchase_order(db: ReadOnlyDatabase, principal: Principal, args: LookupPurchaseOrder) -> dict:
    rows = db.fetch(principal, _sql(db, LOOKUP), (principal.tenant_id, args.po_id), 1)
    if not rows:
        raise ToolRejected(f"purchase order {args.po_id} not found")  # missing or another tenant's: same answer
    return rows[0]


def list_purchase_orders(db: ReadOnlyDatabase, principal: Principal, args: ListPurchaseOrders) -> dict:
    if args.status is None:
        return _page(db, principal, LIST_ALL, (principal.tenant_id,), args.limit)
    return _page(db, principal, LIST_BY_STATUS, (principal.tenant_id, args.status), args.limit)


def search_purchase_orders(db: ReadOnlyDatabase, principal: Principal, args: SearchPurchaseOrders) -> dict:
    # Escape LIKE's own wildcards so "%" in the text means a percent sign, not "anything".
    text = args.item_contains.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return _page(db, principal, SEARCH, (principal.tenant_id, f"%{text}%"), args.limit)


def purchasing_tools(db: ReadOnlyDatabase) -> list[Tool]:
    return [
        Tool(
            "lookup_purchase_order",
            "Read one purchase order of the caller's company by its number.",
            LookupPurchaseOrder,
            lambda principal, args: lookup_purchase_order(db, principal, args),
        ),
        Tool(
            "list_purchase_orders",
            "List the caller's purchase orders, optionally by status, at most 50 at a time.",
            ListPurchaseOrders,
            lambda principal, args: list_purchase_orders(db, principal, args),
        ),
        Tool(
            "search_purchase_orders",
            "Find the caller's purchase orders whose item description contains a text.",
            SearchPurchaseOrders,
            lambda principal, args: search_purchase_orders(db, principal, args),
        ),
    ]
