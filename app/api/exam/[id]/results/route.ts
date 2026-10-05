// GET /api/exam/:id/results
// Score summary and full review (student answer, answer key, rationale) for an exam that has
// been submitted or has expired. Refuses while the exam is still in progress.
import type { NextRequest } from 'next/server';
import { QUESTION_COLUMNS, type BankQuestion, type CaseStudy } from '@/lib/questions/bank';
import { buildReview, type ExamResults, type StoredItem } from '@/lib/exam/review';
import { adminClient, errorResponse, HttpError, json, loadSession, requireUser } from '@/lib/exam/server';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    const { id } = await ctx.params;
    if (!UUID.test(id)) throw new HttpError(404, 'This practice exam was not found.');
    const db = adminClient();
    const s = await loadSession(db, id, user.id);
    if (s.status !== 'submitted' && s.status !== 'expired') throw new HttpError(409, 'Results are available once the exam is finished.');

    const { data: items, error } = await db.from('exam_session_items')
      .select('position,question_id,case_id,response,points_earned,max_score,is_correct,time_spent_seconds,answered_at')
      .eq('session_id', s.id).order('position');
    if (error || !items) throw new Error(error?.message ?? 'exam items not found');
    const { data: qs, error: qError } = await db.from('questions').select(QUESTION_COLUMNS).in('id', items.map(i => i.question_id));
    if (qError || !qs) throw new Error(qError?.message ?? 'exam questions not found');
    const caseIds = [...new Set(items.map(i => i.case_id).filter((c): c is string => !!c))];
    let cases: CaseStudy[] = [];
    if (caseIds.length) {
      const { data, error: cError } = await db.from('case_studies').select('id,title,scenario,exhibits').in('id', caseIds);
      if (cError) throw new Error(cError.message);
      cases = (data ?? []) as CaseStudy[];
    }

    const body: ExamResults = {
      session: {
        id: s.id, track: s.track, form: s.form, status: s.status, startedAt: s.started_at, submittedAt: s.submitted_at,
        itemCount: s.item_count, timeLimitSeconds: s.time_limit_seconds, elapsedSeconds: s.elapsed_seconds,
        summary: s.score_summary as ExamResults['session']['summary'],
      },
      items: buildReview(s.seed, items as StoredItem[], qs as unknown as BankQuestion[], cases),
    };
    return json(body);
  } catch (e) {
    return errorResponse(e);
  }
}
