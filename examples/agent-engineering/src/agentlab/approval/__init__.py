"""Track 20: human approval and durable pauses.

Modules, in lesson order:

- ``policy`` (20.1): which actions wait for a person, and the preview that person sees.
- ``binding`` (20.2): an approval request bound to one exact draft, approver and deadline.
- ``store`` (20.3, 20.5): the durable wait on track 14's SQLite file; deny, expire,
  revoke and a one-use execute that re-checks everything at the time of use.
- ``slack`` (20.4): verifying, queueing and authorizing a Slack button click.
- ``temporal`` (20.3): the same wait as a Temporal workflow. It needs the
  ``frameworks`` dependency group, so nothing here imports it.
"""
