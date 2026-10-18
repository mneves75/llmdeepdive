"""Track 21: a bounded repair loop that executable tests judge, with a budget and an exit to a person.

Modules, in lesson order:

- ``runner``: run a project snapshot's tests in lesson 17.2's limited subprocess.
- ``feedback`` (21.1): what a run measured, and why a critic's approval cannot override it.
- ``failure`` (21.2): parse the traceback, find the relevant frame, redact, keep the text as data.
- ``patch`` (21.3): the patch policy: allowed files, read-only tests, minimal size, clean snapshot.
- ``budget`` and ``loop`` (21.4): attempts, tokens and wall time persisted in SQLite; escalation.
- ``evaluate`` (21.5): held-out tests and regressions decide whether a repair ships.

The synthetic project lives in ``agentlab/fixtures/repair/``.
"""
