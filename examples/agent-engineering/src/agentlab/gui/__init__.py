"""Track 18: driving a legacy web portal through its interface, safely.

Modules, in lesson order:

- ``portal`` (all lessons): the synthetic legacy portal, a standard-library
  HTTP server on 127.0.0.1 with login, an expiring session, delayed and broken
  exports, a misleading banner and layout variants.
- ``control`` (18.1, 18.5): a model proposes a role and a name, never a CSS
  selector; the controller counts every action against a budget.
- ``coordinates`` and ``marks`` (18.2): screenshot pixels to viewport
  coordinates, and Set-of-Mark style marks read from the accessibility tree.
- ``session`` and ``trace`` (18.3): a credential vault bound to one origin,
  page states that stop the run, and a trace that never holds a secret.
- ``report`` (18.4): origin, destination, type and schema checks for a download.
- ``browser`` (18.1-18.5): the Playwright side. It is the only module that
  imports Playwright, and nothing in ``tests/`` imports it, so the core suite
  runs without a browser.
"""
