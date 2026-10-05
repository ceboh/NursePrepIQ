// POST /api/exam  { form: 'full' | 'short' }
// Starts a practice exam for the signed-in student's track: assembles it from the item pool
// by the NCSBN blueprint and stores the item list. An exam that is already open is resumed
// instead of starting a second one.
import { randomUUID } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { assembleExam, QuotaError, type PoolItem } from '@/lib/exam/assemble';
import { FORMS, type ExamForm } from '@/lib/exam/blueprint';
import { adminClient, errorResponse, HttpError, json, requireUser, selectAll } from '@/lib/exam/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const form: ExamForm = body?.form === 'short' ? 'short' : body?.form === 'full' ? 'full' : (() => { throw new HttpError(400, 'Choose the full or the short exam.'); })();
    const db = adminClient();

    const { data: profile } = await db.from('profiles').select('exam_track').eq('id', user.id).maybeSingle();
    if (profile?.exam_track !== 'rn' && profile?.exam_track !== 'pn') throw new HttpError(400, 'Choose your exam track (RN or PN) in onboarding first.');
    const track = profile.exam_track as 'rn' | 'pn';

    const open = await db.from('exam_sessions').select('id').eq('user_id', user.id).in('status', ['in_progress', 'paused']).not('assembly', 'is', null).maybeSingle();
    if (open.data) return json({ sessionId: open.data.id, resumed: true });

    // Pool: every question for the track that students may see.
    const pool = await selectAll<PoolItem & { source_id: string }>((from, to) => db.from('questions')
      .select('id,source_id,client_need,case_id,case_sequence,system').eq('track', track).in('status', ['pilot', 'production'])
      .order('source_id').range(from, to));

    // Seen: practice attempts (v2 rows carry source_id) and items from earlier exams.
    const attempts = await selectAll<{ question_id: string | null; source_id: string | null }>((from, to) => db.from('question_attempts')
      .select('question_id,source_id').eq('user_id', user.id).order('created_at').range(from, to));
    const pastSessions = await selectAll<{ id: string }>((from, to) => db.from('exam_sessions').select('id').eq('user_id', user.id).order('started_at').range(from, to));
    const pastItems = pastSessions.length
      ? await selectAll<{ question_id: string }>((from, to) => db.from('exam_session_items').select('question_id')
          .in('session_id', pastSessions.map(s => s.id)).order('session_id').order('position').range(from, to))
      : [];
    const bySource = new Map(pool.map(q => [q.source_id, q.id]));
    const seen = new Set<string>([
      ...attempts.map(a => a.question_id).filter((id): id is string => !!id),
      ...attempts.map(a => (a.source_id ? bySource.get(a.source_id) : undefined)).filter((id): id is string => !!id),
      ...pastItems.map(i => i.question_id),
    ]);

    const seed = randomUUID();
    let assembled;
    try {
      assembled = assembleExam({ track, form, seed, pool, seen });
    } catch (e) {
      if (e instanceof QuotaError) throw new HttpError(422, `${e.message}. Please contact support.`, e.details);
      throw e;
    }

    const { data: session, error: sessionError } = await db.from('exam_sessions').insert({
      user_id: user.id, track, form, status: 'in_progress', time_limit_seconds: FORMS[form].minutes * 60,
      elapsed_seconds: 0, last_resumed_at: new Date().toISOString(), seed, item_count: assembled.items.length,
      current_position: 1, assembly: assembled.report,
    }).select('id').single();
    if (sessionError) {
      // Two starts at once: the unique open-exam index lets only one through.
      const again = await db.from('exam_sessions').select('id').eq('user_id', user.id).in('status', ['in_progress', 'paused']).not('assembly', 'is', null).maybeSingle();
      if (again.data) return json({ sessionId: again.data.id, resumed: true });
      throw new Error(sessionError.message);
    }

    const rows = assembled.items.map((it, n) => ({ session_id: session.id, position: n + 1, question_id: it.question_id, case_id: it.case_id }));
    for (let i = 0; i < rows.length; i += 100) {
      const { error } = await db.from('exam_session_items').insert(rows.slice(i, i + 100));
      if (error) {
        await db.from('exam_sessions').delete().eq('id', session.id);
        throw new Error(error.message);
      }
    }
    return json({ sessionId: session.id, resumed: false });
  } catch (e) {
    return errorResponse(e);
  }
}
