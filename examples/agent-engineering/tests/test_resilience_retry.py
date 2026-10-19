"""Lesson 24.2: backoff with full jitter, Retry-After, a retry budget and a circuit breaker."""

import random
import unittest
from datetime import UTC, datetime, timedelta

from agentlab.resilience.classify import Contract, Failure
from agentlab.resilience.retry import CircuitBreaker, RetryBudget, call_with_retries, full_jitter

ROUTE = "POST /v1/chat/completions"
CONTRACT = Contract(live=frozenset({ROUTE}), retired={})
START = datetime(2026, 10, 18, 9, 0, tzinfo=UTC)


class FakeClock:
    def __init__(self):
        self.now = START
        self.slept: list[float] = []

    def __call__(self):
        return self.now

    def sleep(self, seconds):
        self.slept.append(seconds)
        self.now += timedelta(seconds=seconds)


class Provider:
    """Answers 503 until ``recovers_at``, or fails every other call when ``flaky``; counts every call it receives."""

    def __init__(self, clock, recovers_at=None, flaky=False, error="http: status 503", retry_after=None):
        self.clock, self.recovers_at, self.flaky = clock, recovers_at, flaky
        self.error, self.retry_after = error, retry_after
        self.calls = self.failed = 0

    def __call__(self):
        self.calls += 1
        down = self.calls % 2 == 1 if self.flaky else self.recovers_at is not None and self.clock() < self.recovers_at
        self.failed += down
        return Failure(self.error, ROUTE, "read", retry_after=self.retry_after) if down else "ok"


def run(provider, clock, breaker, budget, max_attempts=5):
    return call_with_retries(provider, contract=CONTRACT, max_attempts=max_attempts, breaker=breaker, budget=budget,
                             rng=random.Random(7), clock=clock, sleep=clock.sleep)


def unlimited(clock):
    return CircuitBreaker(threshold=10**9, open_for=timedelta(seconds=30), clock=clock), RetryBudget(limit=10**9, window=timedelta(minutes=1), clock=clock)


class FullJitter(unittest.TestCase):
    def test_waits_spread_over_zero_to_the_capped_exponential(self):
        rng = random.Random(42)
        waits = [full_jitter(3, base_s=0.5, cap_s=30.0, rng=rng) for _ in range(1000)]
        self.assertTrue(all(0.0 <= w <= 4.0 for w in waits))
        self.assertAlmostEqual(sum(waits) / len(waits), 2.0, delta=0.2)
        self.assertGreater(len({round(w, 6) for w in waits}), 900)  # spread, not one shared instant
        self.assertTrue(all(full_jitter(12, base_s=0.5, cap_s=30.0, rng=rng) <= 30.0 for _ in range(100)))

    def test_the_same_seed_gives_the_same_waits(self):
        first = [full_jitter(n, base_s=0.5, cap_s=30.0, rng=random.Random(1)) for n in range(5)]
        self.assertEqual(first, [full_jitter(n, base_s=0.5, cap_s=30.0, rng=random.Random(1)) for n in range(5)])


class RetryAfter(unittest.TestCase):
    def test_the_wait_is_at_least_what_the_server_asked(self):
        clock = FakeClock()
        provider = Provider(clock, recovers_at=START + timedelta(seconds=20), error="http: status 429", retry_after="7")
        result = run(provider, clock, *unlimited(clock))
        self.assertEqual(result.value, "ok")
        self.assertTrue(clock.slept and all(s >= 7 for s in clock.slept))

    def test_a_wait_longer_than_the_call_may_wait_stops_without_sleeping(self):
        clock = FakeClock()
        provider = Provider(clock, recovers_at=START + timedelta(hours=1), error="http: status 429", retry_after="3600")
        result = run(provider, clock, *unlimited(clock))
        self.assertEqual((result.verdict.action, provider.calls, clock.slept), ("stop", 1, []))

    def test_a_failure_that_is_not_transient_is_not_retried(self):
        clock = FakeClock()
        provider = Provider(clock, recovers_at=START + timedelta(hours=1), error="http: status 403")
        result = run(provider, clock, *unlimited(clock))
        self.assertEqual((result.verdict.action, provider.calls), ("stop", 1))


