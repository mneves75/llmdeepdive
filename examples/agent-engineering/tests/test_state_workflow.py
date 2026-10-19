"""Lesson 14.1: a deterministic parser and a task success assertion."""

import unittest
from decimal import Decimal

from agentlab.fixtures import load_purchases, load_supplier_message
from agentlab.state.workflow import invoice_matches_purchase, parse_supplier_invoice


class ParseSupplierInvoice(unittest.TestCase):
    def test_reads_the_fixed_format(self):
        self.assertEqual(parse_supplier_invoice(load_supplier_message("benign")), ("PO-1001", Decimal("500.00")))

    def test_hidden_instructions_do_not_change_what_the_parser_reads(self):
        # The injected comment asks for USD 11,340.00; the parser only reads the total line.
        self.assertEqual(parse_supplier_invoice(load_supplier_message("injection")), ("PO-1002", Decimal("1134.00")))

    def test_an_unfamiliar_format_is_refused_not_guessed(self):
        with self.assertRaises(ValueError):
            parse_supplier_invoice("Subject: Invoice for PO-1001\n\nTotal due: five hundred dollars.")


class TaskSuccess(unittest.TestCase):
    def setUp(self):
        self.purchases = load_purchases()

    def test_a_total_that_matches_the_purchase_record_passes(self):
        self.assertEqual(invoice_matches_purchase("PO-1001", Decimal("500.00"), self.purchases, "tenant-a"), [])

    def test_a_total_that_disagrees_with_the_record_fails(self):
        problems = invoice_matches_purchase("PO-1001", Decimal("5000.00"), self.purchases, "tenant-a")
        self.assertEqual(len(problems), 1)
        self.assertIn("expected 500.00", problems[0])

    def test_another_tenants_purchase_order_is_not_found(self):
        # PO-2001 exists, but for tenant-b: a tenant-a run must not see it.
        problems = invoice_matches_purchase("PO-2001", Decimal("4760.00"), self.purchases, "tenant-a")
        self.assertEqual(problems, ["PO-2001 is not a purchase order of tenant-a"])


if __name__ == "__main__":
    unittest.main()
