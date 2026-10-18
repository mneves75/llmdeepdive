"""Lesson 17.3: a default-deny egress decision, and no inherited secrets.

The resolver is a fake: nothing here opens a socket or sends a DNS query. The
decision function is the policy; real blocking needs host or VM controls.
"""

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from agentlab.sandbox.egress import EgressPolicy, check_egress
from agentlab.sandbox.process import run_python

# Public addresses for the fake resolver; nothing is ever contacted.
PUBLIC_V4 = "93.184.215.14"
PUBLIC_V6 = "2606:2800:21f:cb07:6820:80da:af6b:8b2c"
POLICY = EgressPolicy(allowed=frozenset({("api.supplier-alpha.example", 443)}))


def resolver(*answers: str):
    calls = []

    def resolve(name: str) -> list[str]:
        calls.append(name)
        return list(answers[min(len(calls), len(answers)) - 1].split(","))

    return resolve, calls


class EgressDecision(unittest.TestCase):
    def test_allowlisted_host_with_public_addresses_is_allowed(self):
        resolve, _ = resolver(f"{PUBLIC_V4},{PUBLIC_V6}")
        decision = check_egress("api.supplier-alpha.example", 443, POLICY, resolve)
        self.assertTrue(decision.allowed, decision.reason)
        self.assertEqual(decision.address, PUBLIC_V4)

    def test_name_is_normalized_before_matching(self):
        resolve, _ = resolver(PUBLIC_V4)
        self.assertTrue(check_egress("API.Supplier-Alpha.example.", 443, POLICY, resolve).allowed)

    def test_anything_not_on_the_allowlist_is_denied(self):
        resolve, calls = resolver(PUBLIC_V4)
        self.assertFalse(check_egress("api.supplier-alpha.example", 80, POLICY, resolve).allowed)
        self.assertFalse(check_egress("files.example", 443, POLICY, resolve).allowed)
        # An address literal is a name too, and it is not on the list.
        self.assertFalse(check_egress("169.254.169.254", 80, POLICY, resolve).allowed)
        self.assertEqual(calls, [], "a denied name must not even be resolved")

    def test_allowlisted_name_resolving_to_metadata_or_private_space_is_denied(self):
        for answer in [
            "169.254.169.254",  # cloud metadata, IPv4 link-local
            "fd00:ec2::254",  # AWS metadata over IPv6 (unique local)
            "::ffff:169.254.169.254",  # IPv4-mapped IPv6
            "64:ff9b::a9fe:a9fe",  # NAT64 prefix wrapping 169.254.169.254; is_global says True
            "127.0.0.1",
            "10.0.0.5",
            "192.168.1.10",
            "fe80::1",
            "::1",
            "0.0.0.0",
            f"{PUBLIC_V4},10.0.0.5",  # one bad answer among good ones
        ]:
            with self.subTest(answer=answer):
                resolve, _ = resolver(answer)
                decision = check_egress("api.supplier-alpha.example", 443, POLICY, resolve)
                self.assertFalse(decision.allowed)
                self.assertIsNone(decision.address)

    def test_the_checked_address_is_the_one_returned(self):
        # DNS rebinding: the first answer is public, a later one points at metadata.
        resolve, calls = resolver(PUBLIC_V4, "169.254.169.254")
        decision = check_egress("api.supplier-alpha.example", 443, POLICY, resolve)
        self.assertEqual(calls, ["api.supplier-alpha.example"])
        self.assertEqual(decision.address, PUBLIC_V4)

    def test_no_answer_is_denied(self):
        self.assertFalse(check_egress("api.supplier-alpha.example", 443, POLICY, lambda name: []).allowed)


class NoInheritedSecrets(unittest.TestCase):
    CANARY = "AGENTLAB_CANARY_TOKEN"

    def setUp(self):
        os.environ[self.CANARY] = "not-a-real-secret"

    def tearDown(self):
        del os.environ[self.CANARY]

    def test_the_sandbox_starts_with_an_empty_environment(self):
        code = "import json, os\nprint(json.dumps(sorted(os.environ)))"
        with tempfile.TemporaryDirectory() as workdir:
            result = run_python(code, Path(workdir))
        seen = json.loads(result.stdout)  # sandbox output is data: parse it, never evaluate it
        self.assertNotIn(self.CANARY, seen)
        self.assertNotIn("PATH", seen)
        self.assertNotIn("HOME", seen)
        # What remains is added by the platform, not inherited: CPython's locale coercion
        # sets LC_CTYPE, and macOS adds __CF_USER_TEXT_ENCODING.
        self.assertLessEqual(set(seen), {"LC_CTYPE", "__CF_USER_TEXT_ENCODING"})

    def test_positive_control_an_inheriting_child_does_see_the_canary(self):
        out = subprocess.run(
            [sys.executable, "-I", "-c", f"import os; print(os.environ.get({self.CANARY!r}))"],
            capture_output=True,
            check=True,
        )
        self.assertEqual(out.stdout, b"not-a-real-secret\n")
