"""Track 16: trust boundaries, an authorization gate outside the model, least privilege and red-teaming.

Modules, in lesson order:

- ``threats`` (16.1): the assistant's threat model as data, and a review that finds gaps.
- ``gate`` and ``assistant`` (16.2): the policy gate and the loop that keeps outside text as data.
- ``catalog`` (16.3): pinned tool definitions, re-approval and delegation without escalation.
- ``privilege`` (16.4): role grants, typed extraction, a credential broker and safe rendering.
- ``redteam`` (16.5): an attack corpus run against the whole boundary, with a benign control.

No module here imports ``agentlab.tools`` (track 15); the tool shapes this
track needs are defined locally or reuse ``agentlab.domain.ToolRequest``.
"""
