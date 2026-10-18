import unittest
from decimal import Decimal

from pricing import invoice_total, line_total


class LineTotal(unittest.TestCase):
    def test_ten_units_get_the_bulk_discount(self):
        self.assertEqual(line_total(10, Decimal("12.00")), Decimal("114.00"))

    def test_nine_units_pay_full_price(self):
        self.assertEqual(line_total(9, Decimal("12.00")), Decimal("108.00"))


class InvoiceTotal(unittest.TestCase):
    def test_an_invoice_adds_its_lines(self):
        self.assertEqual(invoice_total([(2, Decimal("5.00")), (1, Decimal("3.50"))]), Decimal("13.50"))
