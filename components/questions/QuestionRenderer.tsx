'use client';
import { Fragment } from 'react';
import {
  optionLetter, type BankQuestion, type BowTieResponse, type ChoiceResponse, type ClozeResponse,
  type HighlightResponse, type MatrixResponse, type ResponseConfig, type StudentResponse,
} from '@/lib/questions/bank';

type Props = {
  question: BankQuestion;
  display: ResponseConfig;        // shuffled view from displayResponse()
  value: StudentResponse;
  submitted: boolean;
  onChange: (v: StudentResponse) => void;
};

const base = 'border-slate-200 bg-white';
const picked = 'border-blue-500 bg-blue-50';
const right = 'border-emerald-400 bg-emerald-50';
const wrong = 'border-rose-400 bg-rose-50';

function Mark({ show, correct }: { show: boolean; correct: boolean }) {
  if (!show) return null;
  return correct
    ? <b className="ml-2 shrink-0 text-emerald-700">✓ Correct</b>
    : <b className="ml-2 shrink-0 text-rose-700">✕ Incorrect</b>;
}

function Choice({ question, display, value, submitted, onChange }: Props) {
  const r = display as ChoiceResponse;
  const multi = question.item_type === 'multiple_response';
  const selected = value.selected ?? [];
  const toggle = (id: string) => {
    if (!multi) return onChange({ selected: [id] });
    onChange({ selected: selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id] });
  };
  return (
    <div className="mt-6 space-y-3" role={multi ? 'group' : 'radiogroup'}>
      {multi && <p className="text-sm font-bold text-slate-500">Select all that apply.</p>}
      {r.options.map((o, n) => {
        const chosen = selected.includes(o.id);
        const tone = submitted ? (o.correct ? right : chosen ? wrong : base) : chosen ? picked : base;
        return (
          <label key={o.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${tone} ${submitted ? 'cursor-default' : ''}`}>
            <input
              type={multi ? 'checkbox' : 'radio'} name={question.source_id} className="mt-1"
              checked={chosen} disabled={submitted} onChange={() => toggle(o.id)}
            />
            <b className="w-5 shrink-0">{optionLetter(n)}</b>
            <span className="flex-1">{o.text}</span>
            <Mark show={submitted && (o.correct || chosen)} correct={o.correct} />
          </label>
        );
      })}
    </div>
  );
}

function Matrix({ display, value, submitted, onChange }: Props) {
  const r = display as MatrixResponse;
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b-2 border-slate-200">
            <th className="p-3">Finding</th>
            {r.columns.map(c => <th key={c} className="p-3 text-center">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {r.rows.map(row => {
            const chosen = value.matrix?.[row.id];
            return (
              <tr key={row.id} className="border-b border-slate-100">
                <td className="p-3">{row.text}</td>
                {r.columns.map(col => {
                  const isKey = col === row.correct, isChosen = chosen === col;
                  const tone = submitted ? (isKey ? 'bg-emerald-100' : isChosen ? 'bg-rose-100' : '') : '';
                  return (
                    <td key={col} className={`p-3 text-center ${tone}`}>
                      <input
                        type="radio" name={row.id} aria-label={`${row.text}: ${col}`}
                        checked={isChosen} disabled={submitted}
                        onChange={() => onChange({ matrix: { ...value.matrix, [row.id]: col } })}
                      />
                      {submitted && isKey && <span className="ml-2 font-black text-emerald-700">✓</span>}
                      {submitted && isChosen && !isKey && <span className="ml-2 font-black text-rose-700">✕</span>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Cloze({ display, value, submitted, onChange }: Props) {
  const r = display as ClozeResponse;
  const blanks = new Map(r.blanks.map(b => [b.id, b]));
  const parts = r.template.split(/___(\w+)___/);   // odd indexes are blank ids
  return (
    <p className="mt-6 text-lg leading-[3rem]">
      {parts.map((part, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
        const b = blanks.get(part);
        if (!b) return <Fragment key={i}>____</Fragment>;
        const chosen = value.blanks?.[b.id] ?? '';
        const tone = submitted ? (chosen === b.correct ? right : wrong) : chosen ? picked : base;
        return (
          <span key={i} className="inline-block align-middle">
            <select
              aria-label="Choose an option" value={chosen} disabled={submitted}
              onChange={e => onChange({ blanks: { ...value.blanks, [b.id]: e.target.value } })}
              className={`mx-1 max-w-full rounded-xl border-2 px-3 py-2 text-base ${tone}`}
            >
              <option value="">Select…</option>
              {b.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            {submitted && chosen !== b.correct && <span className="mx-1 text-sm font-bold text-emerald-700">✓ {b.correct}</span>}
          </span>
        );
      })}
    </p>
  );
}

function Highlight({ display, value, submitted, onChange }: Props) {
  const r = display as HighlightResponse;
  const on = new Set(value.highlights ?? []);
  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 leading-9">
      <p className="mb-2 text-sm font-bold text-slate-500">Click each finding to highlight it. Click again to remove.</p>
      {r.segments.map(s => {
        const chosen = on.has(s.id);
        const tone = submitted
          ? s.correct ? 'bg-emerald-200 ring-1 ring-emerald-400' : chosen ? 'bg-rose-200 ring-1 ring-rose-400 line-through' : ''
          : chosen ? 'bg-yellow-200 ring-1 ring-amber-400' : 'hover:bg-yellow-50';
        return (
          <Fragment key={s.id}>
            <button
              type="button" disabled={submitted} aria-pressed={chosen}
              onClick={() => {
                const next = new Set(on);
                if (chosen) next.delete(s.id); else next.add(s.id);
                onChange({ highlights: [...next] });
              }}
              className={`rounded px-1 text-left ${tone}`}
            >
              {s.text}
            </button>{' '}
          </Fragment>
        );
      })}
    </div>
  );
}

function BowTie({ display, value, submitted, onChange }: Props) {
  const r = display as BowTieResponse;
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-3">
      {r.groups.map(g => {
        const chosen = value.groups?.[g.id] ?? [];
        return (
          <fieldset key={g.id} className="rounded-2xl border border-slate-200 p-4">
            <legend className="px-1 font-black">{g.label}</legend>
            {g.options.map(o => {
              const isChosen = chosen.includes(o.id);
              const full = !isChosen && chosen.length >= g.pick && g.pick > 1;
              const tone = submitted ? (o.correct ? right : isChosen ? wrong : base) : isChosen ? picked : base;
              return (
                <label key={o.id} className={`mt-2 flex items-start gap-2 rounded-xl border p-3 text-sm ${tone}`}>
                  <input
                    type={g.pick === 1 ? 'radio' : 'checkbox'} name={g.id} className="mt-0.5"
                    checked={isChosen} disabled={submitted || full}
                    onChange={() => {
                      const next = g.pick === 1 ? [o.id] : isChosen ? chosen.filter(x => x !== o.id) : [...chosen, o.id];
                      onChange({ groups: { ...value.groups, [g.id]: next } });
                    }}
                  />
                  <span className="flex-1">{o.text}</span>
                  <Mark show={submitted && (o.correct || isChosen)} correct={o.correct} />
                </label>
              );
            })}
          </fieldset>
        );
      })}
    </div>
  );
}

export default function QuestionRenderer(props: Props) {
  switch (props.question.item_type) {
    case 'single_best_answer':
    case 'multiple_response': return <Choice {...props} />;
    case 'matrix_grid': return <Matrix {...props} />;
    case 'drop_down_cloze': return <Cloze {...props} />;
    case 'highlight': return <Highlight {...props} />;
    case 'bow_tie': return <BowTie {...props} />;
  }
}
