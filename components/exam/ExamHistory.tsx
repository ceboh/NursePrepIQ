'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { FORMS, type ExamForm } from '@/lib/exam/blueprint';
import type { ScoreSummary } from '@/lib/exam/score';

type Row = { id: string; form: ExamForm; status: string; started_at: string; score_summary: ScoreSummary | null };

// Past practice exams on the dashboard, newest first, read through row-level security.
export default function ExamHistory() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    (async () => {
      const s = createClient();
      const { data: { user } } = await s.auth.getUser();
      if (!user) return;
      const { data } = await s.from('exam_sessions').select('id,form,status,started_at,score_summary')
        .eq('user_id', user.id).in('status', ['submitted', 'expired']).not('assembly', 'is', null)
        .order('started_at', { ascending: false }).limit(10);
      setRows((data as Row[]) ?? []);
    })();
  }, []);

  if (!rows?.length) return null;
  return (
    <section className="mt-10">
      <p className="text-sm font-black tracking-widest text-[var(--teal)]">PRACTICE EXAMS</p>
      <h2 className="mt-1 text-3xl font-black text-[var(--deep-navy)]">Exam history</h2>
      <div className="mt-5 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
            <tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Exam</th><th className="px-5 py-3">Score</th><th className="hidden px-5 py-3 sm:table-cell">Answered</th><th className="px-5 py-3" /></tr>
          </thead>
          <tbody>
            {rows.map(r => (
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
    </section>
  );
}
