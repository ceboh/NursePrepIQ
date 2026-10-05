'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import QuestionRenderer from '@/components/questions/QuestionRenderer';
import CaseStudyPanel from '@/components/questions/CaseStudyPanel';
import { ITEM_TYPE_LABEL, type BankQuestion, type ItemType } from '@/lib/questions/bank';
import { FORMS } from '@/lib/exam/blueprint';
import { examApi, formatClock, formatDuration } from '@/lib/exam/client';
import type { ExamResults as Results } from '@/lib/exam/review';
import type { Bucket, ScoreSummary } from '@/lib/exam/score';

const STEPS = ['Recognize cues', 'Analyze cues', 'Prioritize hypotheses', 'Generate solutions', 'Take action', 'Evaluate outcomes'];
const ENDED: Record<ScoreSummary['endedBy'], string> = { completed: 'Completed', time_expired: 'Time ran out', ended_early: 'Ended early' };

function Breakdown({ title, buckets, order, label }: { title: string; buckets: Record<string, Bucket>; order?: string[]; label?: (k: string) => string }) {
  const keys = (order ?? Object.keys(buckets).sort((a, b) => buckets[b].items - buckets[a].items || a.localeCompare(b))).filter(k => buckets[k]);
  if (!keys.length) return null;
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h3 className="text-lg font-black text-[var(--deep-navy)]">{title}</h3>
      <div className="mt-3 space-y-3">
        {keys.map(k => {
          const b = buckets[k];
          return (
            <div key={k}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-bold text-slate-700">{label ? label(k) : k}</span>
                <span className="shrink-0 text-slate-500"><b className="text-[var(--deep-navy)]">{b.percent}%</b> · {b.items} question{b.items === 1 ? '' : 's'}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden><div className="h-full rounded-full bg-[var(--teal)]" style={{ width: `${b.percent}%` }} /></div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function ExamResults() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Results | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'missed'>('all');

  useEffect(() => {
    examApi<Results>(`/api/exam/${id}/results`).then(setData).catch(e => setError(e instanceof Error ? e.message : 'Results could not be loaded.'));
  }, [id]);

  const shown = useMemo(() => (data?.items ?? []).filter(i => filter === 'all' || !i.isCorrect), [data, filter]);

  if (!data) {
    return <main className="grid min-h-screen place-items-center p-6"><div className="text-center"><b>{error || 'Loading your results…'}</b>{error && <p className="mt-4"><Link href="/exam" className="font-bold text-[var(--teal)]">Back to practice exams</Link></p>}</div></main>;
  }
  const { session, items } = data;
  const s = session.summary;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-[var(--deep-navy)] px-6 py-5 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/dashboard" className="text-xl font-black">NursePrep<span className="text-[var(--aqua)]">IQ</span></Link>
          <div className="flex gap-4 text-sm font-bold text-cyan-100"><Link href="/exam" className="hover:text-white">Practice exams</Link><Link href="/dashboard" className="hover:text-white">Dashboard</Link></div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <p className="font-black tracking-wider text-[var(--teal)]">NCLEX-{session.track.toUpperCase()} PRACTICE EXAM RESULTS</p>
        <h1 className="mt-2 text-3xl font-black text-[var(--deep-navy)]">{FORMS[session.form].label} · {new Date(session.startedAt).toLocaleDateString()}</h1>

        {s && (
          <div className="mt-6 grid gap-4 md:grid-cols-[1.2fr_1fr]">
            <div className="rounded-3xl bg-[var(--deep-navy)] p-7 text-white">
              <p className="text-sm font-bold text-cyan-100">Overall score</p>
              <p className="mt-1 text-6xl font-black">{s.overall.percent}%</p>
              <p className="mt-2 text-cyan-50">{s.overall.earned} of {s.overall.possible} points · {s.overall.correct} of {s.overall.items} questions fully correct</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><p className="text-sm font-bold text-slate-500">Answered</p><p className="mt-1 text-2xl font-black">{s.overall.answered} / {s.overall.items}</p></div>
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><p className="text-sm font-bold text-slate-500">Time used</p><p className="mt-1 text-2xl font-black">{formatClock(s.timeUsedSeconds)}</p><p className="text-xs text-slate-500">of {formatDuration(s.timeLimitSeconds)}</p></div>
              <div className="col-span-2 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><p className="text-sm font-bold text-slate-500">Exam ended</p><p className="mt-1 text-xl font-black">{ENDED[s.endedBy]}</p></div>
            </div>
          </div>
        )}
        <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm font-bold text-amber-900">
          This score reflects performance on this practice exam. It does not predict NCLEX results.
        </p>
        <p className="mt-2 text-sm text-slate-500">Scores count partial credit the way NGN items are scored: points per correct choice, row, blank or selection, with SATA and highlight extras subtracting a point.</p>

        {s && (
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <Breakdown title="By client need" buckets={s.byClientNeed} />
            <Breakdown title="By clinical judgment step (case studies)" buckets={s.byJudgmentStep} order={STEPS} />
            <Breakdown title="By body system" buckets={s.bySystem} />
            <Breakdown title="By discipline" buckets={s.byDiscipline} />
            <Breakdown title="By item type" buckets={s.byItemType} label={k => ITEM_TYPE_LABEL[k as ItemType] ?? k} />
          </div>
        )}

        <div className="mt-12 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-[var(--deep-navy)]">Review</h2>
            <p className="text-slate-600">Every question with your answer, the correct answer and the rationale.</p>
          </div>
          <div className="flex rounded-xl bg-white p-1 text-sm font-bold ring-1 ring-slate-200" role="group" aria-label="Filter review">
            <button onClick={() => setFilter('all')} aria-pressed={filter === 'all'} className={`rounded-lg px-3 py-1.5 ${filter === 'all' ? 'bg-[var(--deep-navy)] text-white' : ''}`}>All ({items.length})</button>
            <button onClick={() => setFilter('missed')} aria-pressed={filter === 'missed'} className={`rounded-lg px-3 py-1.5 ${filter === 'missed' ? 'bg-[var(--deep-navy)] text-white' : ''}`}>Not fully correct ({items.filter(i => !i.isCorrect).length})</button>
          </div>
        </div>

        <div className="mt-5 space-y-6">
          {shown.map(i => (
            <article key={i.position} className="rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center gap-2 text-xs font-black">
                <span className="rounded-full bg-slate-900 px-3 py-1 text-white">Question {i.position}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">{ITEM_TYPE_LABEL[i.itemType]}</span>
                <span className="rounded-full bg-cyan-50 px-3 py-1">{i.clientNeed}</span>
                <span className="rounded-full bg-blue-50 px-3 py-1">{i.system}</span>
                <span className={`ml-auto rounded-full px-3 py-1 ${!i.answered ? 'bg-slate-200 text-slate-700' : i.isCorrect ? 'bg-emerald-100 text-emerald-800' : i.earned > 0 ? 'bg-amber-100 text-amber-900' : 'bg-rose-100 text-rose-800'}`}>
                  {!i.answered ? 'Not answered' : i.isCorrect ? 'Correct' : i.earned > 0 ? 'Partially correct' : 'Incorrect'} · {i.earned} of {i.possible} point{i.possible === 1 ? '' : 's'}
                </span>
              </div>
              {i.case && <CaseStudyPanel key={`${i.case.id}-${i.position}`} caseStudy={i.case} step={i.case.step} total={i.case.total} judgmentStep={i.judgmentStep} />}
              <h3 className="mt-5 text-lg font-black leading-8">{i.stem}</h3>
              <QuestionRenderer
                question={{ item_type: i.itemType, source_id: `review-${i.position}` } as unknown as BankQuestion}
                display={i.display}
                value={i.response}
                submitted
                onChange={() => {}}
              />
              <div className="mt-5 rounded-2xl bg-emerald-50 p-5">
                <h4 className="font-black">✅ Answer</h4>
                <p className="mt-2 leading-7 text-slate-700">{i.answerKey}</p>
                <h4 className="mt-4 font-black">Rationale</h4>
                <p className="mt-2 leading-7 text-slate-700">{i.rationale}</p>
              </div>
              {i.timeSpentSeconds !== null && <p className="mt-3 text-xs text-slate-500">Time on this question: {formatClock(i.timeSpentSeconds)}</p>}
            </article>
          ))}
          {!shown.length && <p className="rounded-2xl bg-white p-6 text-center font-bold text-slate-600">Every question was fully correct.</p>}
        </div>
      </section>
    </main>
  );
}
