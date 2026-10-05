'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { FORMS, type ExamForm } from '@/lib/exam/blueprint';
import type { ScoreSummary } from '@/lib/exam/score';

type Row = { id: string; form: ExamForm; status: string; started_at: string; current_position: number; item_count: number; score_summary: ScoreSummary | null };

// Dashboard "Practice exams" section: an entry point (or the open exam to resume) and the
// student's past exams with scores, newest first, read through row-level security.
export default function DashboardExams() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    (async () => {
      const s = createClient();
      const { data: { user } } = await s.auth.getUser();
      if (!user) return;
      const { data } = await s.from('exam_sessions').select('id,form,status,started_at,current_position,item_count,score_summary')
        .eq('user_id', user.id).not('assembly', 'is', null)
        .order('started_at', { ascending: false }).limit(11);
      setRows((data as Row[]) ?? []);
    })();
  }, []);

  if (!rows) return null;
  const open = rows.find(r => r.status === 'in_progress' || r.status === 'paused');
  const past = rows.filter(r => r.status === 'submitted' || r.status === 'expired').slice(0, 10);
  return (
    <section className="mt-10">
      <p className="text-sm font-black tracking-widest text-[var(--teal)]">PRACTICE EXAMS</p>
      <h2 className="mt-1 text-3xl font-black text-[var(--deep-navy)]">Exam simulation</h2>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        {open ? (
          <div>
            <p className="font-black text-amber-700">{open.status === 'paused' ? 'Paused exam' : 'Exam in progress'}</p>
            <p className="mt-1 text-lg font-black text-[var(--deep-navy)]">{FORMS[open.form].label}: question {Math.min(open.current_position, open.item_count)} of {open.item_count}</p>
            <p className="text-sm text-slate-600">Pick up where you left off. The clock stays stopped while the exam is paused.</p>
          </div>
        ) : (
          <div>
            <p className="text-lg font-black text-[var(--deep-navy)]">Take a timed practice exam</p>
            <p className="text-sm text-slate-600">{FORMS.full.items} or {FORMS.short.items} questions drawn by the NCSBN test plan, with case studies, one question at a time and a full review at the end.</p>
          </div>
        )}
        <Link href={open ? `/exam/${open.id}` : '/exam'} className="rounded-xl bg-[var(--blue)] px-6 py-3 font-black text-white">
          {open ? 'Resume exam →' : 'Take a practice exam →'}
        </Link>
      </div>

      {past.length > 0 && (
        <div className="mt-5 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full text-left text-sm">
            <caption className="px-5 pt-4 text-left font-black text-[var(--deep-navy)]">Exam history</caption>
            <thead className="text-xs font-black uppercase text-slate-500">
              <tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Exam</th><th className="px-5 py-3">Score</th><th className="hidden px-5 py-3 sm:table-cell">Answered</th><th className="px-5 py-3"><span className="sr-only">Results</span></th></tr>
            </thead>
            <tbody>
              {past.map(r => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-5 py-3">{new Date(r.started_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3 font-bold">{FORMS[r.form].label}{r.status === 'expired' ? ' · time ran out' : ''}</td>
                  <td className="px-5 py-3 text-lg font-black text-[var(--teal)]">{r.score_summary ? `${r.score_summary.overall.percent}%` : '—'}</td>
                  <td className="hidden px-5 py-3 sm:table-cell">{r.score_summary ? `${r.score_summary.overall.answered} of ${r.score_summary.overall.items}` : '—'}</td>
                  <td className="px-5 py-3 text-right"><Link href={`/exam/${r.id}/results`} className="font-bold text-[var(--blue)]">Results and review →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
