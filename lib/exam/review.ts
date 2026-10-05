// Post-exam review: each item with the student's stored answer, the answer key and the rationale.
// Built only for exams that are submitted or expired (the results route enforces that).
import { describeKey, displayResponse, type BankQuestion, type CaseStudy, type ItemType, type ResponseConfig, type StudentResponse } from '@/lib/questions/bank';
import { CASE_SIZE, type ExamForm, type Track } from './blueprint';
import { maxPoints, type ScoreSummary } from './score';

export type ReviewItem = {
  position: number;
  itemType: ItemType;
  stem: string;
  display: ResponseConfig;          // answer key included; same option order the student saw
  response: StudentResponse;
  answered: boolean;
  earned: number;
  possible: number;
  isCorrect: boolean;
  timeSpentSeconds: number | null;
  answerKey: string;
  rationale: string;
  clientNeed: string;
  system: string;
  discipline: string;
  judgmentStep: string | null;
  case: (CaseStudy & { step: number; total: number }) | null;
};

export type ExamResults = {
  session: {
    id: string; track: Track; form: ExamForm; status: string; startedAt: string; submittedAt: string | null;
    itemCount: number; timeLimitSeconds: number; elapsedSeconds: number; summary: ScoreSummary | null;
  };
  items: ReviewItem[];
};

export type StoredItem = {
  position: number;
  question_id: string;
  case_id: string | null;
  response: unknown;
  points_earned: number | string | null;
  max_score: number | string | null;
  is_correct: boolean | null;
  time_spent_seconds: number | null;
  answered_at: string | null;
};

export function buildReview(seed: string, items: StoredItem[], questions: BankQuestion[], cases: CaseStudy[]): ReviewItem[] {
  const byId = new Map(questions.map(q => [q.id, q]));
  const caseById = new Map(cases.map(c => [c.id, c]));
  return [...items].sort((a, b) => a.position - b.position).map(i => {
    const q = byId.get(i.question_id);
    if (!q) throw new Error(`question ${i.question_id} not found`);
    const c = i.case_id ? caseById.get(i.case_id) : undefined;
    return {
      position: i.position,
      itemType: q.item_type,
      stem: q.stem,
      display: displayResponse(q, seed),
      response: (i.response ?? {}) as StudentResponse,
      answered: !!i.answered_at,
      earned: Number(i.points_earned ?? 0),
      possible: i.max_score === null ? maxPoints(q) : Number(i.max_score),
      isCorrect: !!i.is_correct,
      timeSpentSeconds: i.time_spent_seconds,
      answerKey: describeKey(q),
      rationale: q.rationale,
      clientNeed: q.client_need,
      system: q.system,
      discipline: q.discipline,
      judgmentStep: q.clinical_judgment_step,
      case: c ? { ...c, step: q.case_sequence ?? 1, total: CASE_SIZE } : null,
    };
  });
}
