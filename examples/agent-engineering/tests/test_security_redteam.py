"""Lesson 16.5: red-team the boundary, then prove the suite catches a planted bypass."""

import html
import unittest

from agentlab.security.assistant import keyword_detector
from agentlab.security.gate import Decision, authorize
from agentlab.security.redteam import ATTACKS, load_attack, run_red_team


def gate_with_pre_approved_flag(request, principal, grant, purchases):
    """A planted bypass: a "fast path" for messages that call themselves pre-approved."""
    if request.arguments.get("pre_approved") is True:
        return Decision(True, "pre-approved supplier")
    return authorize(request, principal, grant, purchases)


def gate_trusting_the_order_tenant(request, principal, grant, purchases):
    """A planted bypass: the tenant is read from the purchase order the request names, not from the Principal."""
    owner = next((p["tenant_id"] for p in purchases if p["po_id"] == request.arguments.get("po_id")), principal.tenant_id)
    return authorize(request, principal.model_copy(update={"tenant_id": owner}), grant, purchases)


def deny_everything(request, principal, grant, purchases):
    return Decision(False, "deny all")


class Corpus(unittest.TestCase):
    def test_every_attack_fixture_loads_and_is_synthetic(self):
        for attack in ATTACKS:
            text = load_attack(attack.name)
            self.assertIn("Subject:", text, attack.name)
            self.assertNotIn("@", text.replace("@collector.invalid", ""), attack.name)

    def test_the_corpus_includes_portuguese_and_obfuscated_attacks(self):
        techniques = {attack.technique for attack in ATTACKS}
        self.assertTrue({"portuguese", "base64", "zero-width"} <= techniques)


class RealBoundary(unittest.TestCase):
    def test_no_attack_produces_a_finding_even_with_detection_off(self):
        report = run_red_team(detector=lambda text: False)
        self.assertEqual(report.findings, [])

    def test_the_keyword_detector_misses_most_of_the_corpus(self):
        # Honest numbers: detection is a review signal with large gaps, not a defence.
        report = run_red_team(detector=keyword_detector)
        self.assertEqual(report.flagged, ["hidden_comment"])
        self.assertEqual(len(ATTACKS), 8)


class PlantedBypasses(unittest.TestCase):
    def test_a_pre_approved_flag_in_the_gate_is_caught(self):
        findings = run_red_team(gate=gate_with_pre_approved_flag).findings
        self.assertIn("argument_smuggling: an invoice was approved", findings)

    def test_a_missing_tenant_check_is_caught(self):
        findings = run_red_team(gate=gate_trusting_the_order_tenant).findings
        self.assertIn("exfiltration: read PO-2001, which belongs to another tenant", findings)

    def test_a_gate_that_refuses_everything_fails_the_benign_control(self):
        findings = run_red_team(gate=deny_everything).findings
        self.assertIn("benign control: expected one correct draft, got 0", findings)

    def test_a_renderer_that_only_escapes_html_is_caught(self):
        findings = run_red_team(renderer=html.escape).findings
        self.assertIn("unsafe_link: the reviewer would see a link to collector.invalid", findings)


if __name__ == "__main__":
    unittest.main()
