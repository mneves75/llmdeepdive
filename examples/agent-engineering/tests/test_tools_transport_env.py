"""A stdio server inherits nothing from the client's environment unless the client passes it.

Track 17's rule (no inherited secrets) applies to the MCP client too: a child
process started with the caller's environment receives every token the caller
holds.
"""

import json
import os
import sys
import unittest

from agentlab.tools.client import StdioTransport

REPORT = "import json, os; print(json.dumps({'canary': 'AGENTLAB_CANARY_TOKEN' in os.environ, 'path': bool(os.environ.get('PATH'))}), flush=True)"


class TransportEnvironment(unittest.TestCase):
    def setUp(self):
        os.environ["AGENTLAB_CANARY_TOKEN"] = "not-a-real-token"
        self.addCleanup(os.environ.pop, "AGENTLAB_CANARY_TOKEN", None)

    def report(self, transport: StdioTransport) -> dict:
        self.addCleanup(transport.close)
        return json.loads(transport.receive(timeout=10))

    def test_the_default_environment_carries_no_caller_secret(self):
        seen = self.report(StdioTransport([sys.executable, "-c", REPORT]))
        self.assertFalse(seen["canary"])
        self.assertTrue(seen["path"])  # the child can still find its interpreter's tools

    def test_an_explicit_environment_is_passed_as_given(self):
        # Control: the client can still grant a variable on purpose.
        seen = self.report(StdioTransport([sys.executable, "-c", REPORT], env={**os.environ}))
        self.assertTrue(seen["canary"])


if __name__ == "__main__":
    unittest.main()
