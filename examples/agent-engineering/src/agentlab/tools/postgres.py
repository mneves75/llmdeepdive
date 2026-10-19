"""Lesson 15.4: the purchasing tools over Postgres, with two independent tenant checks.

Needs the ``postgres`` dependency group (psycopg), so the core suite never
imports this module; ``tests_postgres/test_tools_postgres.py`` runs it.

Each query runs in its own read-only transaction that first sets two
transaction-local settings, both as bound parameters:

- ``statement_timeout``, so a slow query is cancelled by the server;
- ``agentlab.tenant_id``, which the table's row-level security policy reads.

The SQL in ``queries.py`` already filters by tenant. Row-level security is
the second wall: if a future query forgot its ``WHERE tenant_id``, the
database would still return only the caller's rows. It only holds when the
connection logs in as a role that does not own the table and cannot bypass
row security.
"""

from __future__ import annotations

import psycopg
from psycopg.rows import dict_row

from agentlab.domain import Principal
from agentlab.tools.queries import QueryTooExpensive

DEFAULT_TIMEOUT_MS = 2000


class PostgresReadOnly:
    placeholder = "%s"

    def __init__(self, conninfo: str, timeout_ms: int = DEFAULT_TIMEOUT_MS) -> None:
        self._conn = psycopg.connect(conninfo, autocommit=True, row_factory=dict_row)
        self._conn.read_only = True  # every transaction below starts as BEGIN READ ONLY
        self._timeout = f"{int(timeout_ms)}ms"

    def close(self) -> None:
        self._conn.close()

    def fetch(self, principal: Principal, sql: str, params: tuple, max_rows: int) -> list[dict]:
        try:
            with self._conn.transaction():
                self._conn.execute(
                    "SELECT set_config('statement_timeout', %s, true), set_config('agentlab.tenant_id', %s, true)",
                    (self._timeout, principal.tenant_id),
                )
                return self._conn.execute(sql, params).fetchmany(max_rows)
        except psycopg.errors.QueryCanceled as error:
            raise QueryTooExpensive("query exceeded its time budget") from error
