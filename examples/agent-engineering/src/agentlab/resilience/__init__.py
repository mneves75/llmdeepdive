"""Track 24: resilience and graceful degradation.

Modules, in lesson order:

- ``classify`` (24.1): name a failure (transport, HTTP status, protocol) and
  choose stop, retry, reconcile or a fallback candidate.
- ``retry`` (24.2): full-jitter backoff, Retry-After, a retry budget and a
  circuit breaker, all on injected clocks.
- ``fallback`` (24.3): the gate that lets a retired read route use the legacy
  portal of track 18, as the same principal, with the result verified.
- ``budget`` and ``cascade`` (24.4): a SQLite spending ledger with
  compare-and-swap reservations and a kill switch, and a model cascade that
  reserves before every call and respects a deadline.
- ``drill`` (24.5): a chaos fixture over a batch of invoices; degraded labels
  that survive a crash, escalations and no duplicate effects.
"""
