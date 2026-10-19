"""Track 23: evaluating agent runs by their effects, their safety relations and repeated trials.

Modules, in lesson order:

- ``outcome`` (23.1): grade the final environment state against required and
  allowed effects, and record a redacted trial trace with ids and parents.
- ``trajectory`` (23.2): the safety policy as a partial order; the same policy
  and algorithm as the website's ``trace-check`` lab.
- ``corpus`` (23.3): the 100-case manifest, its stratified held-out split and
  the runners for the categories this project can execute.
- ``graders`` (23.4): deterministic checks first, a model judge for wording,
  and calibration with Cohen's kappa.
- ``trials`` (23.5): CI replay, repeated trials, Wilson intervals and evidence labels.

It builds on tracks 14 (outbox), 16 (assistant, gate, red-team corpus) and 18
(trace scrubbing). It imports nothing from tracks 20-22.
"""
