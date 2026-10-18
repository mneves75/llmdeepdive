"""Invoice arithmetic for the purchasing assistant (synthetic data, track 21)."""

from decimal import ROUND_HALF_UP, Decimal

BULK_UNITS = 10
BULK_DISCOUNT = Decimal("0.05")
CENT = Decimal("0.01")


def line_total(quantity: int, unit_price: Decimal) -> Decimal:
    """Price of one invoice line. Orders of BULK_UNITS or more get BULK_DISCOUNT off."""
    total = quantity * unit_price
    if quantity > BULK_UNITS:
        total -= total * BULK_DISCOUNT
    return total.quantize(CENT, rounding=ROUND_HALF_UP)


def invoice_total(lines: list[tuple[int, Decimal]]) -> Decimal:
    """Sum of the line totals, each already rounded to the cent."""
    return sum((line_total(quantity, price) for quantity, price in lines), Decimal("0"))
