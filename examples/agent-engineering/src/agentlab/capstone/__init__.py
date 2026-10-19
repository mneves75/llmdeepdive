"""Track 25: the capstone. The assistant assembled from earlier tracks, measured and defended.

Modules, in lesson order:

- ``assistant`` (25.1): one run end to end on fixtures, judged from the environment.
- ``architecture`` (25.1): the threat model, the components and the deterministic baseline, as data a test checks.
- ``benchmark`` (25.2): repeated trials into a reproducible JSON report, and the cost of one success.
- ``analysis`` (25.3): a failed run's timeline rebuilt from its event log, without secrets.
- ``teardown`` (25.4): the write-up rendered from the report, and its required sections.
- ``rubric`` (25.5): the capstone verdict, with the four kinds of evidence kept apart.

Everything here is ``fixture-tested``: the model is scripted. Nothing in this
package, or in the course's CI, calls a live model.
"""
