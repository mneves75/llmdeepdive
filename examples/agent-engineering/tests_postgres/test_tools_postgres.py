"""Lesson 15.4 against a real Postgres: a read-only role, row-level security and a statement timeout.

The test creates its own database and login role, both named agentlab_test_*,
and drops them afterwards even when a test fails. It connects to the server
named by AGENTLAB_PG_DSN (default: the local socket, database postgres).
"""

import os
import secrets
import unittest
import uuid

import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo

from agentlab.domain import Principal
from agentlab.fixtures import load_purchases
from agentlab.tools.contracts import LookupPurchaseOrder, SearchPurchaseOrders, ToolRejected
from agentlab.tools.postgres import PostgresReadOnly
from agentlab.tools.queries import QueryTooExpensive, lookup_purchase_order, search_purchase_orders

DSN = os.environ.get("AGENTLAB_PG_DSN", "postgresql:///postgres")
TENANT_A = Principal(user_id="u1", tenant_id="tenant-a")

SCHEMA = """
CREATE TABLE purchases (
    po_id      TEXT PRIMARY KEY,
    tenant_id  TEXT NOT NULL,
    supplier   TEXT NOT NULL,
    item       TEXT NOT NULL,
    quantity   INTEGER NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    currency   TEXT NOT NULL,
    status     TEXT NOT NULL
);
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
-- No tenant setting means NULL, which matches no row: the policy fails closed.
CREATE POLICY tenant_rows ON purchases FOR SELECT USING (tenant_id = current_setting('agentlab.tenant_id', true));
"""


class PostgresTools(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        suffix = uuid.uuid4().hex[:12]
        cls.database, cls.reader = f"agentlab_test_tools_{suffix}", f"agentlab_test_reader_{suffix}"
        try:
            admin = psycopg.connect(DSN, autocommit=True)
        except psycopg.OperationalError as error:
            raise unittest.SkipTest(f"no Postgres reachable through AGENTLAB_PG_DSN: {type(error).__name__}") from error
        # Cleanups run last-registered-first: database, then role, then the admin connection.
        cls.addClassCleanup(admin.close)
        password = secrets.token_hex(16)
        admin.execute(sql.SQL("CREATE ROLE {} LOGIN PASSWORD {}").format(sql.Identifier(cls.reader), sql.Literal(password)))
        cls.addClassCleanup(admin.execute, sql.SQL("DROP ROLE IF EXISTS {}").format(sql.Identifier(cls.reader)))
        admin.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(cls.database)))
        cls.addClassCleanup(admin.execute, sql.SQL("DROP DATABASE IF EXISTS {} WITH (FORCE)").format(sql.Identifier(cls.database)))

        cls.owner = psycopg.connect(make_conninfo(DSN, dbname=cls.database), autocommit=True)
        cls.addClassCleanup(cls.owner.close)
        cls.owner.execute(SCHEMA)
        with cls.owner.cursor() as cursor:
            cursor.executemany(
                "INSERT INTO purchases VALUES (%(po_id)s, %(tenant_id)s, %(supplier)s, %(item)s, %(quantity)s, %(unit_price)s, %(currency)s, %(status)s)",
                load_purchases(),
            )
        # The reader may connect and read this one table. It owns nothing, so row security applies to it.
        for grant in ("GRANT CONNECT ON DATABASE {db} TO {role}", "GRANT USAGE ON SCHEMA public TO {role}", "GRANT SELECT ON purchases TO {role}"):
            cls.owner.execute(sql.SQL(grant).format(db=sql.Identifier(cls.database), role=sql.Identifier(cls.reader)))

        cls.reader_conninfo = make_conninfo(DSN, dbname=cls.database, user=cls.reader, password=password)
        cls.db = PostgresReadOnly(cls.reader_conninfo, timeout_ms=200)
        cls.addClassCleanup(cls.db.close)

    def row_count(self) -> int:
        return self.owner.execute("SELECT count(*) FROM purchases").fetchone()[0]

    def search(self, text: str) -> list[str]:
        return [row["po_id"] for row in search_purchase_orders(self.db, TENANT_A, SearchPurchaseOrders(item_contains=text))["rows"]]

    def test_benign_search_returns_only_the_callers_rows(self):
        self.assertEqual(self.search("bolts"), ["PO-1001"])

    def test_injection_attempts_are_data(self):
        before = self.row_count()
        self.assertEqual(self.search("zz') OR tenant_id LIKE ('tenant-b"), [])
        self.assertEqual(self.search("x'; DROP TABLE purchases; --"), [])
        self.assertEqual(self.row_count(), before)

    def test_another_tenants_order_is_not_found_and_the_callers_is(self):
        with self.assertRaises(ToolRejected):
            lookup_purchase_order(self.db, TENANT_A, LookupPurchaseOrder(po_id="PO-2001"))
        row = lookup_purchase_order(self.db, TENANT_A, LookupPurchaseOrder(po_id="PO-1001"))
        self.assertEqual((row["quantity"], row["unit_price"]), (40, "12.50"))

    def test_row_security_holds_even_when_a_query_forgets_the_tenant(self):
        unscoped = "SELECT po_id FROM purchases ORDER BY po_id"
        self.assertEqual([r["po_id"] for r in self.db.fetch(TENANT_A, unscoped, (), 50)], ["PO-1001", "PO-1002", "PO-1003", "PO-1004"])
        self.assertEqual(self.row_count(), 6)  # the rows exist; the policy hid tenant-b's

    def test_without_a_tenant_setting_the_reader_sees_nothing(self):
        with psycopg.connect(self.reader_conninfo, autocommit=True) as conn:
            self.assertEqual(conn.execute("SELECT count(*) FROM purchases").fetchone()[0], 0)

    def test_writes_are_refused_by_the_transaction_and_by_the_role(self):
        with self.assertRaises(psycopg.errors.ReadOnlySqlTransaction):
            self.db.fetch(TENANT_A, "DELETE FROM purchases", (), 1)
        with psycopg.connect(self.reader_conninfo, autocommit=True) as conn, self.assertRaises(psycopg.errors.InsufficientPrivilege):
            conn.execute("DELETE FROM purchases")
        self.assertEqual(self.row_count(), 6)

    def test_a_slow_query_is_cancelled_by_the_statement_timeout(self):
        with self.assertRaises(QueryTooExpensive):
            self.db.fetch(TENANT_A, "SELECT pg_sleep(5)", (), 1)
        self.assertEqual(self.search("bolts"), ["PO-1001"])  # the connection still works afterwards


if __name__ == "__main__":
    unittest.main()
