"""Lesson 15.5: the checks a remote MCP server makes on an already-verified token's claims."""

import unittest
from datetime import UTC, datetime

from agentlab.tools.remote_auth import check_access

RESOURCE = "https://mcp.purchasing.example/mcp"
NOW = datetime(2026, 10, 18, 12, 0, tzinfo=UTC)
NOW_S = int(NOW.timestamp())
REQUIRED = frozenset({"purchases:read"})


def claims(**changes) -> dict:
    base = {"iss": "https://auth.example", "sub": "u1", "aud": RESOURCE, "scope": "purchases:read", "exp": NOW_S + 300, "jti": "tok-1"}
    return {**base, **changes}


def check(token: dict, revoked: frozenset[str] = frozenset()):
    return check_access(token, resource=RESOURCE, required_scopes=REQUIRED, now=NOW, revoked=revoked)


class RemoteAuthorization(unittest.TestCase):
    def test_a_token_for_this_server_with_the_scope_is_allowed(self):
        decision = check(claims())
        self.assertEqual((decision.allowed, decision.status, decision.subject), (True, 200, "u1"))

    def test_an_audience_list_that_names_this_server_is_allowed(self):
        self.assertTrue(check(claims(aud=["https://other.example", RESOURCE])).allowed)

    def test_a_token_issued_for_another_server_is_refused(self):
        decision = check(claims(aud="https://mcp.calendar.example/mcp"))
        self.assertEqual((decision.allowed, decision.status, decision.error), (False, 401, "invalid_token"))

    def test_an_expired_token_is_refused_at_the_second_it_expires(self):
        self.assertEqual(check(claims(exp=NOW_S)).status, 401)
        self.assertEqual(check(claims(exp=NOW_S + 1)).status, 200)

    def test_a_revoked_token_is_refused_before_it_expires(self):
        decision = check(claims(), revoked=frozenset({"tok-1"}))
        self.assertEqual((decision.status, decision.error), (401, "invalid_token"))

    def test_a_missing_scope_is_forbidden_and_names_what_is_needed(self):
        decision = check(claims(scope="calendar:read"))
        self.assertEqual((decision.status, decision.error), (403, "insufficient_scope"))
        self.assertIn('scope="purchases:read"', decision.www_authenticate)

    def test_a_scope_that_only_contains_the_name_is_not_the_scope(self):
        self.assertEqual(check(claims(scope="purchases:read-all-tenants")).status, 403)

    def test_malformed_claims_are_an_invalid_token(self):
        for token in (claims(exp="tomorrow"), {"sub": "u1"}, claims(aud=[])):
            with self.subTest(token=token):
                self.assertEqual(check(token).status, 401)


if __name__ == "__main__":
    unittest.main()
