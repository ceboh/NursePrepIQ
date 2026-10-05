'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import QuestionRenderer from '@/components/questions/QuestionRenderer';
import CaseStudyPanel from '@/components/questions/CaseStudyPanel';
import type { BankQuestion, ResponseConfig, StudentResponse } from '@/lib/questions/bank';
import { FORMS } from '@/lib/exam/blueprint';
import { examApi, formatClock } from '@/lib/exam/client';
import type { ExamState } from '@/lib/exam/delivery';
import { isEmptyResponse } from '@/lib/exam/response';

export default function ExamDelivery() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<ExamState | null>(null);
  const [response, setResponse] = useState<StudentResponse>({});
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [error, setError] = useState('');
  const top = useRef<HTMLDivElement>(null);
  const live = useRef(false);

  const apply = useCallback((s: ExamState) => {
    if (s.status === 'submitted' || s.status === 'expired') { router.replace(`/exam/${s.id}/results`); return; }
    setState(prev => {
      if (prev?.item?.position !== s.item?.position) setResponse({});
      return s;
    });
    setDeadline(s.status === 'in_progress' ? Date.now() + s.remainingSeconds * 1000 : null);
    live.current = s.status === 'in_progress';
    setConfirmEmpty(false);
    setError('');
  }, [router]);

  const call = useCallback(async (body?: Record<string, unknown>) => {
    setBusy(true);
    try {
      apply(await examApi<ExamState>(`/api/exam/${id}`, body ? { method: 'POST', body } : {}));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }, [apply, id]);

  useEffect(() => { call(); }, [call]);

  // Countdown; when it reaches zero the server ends the exam on the next request.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = deadline ? Math.max(0, Math.round((deadline - now) / 1000)) : state?.remainingSeconds ?? 0;
  useEffect(() => {
    if (deadline && left === 0 && !busy) call();
  }, [deadline, left, busy, call]);

  // Leaving the page pauses the clock so time is not lost while the exam is closed.
  useEffect(() => {
    const onHide = () => { if (live.current) void examApi(`/api/exam/${id}`, { method: 'POST', body: { action: 'pause' }, keepalive: true }).catch(() => {}); };
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [id]);

  async function next(force = false) {
    if (!state?.item) return;
    if (!force && isEmptyResponse(response)) { setConfirmEmpty(true); return; }
    await call({ action: 'answer', position: state.item.position, response });
    requestAnimationFrame(() => top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  if (!state) {
    return <main className="grid min-h-screen place-items-center p-6"><div className="text-center"><b>{error || 'Loading your exam…'}</b>{error && <p><button onClick={() => router.push('/exam')} className="mt-4 rounded-xl bg-[var(--deep-navy)] px-5 py-3 font-bold text-white">Back</button></p>}</div></main>;
  }

  const item = state.item;
  const position = item?.position ?? state.position;
  const pct = Math.round(((position - 1) / state.total) * 100);
  const low = left <= 300;

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-20 bg-[var(--deep-navy)] text-white shadow">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-5 py-3">
          <span className="text-sm font-black">NCLEX-{state.track.toUpperCase()} · {FORMS[state.form].label}</span>
          <span className="text-sm font-bold" aria-live="polite">Question {position} of {state.total}</span>
          <div className="flex items-center gap-2">
            <span className={`rounded-lg px-3 py-1 font-mono text-sm font-black ${low ? 'bg-rose-500 text-white' : 'bg-white/10'}`} aria-label="Time left">⏱ {formatClock(left)}</span>
            {state.status === 'in_progress' && <button disabled={busy} onClick={() => call({ action: 'pause' })} className="rounded-lg bg-white/10 px-3 py-1 text-sm font-bold disabled:opacity-50">Pause</button>}
          </div>
        </div>
        <div className="h-1.5 bg-white/10" aria-hidden><div className="h-full bg-[var(--aqua)] transition-all" style={{ width: `${pct}%` }} /></div>
      </header>

      <div ref={top} className="mx-auto max-w-4xl scroll-mt-16 px-5 py-6">
        {state.status === 'paused' && (
          <section className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <h1 className="text-2xl font-black text-[var(--deep-navy)]">Exam paused</h1>
            <p className="mt-2 text-slate-600">Your place and time are saved. Time left: <b>{formatClock(state.remainingSeconds)}</b>.</p>
            <button disabled={busy} onClick={() => call({ action: 'resume' })} className="mt-5 rounded-xl bg-[var(--blue)] px-6 py-3 font-black text-white disabled:opacity-50">Resume exam</button>
            <p className="mt-4"><button onClick={() => router.push('/dashboard')} className="text-sm font-bold text-[var(--teal)]">Back to dashboard</button></p>
          </section>
        )}

        {state.status === 'in_progress' && item && (
          <section className="rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-200">
            {item.case && (
              <CaseStudyPanel
                key={`case-${item.position - item.case.step}`}
                caseStudy={{ id: `case-${item.position - item.case.step}`, title: '', scenario: item.case.scenario, exhibits: item.case.exhibits }}
                step={item.case.step} total={item.case.total} judgmentStep={item.case.judgmentStep}
              />
            )}
            <h1 className="mt-5 text-xl font-black leading-8">{item.stem}</h1>
            <QuestionRenderer
              key={item.position}
              question={{ item_type: item.itemType, source_id: `exam-${item.position}` } as unknown as BankQuestion}
              display={item.display as unknown as ResponseConfig}
              value={response}
              submitted={false}
              onChange={setResponse}
            />
            {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-rose-800">{error}</p>}
            {confirmEmpty ? (
              <div className="mt-6 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
                <p className="font-bold text-amber-900">You have not answered this question. If you continue, it will be scored as incorrect and you cannot come back to it.</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button onClick={() => setConfirmEmpty(false)} className="rounded-xl border-2 border-[var(--blue)] bg-white px-4 py-2 font-black text-[var(--blue)]">Go back and answer</button>
                  <button disabled={busy} onClick={() => next(true)} className="rounded-xl bg-amber-600 px-4 py-2 font-black text-white disabled:opacity-50">Skip this question</button>
                </div>
              </div>
            ) : (
              <button disabled={busy} onClick={() => next()} className="mt-6 w-full rounded-xl bg-[var(--blue)] py-4 font-black text-white disabled:opacity-40">
                {busy ? 'Saving…' : position === state.total ? 'Submit final answer and finish →' : 'Next →'}
              </button>
            )}
          </section>
        )}

        <div className="mt-8 text-center">
          {confirmEnd ? (
            <div className="inline-block rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200">
              <p className="font-bold">End the exam now? Questions you have not reached will score zero.</p>
              <div className="mt-3 flex gap-3">
                <button onClick={() => setConfirmEnd(false)} className="rounded-xl border px-4 py-2 font-bold">Keep going</button>
                <button disabled={busy} onClick={() => call({ action: 'end' })} className="rounded-xl bg-rose-600 px-4 py-2 font-black text-white disabled:opacity-50">End exam and see results</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmEnd(true)} className="text-sm font-bold text-slate-500 underline">End exam early</button>
          )}
        </div>
      </div>
    </main>
  );
}
