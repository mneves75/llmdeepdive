"""A track's package imports only the shared modules and packages of earlier tracks.

The spec (docs/specs/agent-engineering/spec.md, "Executable code: one rule")
fixes the order below. A later track may build on an earlier one; the reverse
would teach lesson 15 with code that lesson 23 defines.
"""

import ast
import unittest
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / "src" / "agentlab"
SHARED = {"domain", "model", "fixtures"}
# Track order from the spec's package table, 14 to 25.
ORDER = ["state", "tools", "security", "sandbox", "gui", "memory", "approval", "repair", "multiagent", "evals", "resilience", "capstone"]


def agentlab_imports(file: Path) -> set[str]:
    """Top-level agentlab subpackages or modules a file imports (absolute imports only)."""
    found: set[str] = set()
    for node in ast.walk(ast.parse(file.read_text(encoding="utf-8"), filename=str(file))):
        if isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
            parts = node.module.split(".")
            if parts[0] == "agentlab":
                if len(parts) > 1:
                    found.add(parts[1])
                else:
                    found.update(alias.name for alias in node.names)
        elif isinstance(node, ast.Import):
            for alias in node.names:
                parts = alias.name.split(".")
                if parts[0] == "agentlab" and len(parts) > 1:
                    found.add(parts[1])
    return found


def violations(order: list[str]) -> list[str]:
    problems = []
    for index, package in enumerate(order):
        allowed = SHARED | set(order[: index + 1])
        for file in sorted((SRC / package).rglob("*.py")):
            for target in sorted(agentlab_imports(file) - allowed):
                problems.append(f"{file.relative_to(SRC)} imports agentlab.{target}")
    return problems


class Layering(unittest.TestCase):
    def test_every_spec_package_exists(self):
        self.assertEqual(sorted(ORDER + sorted(SHARED)), sorted(p.stem for p in SRC.iterdir() if p.suffix in ("", ".py") and p.name != "__pycache__" and p.name != "__init__.py"))

    def test_a_track_imports_only_shared_modules_and_earlier_tracks(self):
        self.assertEqual(violations(ORDER), [])


if __name__ == "__main__":
    unittest.main()
