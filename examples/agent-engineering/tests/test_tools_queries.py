"""Lesson 15.4: read-only business tools over SQLite (parameters, tenant scope, bounds)."""

import sqlite3
import tempfile
import unittest
from pathlib import Path

from agentlab.domain import Principal
from agentlab.fixtures import load_purchases
from agentlab.tools.contracts import ListPurchaseOrders, LookupPurchaseOrder, SearchPurchaseOrders, ToolRejected
from agentlab.tools.queries import (
    QueryTooExpensive,
    SqliteReadOnly,
    build_sqlite,
    list_purchase_orders,
    lookup_purchase_order,
    search_purchase_orders,
)

TENANT_A = Principal(user_id="u1", tenant_id="tenant-a")


class QueryTestCase(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.path = Path(self.dir.name) / "purchases.sqlite"
        build_sqlite(self.path, load_purchases())
        self.db = SqliteReadOnly(self.path)

    def tearDown(self):
        self.db.close()
        self.dir.cleanup()

    def row_count(self) -> int:
        with sqlite3.connect(self.path) as db:
            return db.execute("SELECT count(*) FROM purchases").fetchone()[0]

    def search(self, text: str) -> list[str]:
        return [row["po_id"] for row in search_purchase_orders(self.db, TENANT_A, SearchPurchaseOrders(item_contains=text))["rows"]]


class Injection(QueryTestCase):
    def test_benign_search_returns_only_the_callers_rows(self):
        # Both tenants bought M8 bolts (PO-1001 and PO-2001); tenant-a sees its own.
        self.assertEqual(self.search("bolts"), ["PO-1001"])

    def test_an_injected_condition_is_data_not_sql(self):
        self.assertEqual(self.search("zz') OR tenant_id LIKE ('tenant-b"), [])

    def test_an_injected_statement_changes_nothing(self):
        before = self.row_count()
        self.assertEqual(self.search("x'; DROP TABLE purchases; --"), [])
        self.assertEqual(self.row_count(), before)

    def test_like_wildcards_in_the_text_are_matched_literally(self):
        self.assertEqual(self.search("%%"), [])
        self.assertEqual(self.search("__"), [])

    def test_the_connection_itself_refuses_writes(self):
        # A second line of defence: even SQL built by mistake cannot write through this connection.
        with self.assertRaises(sqlite3.OperationalError):
            self.db.fetch(TENANT_A, "DELETE FROM purchases", (), 1)
        self.assertEqual(self.row_count(), 6)


class TenantScope(QueryTestCase):
    def test_another_tenants_order_is_not_found(self):
        with self.assertRaises(ToolRejected) as caught:
            lookup_purchase_order(self.db, TENANT_A, LookupPurchaseOrder(po_id="PO-2001"))
        self.assertIn("not found", str(caught.exception))

    def test_the_callers_own_order_is_found(self):
        row = lookup_purchase_order(self.db, TENANT_A, LookupPurchaseOrder(po_id="PO-1001"))
        self.assertEqual((row["quantity"], row["unit_price"]), (40, "12.50"))

    def test_a_listing_never_mixes_tenants(self):
        rows = list_purchase_orders(self.db, TENANT_A, ListPurchaseOrders(limit=50))["rows"]
        self.assertEqual([r["po_id"] for r in rows], ["PO-1001", "PO-1002", "PO-1003", "PO-1004"])


class Bounds(QueryTestCase):
    def test_a_listing_stops_at_its_limit_and_says_so(self):
        page = list_purchase_orders(self.db, TENANT_A, ListPurchaseOrders(limit=2))
        self.assertEqual((len(page["rows"]), page["truncated"]), (2, True))
        page = list_purchase_orders(self.db, TENANT_A, ListPurchaseOrders(status="open"))
        self.assertEqual(([r["po_id"] for r in page["rows"]], page["truncated"]), (["PO-1003"], False))

    def test_a_runaway_query_is_stopped_by_the_work_budget(self):
        endless = "WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n) SELECT count(*) FROM n"
        with self.assertRaises(QueryTooExpensive):
            self.db.fetch(TENANT_A, endless, (), 1)
        self.assertEqual(self.search("bolts"), ["PO-1001"])  # the connection still works afterwards


if __name__ == "__main__":
    unittest.main()
