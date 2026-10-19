"""Lesson 16.1: a threat model the code can check."""

import unittest
from dataclasses import replace

from agentlab.security.assistant import FakeBackOffice
from agentlab.security.threats import ASSISTANT_THREAT_MODEL, review_threat_model


class ReviewThreatModel(unittest.TestCase):
    def setUp(self):
        self.catalog = FakeBackOffice([]).tools().keys()

    def test_the_project_model_covers_every_tool_and_boundary(self):
        self.assertEqual(review_threat_model(ASSISTANT_THREAT_MODEL, self.catalog), [])

    def test_a_system_prompt_cannot_own_a_write(self):
        # "The prompt tells it never to approve" is an instruction to the model, not a control outside it.
        owners = {**ASSISTANT_THREAT_MODEL.owners, "approve_invoice": "system_prompt"}
        problems = review_threat_model(replace(ASSISTANT_THREAT_MODEL, owners=owners), self.catalog)
        self.assertEqual(problems, ["approve_invoice writes, so its owner must sit outside the model, not system_prompt"])

    def test_an_untrusted_source_needs_an_owner(self):
        owners = {k: v for k, v in ASSISTANT_THREAT_MODEL.owners.items() if k != "supplier_message"}
        problems = review_threat_model(replace(ASSISTANT_THREAT_MODEL, owners=owners), self.catalog)
        self.assertEqual(problems, ["supplier_message is untrusted and has no owner outside the model"])

    def test_a_tool_missing_from_the_model_is_reported(self):
        problems = review_threat_model(ASSISTANT_THREAT_MODEL, [*self.catalog, "delete_supplier"])
        self.assertEqual(problems, ["delete_supplier is in the catalog but not in the threat model"])


if __name__ == "__main__":
    unittest.main()