class Breaker(unittest.TestCase):
    def test_closed_open_half_open_closed(self):
        clock = FakeClock()
        breaker = CircuitBreaker(threshold=2, open_for=timedelta(seconds=30), clock=clock)
        breaker.record(ok=False)
        self.assertEqual(breaker.state, "closed")
        breaker.record(ok=False)
        self.assertEqual(breaker.state, "open")
        self.assertFalse(breaker.allow())
        clock.sleep(30)
        self.assertTrue(breaker.allow())
        self.assertEqual(breaker.state, "half_open")
        self.assertFalse(breaker.allow())  # one trial at a time
        breaker.record(ok=True)
        self.assertEqual(breaker.state, "closed")

    def test_a_failed_trial_opens_the_breaker_again(self):
        clock = FakeClock()
        breaker = CircuitBreaker(threshold=1, open_for=timedelta(seconds=30), clock=clock)
        breaker.record(ok=False)
        clock.sleep(30)
        self.assertTrue(breaker.allow())
        breaker.record(ok=False)
        self.assertEqual(breaker.state, "open")
        clock.sleep(29)
        self.assertFalse(breaker.allow())

    def test_a_success_resets_the_count_of_consecutive_failures(self):
        clock = FakeClock()
        breaker = CircuitBreaker(threshold=2, open_for=timedelta(seconds=30), clock=clock)
        for ok in (False, True, False, True):
            breaker.record(ok=ok)
        self.assertEqual(breaker.state, "closed")


class Outage(unittest.TestCase):
    """A task arrives every 10 simulated seconds for 10 minutes; the provider is down for the first 5."""

    def drive(self, breaker_and_budget):
        clock = FakeClock()
        provider = Provider(clock, recovers_at=START + timedelta(minutes=5))
        breaker, budget = breaker_and_budget(clock)
        results = []
        for _ in range(60):
            results.append(run(provider, clock, breaker, budget))
            clock.sleep(10)
        return provider, results

    def assert_only_outage_tasks_failed(self, results):
        failed = [not r.ok for r in results]
        self.assertEqual(failed, sorted(failed, reverse=True))  # a run of failures, then only successes

    def test_without_a_breaker_or_budget_every_task_retries_into_the_outage(self):
        provider, results = self.drive(unlimited)
        self.assertEqual(provider.failed, 130)  # 26 tasks arrived during the outage, 5 failed attempts each
        self.assertEqual([r.attempts for r in results[:26]], [5] * 26)
        self.assert_only_outage_tasks_failed(results)

    def test_a_breaker_and_a_retry_budget_bound_the_calls(self):
        def protected(clock):
            return CircuitBreaker(threshold=5, open_for=timedelta(seconds=30), clock=clock), RetryBudget(limit=10, window=timedelta(minutes=1), clock=clock)

        provider, results = self.drive(protected)
        self.assertEqual(provider.failed, 14)  # 5 failures open the breaker, then one trial every 30 s
        self.assertEqual([r.attempts for r in results[:4]], [5, 0, 0, 1])
        self.assertIn("circuit open", results[1].verdict.reason)
        self.assert_only_outage_tasks_failed(results)


class Budget(unittest.TestCase):
    def test_a_flaky_provider_cannot_spend_more_retries_than_the_budget(self):
        # Every other call fails, so the breaker never sees five failures in a row; the budget is what stops the extra load.
        clock = FakeClock()
        provider = Provider(clock, flaky=True)
        breaker = CircuitBreaker(threshold=5, open_for=timedelta(seconds=30), clock=clock)
        budget = RetryBudget(limit=3, window=timedelta(minutes=1), clock=clock)
        results = [run(provider, clock, breaker, budget) for _ in range(6)]
        self.assertEqual(sum(r.attempts - 1 for r in results), 3)
        self.assertIn("retry budget", results[-1].verdict.reason)
        clock.sleep(60)
        self.assertTrue(budget.try_spend())  # the window moved on


if __name__ == "__main__":
    unittest.main()
