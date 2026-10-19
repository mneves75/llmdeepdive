import unittest
from decimal import Decimal

from pricing import line_total


class HeldOut(unittest.TestCase):
    """Written apart from the repair loop and never shown to it (lesson 21.5)."""

    def test_twelve_units_get_the_bulk_discount(self):
        self.assertEqual(line_total(12, Decimal("10.00")), Decimal("114.00"))

    def test_a_discounted_line_rounds_half_up_to_the_cent(self):
        self.assertEqual(line_total(10, Decimal("0.99")), Decimal("9.41"))
