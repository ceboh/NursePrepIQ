// Exam blueprint: target share of exam items by client need, using the midpoints of the
// 2023 NCSBN NCLEX-RN and NCLEX-PN test plan ranges. The exam samples by these weights, not by
// how the question bank happens to be distributed.

export type Track = 'rn' | 'pn';
export type ExamForm = 'full' | 'short';

export const BLUEPRINT: Record<Track, Record<string, number>> = {
  rn: {
    'Management of Care': 18,
    'Safety and Infection Control': 13,
    'Health Promotion and Maintenance': 9,
    'Psychosocial Integrity': 9,
    'Basic Care and Comfort': 9,
    'Pharmacological and Parenteral Therapies': 16,
    'Reduction of Risk Potential': 12,
    'Physiological Adaptation': 14,
  },
  pn: {
    'Coordinated Care': 21,
    'Safety and Infection Control': 13,
    'Health Promotion and Maintenance': 9,
    'Psychosocial Integrity': 12,
    'Basic Care and Comfort': 10,
    'Pharmacological Therapies': 13,
    'Reduction of Risk Potential': 12,
    'Physiological Adaptation': 10,
  },
};

// Full: 85 items with 3 whole case studies (18 items). Short: 40 items with 1 case study.
export const FORMS: Record<ExamForm, { items: number; cases: number; minutes: number; label: string }> = {
  full: { items: 85, cases: 3, minutes: 150, label: 'Full exam' },
  short: { items: 40, cases: 1, minutes: 70, label: 'Short exam' },
};

export const CASE_SIZE = 6;
export const TOLERANCE = 2; // each client need must land within ±2 items of its target

// Largest-remainder rounding so the targets add up to exactly `total`.
export function targetCounts(track: Track, total: number): Record<string, number> {
  const weights = BLUEPRINT[track];
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  const raw = Object.entries(weights).map(([need, w]) => ({ need, exact: (w / sum) * total }));
  const out: Record<string, number> = Object.fromEntries(raw.map(r => [r.need, Math.floor(r.exact)]));
  let left = total - Object.values(out).reduce((a, b) => a + b, 0);
  for (const r of [...raw].sort((a, b) => (b.exact % 1) - (a.exact % 1) || weights[b.need] - weights[a.need])) {
    if (left <= 0) break;
    out[r.need]++;
    left--;
  }
  return out;
}
