'use client';
import { useState } from 'react';
import type { CaseStudy } from '@/lib/questions/bank';

const STEPS = ['Recognize cues', 'Analyze cues', 'Prioritize hypotheses', 'Generate solutions', 'Take action', 'Evaluate outcomes'];

// Unfolding case: scenario plus exhibit tabs (nurses' notes, vitals, labs...). The case's
// items are served as one block in sequence; the page's counter counts the whole case as one item.
export default function CaseStudyPanel({ caseStudy, step, total, judgmentStep }: { caseStudy: CaseStudy; step: number; total: number; judgmentStep: string | null }) {
  const [tab, setTab] = useState(0);
  const exhibit = caseStudy.exhibits[Math.min(tab, caseStudy.exhibits.length - 1)];
  return (
    <div className="mt-5 rounded-2xl border-2 border-cyan-200 bg-cyan-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-black text-[var(--deep-navy)]">📋 Case study: {caseStudy.title}, Question {step} of {total}</h2>
        {judgmentStep && <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[var(--teal)]">{judgmentStep}</span>}
      </div>
      <ol className="mt-3 flex gap-1" aria-label={`Case progress: step ${step} of ${total}`}>
        {STEPS.slice(0, Math.max(total, 1)).map((s, i) => (
          <li key={s} title={s} className={`h-1.5 flex-1 rounded-full ${i < step ? 'bg-[var(--teal)]' : 'bg-cyan-100'}`} />
        ))}
      </ol>
      <p className="mt-4 leading-7 text-slate-800">{caseStudy.scenario}</p>
      <div className="mt-4 overflow-hidden rounded-xl bg-white ring-1 ring-cyan-100">
        <div role="tablist" className="flex flex-wrap border-b border-cyan-100 bg-cyan-50/60">
          {caseStudy.exhibits.map((e, i) => (
            <button
              key={e.label} type="button" role="tab" aria-selected={i === tab} onClick={() => setTab(i)}
              className={`px-4 py-2 text-sm font-bold ${i === tab ? 'bg-white text-[var(--deep-navy)]' : 'text-slate-500 hover:text-[var(--deep-navy)]'}`}
            >
              {e.label}
            </button>
          ))}
        </div>
        <p role="tabpanel" className="whitespace-pre-line p-4 leading-7 text-slate-700">{exhibit?.content}</p>
      </div>
    </div>
  );
}
