# Backlog

Planned work that is agreed but not yet built.

## Exam simulation samples by NCSBN test plan weights

The simulated exam ("Exam Simulation" on the home page) must draw items by the 2023 NCSBN test plan
weights for the student's track, so an exam's composition matches the NCLEX regardless of how the
bank itself is distributed. The bank only guarantees that every client-need category reaches the
low end of its range; some categories (for example RN Physiological Adaptation and PN Safety and
Infection Control) hold well above their share.

- Weights per track and client need: `NEED_TARGETS` and `CLIENT_NEEDS` in
  `scripts/bank/revisions.mjs` (RN uses Management of Care; PN uses Coordinated Care).
- Sample each category in proportion to its weight (for example the midpoint of the range,
  normalized to the exam length), not in proportion to bank counts.
- Keep NGN case-study items together as whole cases when they are sampled.
