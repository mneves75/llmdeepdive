"""Synthetic data for the exercises. Every name, amount and account is invented."""

import json
from importlib.resources import files

_ROOT = files(__name__)


def load_purchases() -> list[dict]:
    return json.loads((_ROOT / "purchases.json").read_text(encoding="utf-8"))


def load_supplier_message(name: str) -> str:
    """Untrusted text from outside the company: evidence, never instructions."""
    if not name.replace("_", "").isalnum():
        raise ValueError(f"bad fixture name: {name!r}")
    return (_ROOT / "supplier_messages" / f"{name}.txt").read_text(encoding="utf-8")
