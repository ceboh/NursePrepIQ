'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FORMS, type ExamForm } from '@/lib/exam/blueprint';
import { examApi, formatClock, formatDuration } from '@/lib/exam/client';

type OpenExam = { id: string; form: ExamForm; status: string; current_position: number; item_count: number; time_limit_seconds: number; elapsed_seconds: number; last_resumed_at: string | null };

const remaining = (e: OpenExam) => {
  const running = e.status === 'in_progress' && e.last_resumed_at ? Math.max(0, (Date.now() - Date.parse(e.last_resumed_at)) / 1000) : 0;
  return Math.max(0, e.time_limit_seconds - e.elapsed_seconds - running);
};

const rules = [
  ['⏱️', 'Timed', 'The clock runs while you work. You can pause and come back later; the exam submits itself when time runs out.'],
  ['🙈', 'No feedback', 'You will not see whether an answer is right until the exam is over.'],
  ['➡️', 'No going back', 'Selecting Next locks in your answer. Questions cannot be revisited, just like the NCLEX.'],
  ['⏸️', 'Pause and resume', 'Pause any time. Your place and time are saved, and you can resume from the dashboard.'],
];

export default function ExamStart() {
  const router = useRouter();
  const [track, setTrack] = useState<'RN' | 'PN'>('RN');
  const [open, setOpen] = useState<OpenExam | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<ExamForm | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const s = createClient();
      const { data: { user } } = await s.auth.getUser();
      if (!user) { router.replace('/auth'); return; }
      const [{ data: profile }, { data: exams }] = await Promise.all([
        s.from('profiles').select('exam_track,onboarding_complete').eq('id', user.id).maybeSingle(),
        s.from('exam_sessions').select('id,form,status,current_position,item_count,time_limit_seconds,elapsed_seconds,last_resumed_at')
          .eq('user_id', user.id).in('status', ['in_progress', 'paused']).not('assembly', 'is', null).limit(1),
      ]);
      if (!profile?.onboarding_complete) { router.replace('/onboarding'); return; }
      setTrack(profile.exam_track === 'pn' ? 'PN' : 'RN');
      setOpen((exams?.[0] as OpenExam) ?? null);
      setLoading(false);
    })();
  }, [router]);

  async function start(form: ExamForm) {
    setStarting(form);
    setError('');
    try {
      const { sessionId } = await examApi<{ sessionId: string }>('/api/exam', { method: 'POST', body: { form } });
      router.push(`/exam/${sessionId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The exam could not be started.');
      setStarting(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-[var(--deep-navy)] px-6 py-5 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/dashboard" className="text-xl font-black">NursePrep<span className="text-[var(--aqua)]">IQ</span></Link>
          <Link href="/dashboard" className="text-sm font-bold text-cyan-100 hover:text-white">Dashboard</Link>
        </div>
      </header>
      <section className="mx-auto max-w-5xl px-6 py-10">
        <p className="font-black tracking-wider text-[var(--teal)]">NCLEX-{track} PRACTICE EXAM</p>
        <h1 className="mt-2 text-4xl font-black text-[var(--deep-navy)]">Take a practice exam</h1>
        <p className="mt-3 max-w-3xl text-lg text-slate-600">
          Questions are drawn to match the NCLEX-{track} test plan: each client-need category gets its share of questions, and NGN case studies appear whole and in order.
        </p>

        {loading ? <p className="mt-10 font-bold">Loading…</p> : (
          <>
            {open && (
              <div className="mt-8 rounded-3xl border-2 border-[var(--aqua)] bg-white p-6 shadow-sm">
                <p className="text-sm font-black text-[var(--teal)]">{open.status === 'paused' ? 'EXAM PAUSED' : 'EXAM IN PROGRESS'}</p>
                <h2 className="mt-1 text-2xl font-black text-[var(--deep-navy)]">{FORMS[open.form].label}: question {Math.min(open.current_position, open.item_count)} of {open.item_count}</h2>
                <p className="mt-1 text-slate-600">Time left: <b>{formatClock(remaining(open))}</b>. Finish or end this exam before starting a new one.</p>
                <button onClick={() => router.push(`/exam/${open.id}`)} className="mt-4 rounded-xl bg-[var(--blue)] px-6 py-3 font-black text-white">Resume exam →</button>
              </div>
            )}

            {!open && (
              <div className="mt-8 grid gap-5 md:grid-cols-2">
                {(['full', 'short'] as ExamForm[]).map(form => (
                  <article key={form} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                    <h2 className="text-2xl font-black text-[var(--deep-navy)]">{FORMS[form].label}</h2>
                    <p className="mt-2 text-slate-600">
                      {FORMS[form].items} questions, including {FORMS[form].cases === 1 ? '1 NGN case study' : `${FORMS[form].cases} NGN case studies`} (6 questions each).
                    </p>
                    <p className="mt-1 font-bold text-slate-700">Time limit: {formatDuration(FORMS[form].minutes * 60)}</p>
                    <button disabled={!!starting} onClick={() => start(form)} className="mt-5 w-full rounded-xl bg-[var(--deep-navy)] px-4 py-3 font-black text-white disabled:opacity-50">
                      {starting === form ? 'Building your exam…' : `Start ${FORMS[form].label.toLowerCase()}`}
                    </button>
                  </article>
                ))}
              </div>
            )}
            {error && <p className="mt-5 rounded-xl bg-rose-50 p-4 font-bold text-rose-800">{error}</p>}

            <h2 className="mt-10 text-xl font-black text-[var(--deep-navy)]">How the practice exam works</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {rules.map(([icon, title, text]) => (
                <div key={title} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <p className="font-black"><span aria-hidden className="mr-2">{icon}</span>{title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm text-slate-500">
              Partial credit follows NGN rules. Unanswered questions score zero. After the exam you will see your score by category and can review every question with its rationale.
              This score reflects performance on this practice exam. It does not predict NCLEX results.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
