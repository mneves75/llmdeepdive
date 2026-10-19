"""Track 15: tool contracts and a deliberately small MCP subset (revision 2026-07-28).

Modules, in lesson order:

- ``contracts`` (15.1): strict argument models and the separate authorization check.
- ``jsonrpc`` (15.2): JSON-RPC 2.0 dispatch and response correlation.
- ``server`` (15.2–15.4): the MCP server over stdio; its docstring lists what is not implemented.
- ``client`` (15.3): the client, cursor-following and a catalog that grants nothing by itself.
- ``queries`` (15.4): read-only purchasing tools over SQLite.
- ``postgres`` (15.4): the same tools over Postgres. It needs the ``postgres``
  dependency group, so nothing here imports it.
- ``remote_auth`` (15.5): the claim checks of a remote server; no cryptography.

This is a learning implementation of part of the protocol, not a compliant
MCP SDK.
"""
