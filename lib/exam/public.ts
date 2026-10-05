// What the browser may see during an exam. Every field is copied from an explicit whitelist,
// so answer keys (correct flags, correct columns, correct blanks), rationales, answer summaries
// and question identifiers can never reach the client while the exam is in progress.
//
// Option, row and segment ids are replaced with opaque per-session tokens. Stored ids are
// positional (o1, g1o1, s1...) and authoring order is not random (bow-tie keys are usually
// written first), so sending the real ids could hint at the key even with shuffled display.
// The server maps tokens back to real ids (unmaskResponse) before scoring.
import { displayResponse, type BankQuestion, type BowTieResponse, type ChoiceResponse, type ClozeResponse, type HighlightResponse, type ItemType, type MatrixResponse } from '@/lib/questions/bank';

export type PublicResponse =
  | { options: { id: string; text: string }[] }
  | { columns: string[]; rows: { id: string; text: string }[] }
  | { template: string; blanks: { id: string; options: string[] }[] }
  | { segments: { id: string; text: string }[] }
  | { groups: { id: string; label: string; pick: number; options: { id: string; text: string }[] }[] };

export type PublicCase = { scenario: string; exhibits: { label: string; content: string }[]; step: number; total: number; judgmentStep: string | null };

export type PublicItem = {
  position: number;
  total: number;
  itemType: ItemType;
  stem: string;
  display: PublicResponse;
  case: PublicCase | null;
};

function fnv(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

// Opaque token for one id of one question in one session.
export const maskId = (seed: string, q: Pick<BankQuestion, 'source_id'>, id: string) => 'k' + fnv(`${seed}|${q.source_id}|${id}`) + fnv(`${id}|${q.source_id}|${seed}`);

// Real id -> token for every maskable id of a question (options, rows, segments, bow-tie options).
function idsOf(q: BankQuestion): string[] {
  switch (q.item_type) {
    case 'single_best_answer':
    case 'multiple_response': return (q.response as ChoiceResponse).options.map(o => o.id);
    case 'matrix_grid': return (q.response as MatrixResponse).rows.map(r => r.id);
    case 'highlight': return (q.response as HighlightResponse).segments.map(s => s.id);
    case 'bow_tie': return (q.response as BowTieResponse).groups.flatMap(g => g.options.map(o => o.id));
    case 'drop_down_cloze': return [];
  }
}
export function tokenMap(q: BankQuestion, seed: string): Map<string, string> {
  const map = new Map<string, string>();
  const used = new Set<string>();
  for (const id of idsOf(q)) {
    let t = maskId(seed, q, id);
    while (used.has(t)) t += 'x';
    used.add(t);
    map.set(id, t);
  }
  return map;
}

// Same option order as review for this session (seeded by the session seed).
export function publicDisplay(q: BankQuestion, seed: string): PublicResponse {
  const d = displayResponse(q, seed);
  const tok = tokenMap(q, seed);
  const t = (id: string) => tok.get(id)!;
  switch (q.item_type) {
    case 'single_best_answer':
    case 'multiple_response':
      return { options: (d as ChoiceResponse).options.map(o => ({ id: t(o.id), text: o.text })) };
    case 'matrix_grid': {
      const m = d as MatrixResponse;
      return { columns: [...m.columns], rows: m.rows.map(r => ({ id: t(r.id), text: r.text })) };
    }
    case 'drop_down_cloze': {
      const c = d as ClozeResponse;
      return { template: c.template, blanks: c.blanks.map(b => ({ id: b.id, options: [...b.options] })) };
    }
    case 'highlight':
      return { segments: (d as HighlightResponse).segments.map(s => ({ id: t(s.id), text: s.text })) };
    case 'bow_tie':
      return { groups: (d as BowTieResponse).groups.map(g => ({ id: g.id, label: g.label, pick: g.pick, options: g.options.map(o => ({ id: t(o.id), text: o.text })) })) };
  }
}

// Converts a response made with tokens back to real ids. Unknown tokens are dropped.
export function unmaskResponse(q: BankQuestion, seed: string, raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return {};
  const back = new Map([...tokenMap(q, seed)].map(([id, t]) => [t, id]));
  const ids = (v: unknown) => (Array.isArray(v) ? v.map(x => (typeof x === 'string' ? back.get(x) : undefined)).filter((x): x is string => !!x) : []);
  const r = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  if ('selected' in r) out.selected = ids(r.selected);
  if ('highlights' in r) out.highlights = ids(r.highlights);
  if ('blanks' in r) out.blanks = r.blanks;
  if (r.matrix && typeof r.matrix === 'object') {
    out.matrix = Object.fromEntries(Object.entries(r.matrix as Record<string, unknown>).map(([k, v]) => [back.get(k), v]).filter(([k]) => !!k));
  }
  if (r.groups && typeof r.groups === 'object') {
    out.groups = Object.fromEntries(Object.entries(r.groups as Record<string, unknown>).map(([g, v]) => [g, ids(v)]));
  }
  return out;
}

export function publicItem(args: {
  q: BankQuestion;
  seed: string;
  position: number;
  total: number;
  caseStudy: { scenario: string; exhibits: { label: string; content: string }[] } | null;
  caseSize: number;
}): PublicItem {
  const { q, seed, position, total, caseStudy, caseSize } = args;
  return {
    position,
    total,
    itemType: q.item_type,
    stem: q.stem,
    display: publicDisplay(q, seed),
    // The case title is left out on purpose: titles name the condition, which would give away
    // the "Prioritize hypotheses" answer. It is shown again in review.
    case: caseStudy
      ? {
          scenario: caseStudy.scenario,
          exhibits: caseStudy.exhibits.map(e => ({ label: e.label, content: e.content })),
          step: q.case_sequence ?? 1,
          total: caseSize,
          judgmentStep: q.clinical_judgment_step,
        }
      : null,
  };
}

// Field names that must never appear in an in-progress exam payload. Used by tests and by the
// server as a last check before responding.
export const FORBIDDEN_KEYS = ['correct', 'is_correct', 'isCorrect', 'correct_column', 'correct_text', 'answer_summary', 'rationale', 'source_id', 'question_id', 'case_id', 'client_need', 'answer_key', 'score', 'points_earned', 'max_score'];

export function findForbiddenKeys(value: unknown, path = '$'): string[] {
  if (Array.isArray(value)) return value.flatMap((v, i) => findForbiddenKeys(v, `${path}[${i}]`));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => [
      ...(FORBIDDEN_KEYS.includes(k) ? [`${path}.${k}`] : []),
      ...findForbiddenKeys(v, `${path}.${k}`),
    ]);
  }
  return [];
}
