# Backlog

Planned work that is agreed but not yet built.

## Adaptive practice (home page: "Coming soon")

Builds on the exam simulator's attempt data (`exam_session_items` keeps every response, score,
max score, time spent and presentation time per item).

- Student ability estimate per client need from practice and exam attempts, and item selection that
  targets the student's weakest needs while keeping test plan proportions.
- Computerized adaptive testing (variable length, stop rules) needs calibrated items first; the
  fixed-form exam simulator should stay as it is until then.
- Item statistics and key access: see "Accepted items and adaptive mode prerequisites" below.

## Done

- Exam simulation samples by NCSBN test plan weights: built as the exam simulator (`/exam`,
  `lib/exam/`, migration `0097_exam_simulator_v2.sql`). Full form 85 items (3 cases), short form
  40 items (1 case), each client need within 2 of its blueprint target.

## Accepted items and adaptive mode prerequisites

- Answer keys readable in practice mode: signed-in students can query the questions table directly. Accepted for now; fix by moving practice answer reveal server-side when ready.
- Adaptive mode prerequisites: item difficulty and discrimination data accumulate from exam_session_items. Once 200+ attempts exist per item, compute difficulty (p-value) and discrimination (point-biserial). Then add adaptive exam assembly using those values.
