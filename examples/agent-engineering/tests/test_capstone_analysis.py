"""Lesson 25.3: rebuild a failed run from its event log, and keep secrets and raw input out of the write-up."""

import unittest
from dataclasses import replace
from datetime import UTC, datetime

from agentlab.capstone.analysis import Postmortem, causal_chain, first_failure, review_postmortem, timeline
from agentlab.capstone.assistant import CASES, load_message, run_in_fresh_dir
from agentlab.domain import ExecutionEvent

BY_ID = {case.case_id: case for case in CASES}
SECRET = "test-only-secret-7f3a"  # synthetic; never a real credential


class Timeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.failed = run_in_fresh_dir(BY_ID["memory-loss-po1001"])
        cls.expired = run_in_fresh_dir(BY_ID["approval-expired-po1004"])

    def test_the_failed_run_reads_from_input_to_verdict(self):
        lines = timeline(self.failed.events)
        self.assertIn("run.received", lines[0])
        self.assertIn("run.failed", lines[-1])
        self.assertTrue(any("policy.denied" in line and "amount 5000.00 USD" in line for line in lines))

    def test_the_first_failure_is_the_refused_draft(self):
        event = first_failure(self.failed.events)
        self.assertEqual(event.kind, "policy.denied")

    def test_the_causal_chain_walks_back_from_the_verdict(self):
        last = self.expired.events[-1]
        kinds = [self.expired.events[seq].kind for seq in causal_chain(self.expired.events, last.seq)]
        self.assertEqual(kinds[:4], ["run.cancelled", "approval.expired", "approval.requested", "draft.proposed"])

    def test_the_supplier_message_never_reaches_the_timeline(self):
        text = "\n".join(timeline(self.failed.events))
        self.assertNotIn("Payment terms are net 30", text)  # a line of benign.txt
        self.assertIn("sha256", text)  # what the log keeps instead: the hash

    def test_secrets_are_removed_and_the_reason_survives(self):
        at = datetime(2026, 10, 19, 9, 0, tzinfo=UTC)
        events = (
            ExecutionEvent(run_id="r", seq=0, kind="run.received", at=at),
            ExecutionEvent(run_id="r", seq=1, kind="model.gave_up", at=at, parent=0, data={"reason": f"transport: Bearer {SECRET} rejected", "url": f"https://u:{SECRET}@example.invalid/v1"}),
            ExecutionEvent(run_id="r", seq=2, kind="run.failed", at=at, parent=1, data={"note": f"key was {SECRET}"}),
        )
        text = "\n".join(timeline(events, secrets=(SECRET,)))
        self.assertNotIn(SECRET, text)
        self.assertIn("rejected", text)  # control: redaction removed the value, not the evidence


class Review(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.record = run_in_fresh_dir(BY_ID["memory-loss-po1001"])
        denied = first_failure(cls.record.events)
        cls.good = Postmortem(
            title="Wrong total refused, no invoice sent",
            impact="One invoice for PO-1001 was not drafted; no money moved and no unsafe effect happened.",
            timeline=tuple(timeline(cls.record.events)),
            root_cause="The model drafted 5000.00 instead of 40 x 12.50 = 500.00 after losing the unit price from its context.",
            counterfactual="With the unit price pinned in the run state, the draft would have matched the record.",
            remaining_risk="The model can still guess a total; the gate refuses it, so the risk is a missed invoice, not a wrong one.",
            recovery_evidence=(denied.seq, cls.record.events[-1].seq),
        )

    def test_a_complete_postmortem_passes(self):
        self.assertEqual(review_postmortem(self.good, self.record.events, raw_inputs=(load_message("supplier_messages/benign.txt"),)), [])

    def test_quoting_the_raw_message_is_flagged(self):
        leaky = replace(self.good, impact="The supplier wrote: Payment terms are net 30 to the account already on file.")
        problems = review_postmortem(leaky, self.record.events, raw_inputs=(load_message("supplier_messages/benign.txt"),))
        self.assertEqual(len(problems), 1)
        self.assertIn("raw input", problems[0])

    def test_a_secret_in_any_field_is_flagged(self):
        leaky = replace(self.good, remaining_risk=f"Rotate {SECRET}.")
        self.assertIn("secret", review_postmortem(leaky, self.record.events, secrets=(SECRET,))[0])

    def test_evidence_must_point_at_events_in_the_log(self):
        invented = replace(self.good, recovery_evidence=(999,))
        self.assertIn("999", review_postmortem(invented, self.record.events)[0])

    def test_an_empty_counterfactual_is_flagged(self):
        thin = replace(self.good, counterfactual=" ")
        self.assertIn("counterfactual", review_postmortem(thin, self.record.events)[0])


if __name__ == "__main__":
    unittest.main()
