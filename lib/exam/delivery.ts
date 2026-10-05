// Server-side exam delivery: one item at a time, forward only, with a server-kept clock.
// Responses never carry correctness data while the exam is in progress.
import type { SupabaseClient } from '@supabase/supabase-js';
import { QUESTION_COLUMNS, type BankQuestion } from '@/lib/questions/bank';
import { CASE_SIZE, type ExamForm, type Track } from './blueprint';
import { findForbiddenKeys, publicItem, unmaskResponse, type PublicItem } from './public';
import { sanitizeResponse } from './response';
import { elapsedNow, HttpError, remainingSeconds, SESSION_COLUMNS, type SessionRow } from './server';

export type ExamState = {
  id: string;
  track: Track;
  form: ExamForm;
  status: SessionRow['status'];
  position: number;
  total: number;
  remainingSeconds: number;
  timeLimitSeconds: number;
  item: PublicItem | null;
};

export async function loadQuestion(db: SupabaseClient, id: string): Promise<BankQuestion> {
  const { data, error } = await db.from('questions').select(QUESTION_COLUMNS).eq('id', id).single();
  if (error || !data) throw new Error(error?.message ?? `question ${id} not found`);
  return data as unknown as BankQuestion;
}

async function reload(db: SupabaseClient, id: string): Promise<SessionRow> {
  const { data, error } = await db.from('exam_sessions').select(SESSION_COLUMNS).eq('id', id).single();
  if (error || !data) throw new Error(error?.message ?? 'session not found');
  return data as SessionRow;
}

// Ends the exam. Scoring of the session is added in the scoring phase.
export async function finalize(db: SupabaseClient, s: SessionRow, status: 'submitted' | 'expired'): Promise<SessionRow> {
  const used = Math.min(s.time_limit_seconds, elapsedNow(s));
  const { data, error } = await db.from('exam_sessions')
    .update({ status, submitted_at: new Date().toISOString(), elapsed_seconds: used, last_resumed_at: null })
    .eq('id', s.id).in('status', ['in_progress', 'paused']).select(SESSION_COLUMNS).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as SessionRow | null) ?? reload(db, s.id);
}

export async function examState(db: SupabaseClient, session: SessionRow): Promise<ExamState> {
  let s = session;
  if (s.status === 'in_progress' && remainingSeconds(s) <= 0) s = await finalize(db, s, 'expired');
  if (s.status === 'in_progress' && s.current_position > s.item_count) s = await finalize(db, s, 'submitted');
  const state: ExamState = {
    id: s.id, track: s.track, form: s.form, status: s.status, position: Math.min(s.current_position, s.item_count), total: s.item_count,
    remainingSeconds: remainingSeconds(s), timeLimitSeconds: s.time_limit_seconds, item: null,
  };
  if (s.status !== 'in_progress') return state;

  const { data: row, error } = await db.from('exam_session_items').select('position,question_id,case_id,presented_at')
    .eq('session_id', s.id).eq('position', s.current_position).single();
  if (error || !row) throw new Error(error?.message ?? 'exam item not found');
  const q = await loadQuestion(db, row.question_id);
  let caseStudy: { scenario: string; exhibits: { label: string; content: string }[] } | null = null;
  if (row.case_id) {
    const { data: c } = await db.from('case_studies').select('scenario,exhibits').eq('id', row.case_id).single();
    caseStudy = c;
  }
  if (!row.presented_at) {
    await db.from('exam_session_items').update({ presented_at: new Date().toISOString(), presented_elapsed_seconds: elapsedNow(s) })
      .eq('session_id', s.id).eq('position', row.position).is('presented_at', null);
  }
  state.item = publicItem({ q, seed: s.seed, position: row.position, total: s.item_count, caseStudy, caseSize: CASE_SIZE });
  const leaks = findForbiddenKeys(state);
  if (leaks.length) throw new Error(`exam payload contains forbidden fields: ${leaks.join(', ')}`);
  return state;
}

export async function answer(db: SupabaseClient, s: SessionRow, position: number, raw: unknown): Promise<ExamState> {
  if (s.status === 'paused') throw new HttpError(409, 'The exam is paused. Resume it to continue.');
  if (s.status !== 'in_progress') return examState(db, s);
  if (remainingSeconds(s) <= 0) return examState(db, await finalize(db, s, 'expired'));
  if (position !== s.current_position) throw new HttpError(409, 'That question has already been answered. Exam questions cannot be revisited.');

  const { data: row, error } = await db.from('exam_session_items').select('question_id,presented_elapsed_seconds')
    .eq('session_id', s.id).eq('position', position).single();
  if (error || !row) throw new Error(error?.message ?? 'exam item not found');
  const q = await loadQuestion(db, row.question_id);
  const response = sanitizeResponse(q, unmaskResponse(q, s.seed, raw));
  const elapsed = elapsedNow(s);
  const { error: saveError } = await db.from('exam_session_items')
    .update({ response, answered_at: new Date().toISOString(), time_spent_seconds: Math.max(0, elapsed - (row.presented_elapsed_seconds ?? elapsed)) })
    .eq('session_id', s.id).eq('position', position).is('answered_at', null);
  if (saveError) throw new Error(saveError.message);

  // Advance only if no other request already did (double clicks, two tabs).
  const { data: moved } = await db.from('exam_sessions').update({ current_position: position + 1 })
    .eq('id', s.id).eq('current_position', position).eq('status', 'in_progress').select(SESSION_COLUMNS).maybeSingle();
  const next = (moved as SessionRow | null) ?? (await reload(db, s.id));
  if (next.status === 'in_progress' && next.current_position > next.item_count) return examState(db, await finalize(db, next, 'submitted'));
  return examState(db, next);
}

export async function pause(db: SupabaseClient, s: SessionRow): Promise<ExamState> {
  if (s.status !== 'in_progress') return examState(db, s);
  if (remainingSeconds(s) <= 0) return examState(db, await finalize(db, s, 'expired'));
  const { data } = await db.from('exam_sessions')
    .update({ status: 'paused', elapsed_seconds: Math.min(s.time_limit_seconds, elapsedNow(s)), last_resumed_at: null })
    .eq('id', s.id).eq('status', 'in_progress').select(SESSION_COLUMNS).maybeSingle();
  return examState(db, (data as SessionRow | null) ?? (await reload(db, s.id)));
}

export async function resume(db: SupabaseClient, s: SessionRow): Promise<ExamState> {
  if (s.status !== 'paused') return examState(db, s);
  const { data } = await db.from('exam_sessions').update({ status: 'in_progress', last_resumed_at: new Date().toISOString() })
    .eq('id', s.id).eq('status', 'paused').select(SESSION_COLUMNS).maybeSingle();
  return examState(db, (data as SessionRow | null) ?? (await reload(db, s.id)));
}

export async function endEarly(db: SupabaseClient, s: SessionRow): Promise<ExamState> {
  if (s.status !== 'in_progress' && s.status !== 'paused') return examState(db, s);
  return examState(db, await finalize(db, s, 'submitted'));
}
