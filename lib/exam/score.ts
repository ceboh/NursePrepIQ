// Server-side exam scoring, using the same partial-credit rules as practice (scoreQuestion):
// 0/1 for single best answer; +/- with a floor of 0 for SATA and highlight; 0/1 per row,
// blank or selection for matrix, cloze and bow-tie.
import { scoreQuestion, type BankQuestion } from '@/lib/questions/bank';
import { sanitizeResponse } from './response';
import type { StudentResponse } from '@/lib/questions/bank';

export type ItemScore = { response: StudentResponse; earned: number; possible: number; score: number; isCorrect: boolean };

export function scoreExamResponse(q: BankQuestion, raw: unknown): ItemScore {
  const response = sanitizeResponse(q, raw);
  const s = scoreQuestion(q, response);
  return { response, earned: s.earned, possible: s.possible, score: s.possible ? Math.round((s.earned / s.possible) * 10000) / 10000 : 0, isCorrect: s.isCorrect };
}

// Points available on an item, used for unanswered items.
export const maxPoints = (q: BankQuestion) => scoreQuestion(q, {}).possible;

// ---------- summary --------------------------------------------------------------
export type Bucket = { items: number; correct: number; earned: number; possible: number; percent: number };
export type ScoreSummary = {
  overall: Bucket & { answered: number };
  byClientNeed: Record<string, Bucket>;
  bySystem: Record<string, Bucket>;
  byDiscipline: Record<string, Bucket>;
  byItemType: Record<string, Bucket>;
  byJudgmentStep: Record<string, Bucket>;       // case items only
  timeUsedSeconds: number;
  timeLimitSeconds: number;
  endedBy: 'completed' | 'time_expired' | 'ended_early';
};

export type SummaryRow = {
  q: Pick<BankQuestion, 'client_need' | 'system' | 'discipline' | 'item_type' | 'clinical_judgment_step' | 'case_id'>;
  earned: number;
  possible: number;
  isCorrect: boolean;
  answered: boolean;
};

const percent = (earned: number, possible: number) => (possible ? Math.round((earned / possible) * 1000) / 10 : 0);

function add(buckets: Record<string, Bucket>, key: string, row: SummaryRow) {
  const b = (buckets[key] ??= { items: 0, correct: 0, earned: 0, possible: 0, percent: 0 });
  b.items++;
  b.correct += row.isCorrect ? 1 : 0;
  b.earned += row.earned;
  b.possible += row.possible;
  b.percent = percent(b.earned, b.possible);
}

export function summarize(rows: SummaryRow[], time: { usedSeconds: number; limitSeconds: number; endedBy: ScoreSummary['endedBy'] }): ScoreSummary {
  const s: ScoreSummary = {
    overall: { items: 0, correct: 0, earned: 0, possible: 0, percent: 0, answered: 0 },
    byClientNeed: {}, bySystem: {}, byDiscipline: {}, byItemType: {}, byJudgmentStep: {},
    timeUsedSeconds: time.usedSeconds, timeLimitSeconds: time.limitSeconds, endedBy: time.endedBy,
  };
  for (const row of rows) {
    s.overall.items++;
    s.overall.correct += row.isCorrect ? 1 : 0;
    s.overall.earned += row.earned;
    s.overall.possible += row.possible;
    s.overall.answered += row.answered ? 1 : 0;
    add(s.byClientNeed, row.q.client_need, row);
    add(s.bySystem, row.q.system, row);
    add(s.byDiscipline, row.q.discipline, row);
    add(s.byItemType, row.q.item_type, row);
    if (row.q.case_id && row.q.clinical_judgment_step) add(s.byJudgmentStep, row.q.clinical_judgment_step, row);
  }
  s.overall.percent = percent(s.overall.earned, s.overall.possible);
  return s;
}
