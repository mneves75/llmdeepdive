"""Lesson 21.3: a minimal patch, inside the allowed files, on a clean snapshot.

The planted bug fails before the repair and passes after it, with the same
tests running. Every way of reaching green by touching the tests is refused.
"""

import unittest

from pydantic import ValidationError

from agentlab.repair.feedback import classify
from agentlab.repair.patch import MAX_CHANGED_LINES, Patch, apply, changed_lines, check_patch
from agentlab.repair.runner import load_project, run_suite

PROJECT = load_project()
ALLOWED = frozenset({"pricing.py"})
TESTS = ("test_pricing",)
HYPOTHESIS = "The discount condition uses > where the rule says 10 or more units."
FIX = PROJECT["pricing.py"].replace("if quantity > BULK_UNITS:", "if quantity >= BULK_UNITS:")


def patch(path: str, content: str) -> Patch:
    return Patch(hypothesis=HYPOTHESIS, path=path, content=content)


class PlantedBug(unittest.TestCase):
    def test_the_bug_fails_before_and_passes_after_with_the_same_tests(self):
        before = run_suite(PROJECT, TESTS)
        after = run_suite(apply(PROJECT, patch("pricing.py", FIX)), TESTS)
        self.assertEqual(classify(before).kind, "assertion")
        self.assertEqual(classify(after, minimum_tests=before.ran).kind, "passed")
        self.assertEqual(before.ran, after.ran)

    def test_the_fix_is_one_changed_line(self):
        self.assertEqual(changed_lines(PROJECT["pricing.py"], FIX), 2)  # one removed, one added
        self.assertIsNone(check_patch(patch("pricing.py", FIX), PROJECT, ALLOWED))


class PatchPolicy(unittest.TestCase):
    def test_editing_a_test_is_refused(self):
        weaker = PROJECT["test_pricing.py"].replace('Decimal("114.00")', 'Decimal("120.00")')
        self.assertEqual(check_patch(patch("test_pricing.py", weaker), PROJECT, ALLOWED), "tests are read-only: test_pricing.py")

    def test_deleting_assertions_is_refused_even_when_the_file_is_allowed(self):
        gutted = PROJECT["test_pricing.py"].replace("self.assertEqual(", "(")
        reason = check_patch(patch("test_pricing.py", gutted), PROJECT, ALLOWED | {"test_pricing.py"})
        self.assertEqual(reason, "tests are read-only: test_pricing.py")

    def test_a_file_outside_the_scope_is_refused(self):
        self.assertEqual(check_patch(patch("rates.py", "RATE = 1\n"), PROJECT, ALLOWED), "outside the allowed files: rates.py")

    def test_a_rewrite_is_refused_as_too_large(self):
        rewrite = FIX + "\n" + "\n".join(f"HELPER_{n} = {n}" for n in range(MAX_CHANGED_LINES))
        self.assertTrue(check_patch(patch("pricing.py", rewrite), PROJECT, ALLOWED).startswith("too large:"))

    def test_a_patch_that_changes_nothing_is_refused(self):
        self.assertEqual(check_patch(patch("pricing.py", PROJECT["pricing.py"]), PROJECT, ALLOWED), "changes nothing")

    def test_a_patch_already_tried_is_refused(self):
        seen = {patch("pricing.py", FIX).sha256}
        self.assertEqual(check_patch(patch("pricing.py", FIX), PROJECT, ALLOWED, seen), "repeats an earlier attempt")

    def test_a_path_with_a_directory_is_not_a_patch(self):
        for bad in ("../pricing.py", "sub/pricing.py", "/tmp/pricing.py"):
            with self.assertRaises(ValidationError):
                patch(bad, FIX)


class CleanSnapshot(unittest.TestCase):
    def test_each_attempt_starts_from_the_original_files(self):
        broken = apply(PROJECT, patch("pricing.py", FIX.replace("return total", "return None")))
        second = apply(PROJECT, patch("pricing.py", FIX))
        self.assertNotIn("return None", second["pricing.py"])
        self.assertIn("if quantity > BULK_UNITS:", PROJECT["pricing.py"])
        self.assertIsNot(broken, PROJECT)


if __name__ == "__main__":
    unittest.main()
