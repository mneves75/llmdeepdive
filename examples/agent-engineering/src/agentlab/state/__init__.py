"""Track 14: workflow decisions, transition tables, durable checkpoints and side effects.

Modules, in lesson order:

- ``workflow`` (14.1): a deterministic invoice parser and a task success assertion.
- ``transitions`` (14.2): the run's transition table and step budget.
- ``checkpoints`` (14.3): a SQLite store with compare-and-swap writes and an outbox table.
- ``outbox`` (14.4): idempotency keys, delivery and reconciliation of unknown outcomes.
- ``frameworks`` (14.5): the same ideas in LangGraph and Temporal. It needs the
  ``frameworks`` dependency group, so nothing here imports it.
"""
