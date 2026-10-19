"""Lesson 25.1: the architecture review as checks, so the review cannot drift from the code."""

import unittest
from dataclasses import replace

from agentlab.capstone.architecture import CATALOG, COMPONENTS, THREAT_MODEL, baseline_decision, review_components
from agentlab.capstone.assistant import load_message
from agentlab.fixtures import load_purchases
from agentlab.security.threats import ASSISTANT_THREAT_MODEL, ThreatModel, review_threat_model


class ThreatModelReview(unittest.TestCase):
    def test_assembling_the_tracks_exposes_tools_track_16_never_modelled(self):
        gaps = review_threat_model(ASSISTANT_THREAT_MODEL, CATALOG)
        self.assertIn("submit_invoice is in the catalog but not in the threat model", gaps)

    def test_the_capstone_threat_model_has_no_gaps(self):
        self.assertEqual(review_threat_model(THREAT_MODEL, CATALOG), [])

    def test_a_write_owned_by_the_system_prompt_is_flagged(self):
        weakened = ThreatModel(THREAT_MODEL.sources, THREAT_MODEL.capabilities, {**THREAT_MODEL.owners, "submit_invoice": "system_prompt"})
        self.assertEqual(review_threat_model(weakened, CATALOG), ["submit_invoice writes, so its owner must sit outside the model, not system_prompt"])


class Baseline(unittest.TestCase):
    """The non-agent baseline from lesson 14.1: a fixed-layout parser and the purchase record."""

    def decide(self, path):
        return baseline_decision(load_message(path), load_purchases(), "tenant-a")

    def test_the_parser_handles_the_fixed_layout_with_no_model(self):
        self.assertEqual(self.decide("supplier_messages/benign.txt"), ("submit", "PO-1001", "500.00"))

    def test_the_parser_ignores_the_injected_note_because_it_never_reads_instructions(self):
        self.assertEqual(self.decide("supplier_messages/injection.txt"), ("submit", "PO-1002", "1134.00"))

    def test_the_parser_refuses_the_free_form_message(self):
        decision, reason, _ = self.decide("capstone/freeform_po1004.txt")
        self.assertEqual((decision, reason), ("escalate", "not the expected invoice layout"))


class Components(unittest.TestCase):
    def test_every_component_names_why_it_exists_and_a_test_that_shows_it(self):
        self.assertEqual(review_components(COMPONENTS), [])

    def test_a_component_whose_evidence_is_not_a_real_test_is_flagged(self):
        broken = (replace(COMPONENTS[0], evidence="tests.test_capstone_architecture.Baseline.test_nobody_wrote"),)
        self.assertEqual(len(review_components(broken)), 1)

    def test_a_component_without_a_reason_is_flagged(self):
        broken = (replace(COMPONENTS[0], why=""),)
        self.assertIn("no reason", review_components(broken)[0])


if __name__ == "__main__":
    unittest.main()
