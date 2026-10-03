// Question bank v2: native response structures, display-time shuffling and scoring.
// Answers are always recorded by stable option/row/segment ids (content), never by the
// letter a student saw, so shuffling can never move the key.

export type ItemType = 'single_best_answer' | 'multiple_response' | 'matrix_grid' | 'drop_down_cloze' | 'highlight' | 'bow_tie';

export type ChoiceOption = { id: string; text: string; correct: boolean };
export type ChoiceResponse = { options: ChoiceOption[]; shuffle: boolean };
export type MatrixResponse = { columns: string[]; rows: { id: string; text: string; correct: string }[] };
export type ClozeResponse = { template: string; blanks: { id: string; options: string[]; correct: string }[] };
export type HighlightResponse = { segments: { id: string; text: string; correct: boolean }[] };
export type BowTieResponse = { groups: { id: string; label: string; pick: number; options: ChoiceOption[] }[] };
export type ResponseConfig = ChoiceResponse | MatrixResponse | ClozeResponse | HighlightResponse | BowTieResponse;

export type Exhibit = { label: string; content: string };
export type CaseStudy = { id: string; title: string; scenario: string; exhibits: Exhibit[] };

export type BankQuestion = {
  id: string;
  source_id: string;
  track: 'rn' | 'pn';
  set_number: number;
  client_need: string;
  topic: string;
  system: string;
  discipline: string;
  item_type: ItemType;
  stem: string;
  response: ResponseConfig;
  rationale: string;
  answer_summary: string | null;
  scoring: string;
  case_id: string | null;
  case_sequence: number | null;
  clinical_judgment_step: string | null;
  status: string;
};

export const QUESTION_COLUMNS = 'id,source_id,track,set_number,client_need,topic,system,discipline,item_type,stem,response,rationale,answer_summary,scoring,case_id,case_sequence,clinical_judgment_step,status';

export type StudentResponse = {
  selected?: string[];                    // option ids (MC, SATA)
  matrix?: Record<string, string>;        // row id -> column label
  blanks?: Record<string, string>;        // blank id -> chosen option text
  highlights?: string[];                  // segment ids
  groups?: Record<string, string[]>;      // bow-tie group id -> option ids
};

export const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  single_best_answer: 'Multiple choice',
  multiple_response: 'Select all that apply',
  matrix_grid: 'Matrix',
  drop_down_cloze: 'Drop-down cloze',
  highlight: 'Highlight',
  bow_tie: 'Bow-tie',
};

// ---------- deterministic shuffling ----------
function hashSeed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffled<T>(items: T[], seed: string): T[] {
  const out = [...items], next = rng(hashSeed(seed));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Display order for a question in one practice session. `seed` changes per session so the
// key position varies, but stays fixed while the student works the item and reviews it.
export function displayResponse(q: BankQuestion, seed: string): ResponseConfig {
  const s = seed + ':' + q.source_id;
  switch (q.item_type) {
    case 'single_best_answer':
    case 'multiple_response': {
      const r = q.response as ChoiceResponse;
      return r.shuffle ? { ...r, options: shuffled(r.options, s) } : r;
    }
    case 'bow_tie': {
      const r = q.response as BowTieResponse;
      return { groups: r.groups.map(g => ({ ...g, options: shuffled(g.options, s + g.id) })) };
    }
    case 'drop_down_cloze': {
      const r = q.response as ClozeResponse;
      return { ...r, blanks: r.blanks.map(b => ({ ...b, options: shuffled(b.options, s + b.id) })) };
    }
    default:
      return q.response; // matrix rows and highlight passages keep their clinical order
  }
}

export const optionLetter = (index: number) => String.fromCharCode(65 + index);

// ---------- practice sessions ----------
// "NGN Clinical Judgment" is not a stored discipline: it is a cross-cutting view of every case.
export const CASE_STUDY_CATEGORY = 'NGN Clinical Judgment';

// A session is a list of units. A standalone question is one unit; an NGN case is one
// indivisible unit holding all of its items in case_sequence order. Only units are shuffled,
// so a case is never split, reordered or interleaved, and a mixed session can only ever
// contain whole cases. Cases with a missing item are left out rather than shown partially.
export type SessionUnit = { key: string; caseId: string | null; questions: BankQuestion[] };

export function buildSession(rows: BankQuestion[], seed: string, caseSizes: Record<string, number>): SessionUnit[] {
  const cases = new Map<string, BankQuestion[]>();
  const units: SessionUnit[] = [];
  for (const q of rows) {
    if (!q.case_id) units.push({ key: q.source_id, caseId: null, questions: [q] });
    else if (!cases.has(q.case_id)) cases.set(q.case_id, [q]);
    else if (!cases.get(q.case_id)!.some(x => x.source_id === q.source_id)) cases.get(q.case_id)!.push(q);
  }
  for (const [caseId, items] of cases) {
    items.sort((a, b) => (a.case_sequence ?? 0) - (b.case_sequence ?? 0));
    const complete = items.length === caseSizes[caseId] && items.every((q, n) => q.case_sequence === n + 1);
    if (complete) units.push({ key: caseId, caseId, questions: items });
  }
  return shuffled(units.sort((a, b) => a.key.localeCompare(b.key)), seed + ':units');
}

// ---------- completeness and scoring ----------
export function isComplete(q: BankQuestion, r: StudentResponse) {
  switch (q.item_type) {
    case 'single_best_answer': return (r.selected?.length ?? 0) === 1;
    case 'multiple_response': return (r.selected?.length ?? 0) > 0;
    case 'matrix_grid': return (q.response as MatrixResponse).rows.every(row => r.matrix?.[row.id]);
    case 'drop_down_cloze': return (q.response as ClozeResponse).blanks.every(b => r.blanks?.[b.id]);
    case 'highlight': return (r.highlights?.length ?? 0) > 0;
    case 'bow_tie': return (q.response as BowTieResponse).groups.every(g => (r.groups?.[g.id]?.length ?? 0) === g.pick);
  }
}

export type Score = { earned: number; possible: number; isCorrect: boolean };

// NCLEX NGN scoring rules: 0/1 for single answer; +/- for SATA and highlight (floor 0);
// 0/1 per row, blank or bow-tie selection.
export function scoreQuestion(q: BankQuestion, r: StudentResponse): Score {
  const done = (earned: number, possible: number): Score => ({ earned: Math.max(0, earned), possible, isCorrect: earned === possible });
  switch (q.item_type) {
    case 'single_best_answer': {
      const key = (q.response as ChoiceResponse).options.find(o => o.correct)?.id;
      return done(r.selected?.[0] === key ? 1 : 0, 1);
    }
    case 'multiple_response': {
      const opts = (q.response as ChoiceResponse).options;
      const correct = new Set(opts.filter(o => o.correct).map(o => o.id));
      let earned = 0;
      for (const id of r.selected ?? []) earned += correct.has(id) ? 1 : -1;
      const exact = (r.selected?.length ?? 0) === correct.size && (r.selected ?? []).every(id => correct.has(id));
      return { earned: Math.max(0, earned), possible: correct.size, isCorrect: exact };
    }
    case 'matrix_grid': {
      const rows = (q.response as MatrixResponse).rows;
      return done(rows.filter(row => r.matrix?.[row.id] === row.correct).length, rows.length);
    }
    case 'drop_down_cloze': {
      const blanks = (q.response as ClozeResponse).blanks;
      return done(blanks.filter(b => r.blanks?.[b.id] === b.correct).length, blanks.length);
    }
    case 'highlight': {
      const segs = (q.response as HighlightResponse).segments;
      const correct = new Set(segs.filter(s => s.correct).map(s => s.id));
      let earned = 0;
      for (const id of r.highlights ?? []) earned += correct.has(id) ? 1 : -1;
      const exact = (r.highlights?.length ?? 0) === correct.size && (r.highlights ?? []).every(id => correct.has(id));
      return { earned: Math.max(0, earned), possible: correct.size, isCorrect: exact };
    }
    case 'bow_tie': {
      const groups = (q.response as BowTieResponse).groups;
      let earned = 0, possible = 0;
      for (const g of groups) {
        possible += g.pick;
        const correct = new Set(g.options.filter(o => o.correct).map(o => o.id));
        earned += (r.groups?.[g.id] ?? []).filter(id => correct.has(id)).length;
      }
      return done(earned, possible);
    }
  }
}

// Plain-language answer key, used by the AI tutor and audio lesson (never letter-based).
export function describeKey(q: BankQuestion): string {
  switch (q.item_type) {
    case 'single_best_answer':
    case 'multiple_response':
      return (q.response as ChoiceResponse).options.filter(o => o.correct).map(o => o.text).join('; ');
    case 'matrix_grid':
      return (q.response as MatrixResponse).rows.map(r => `${r.text}: ${r.correct}`).join('; ');
    case 'drop_down_cloze':
      return (q.response as ClozeResponse).blanks.map(b => b.correct).join('; ');
    case 'highlight':
      return (q.response as HighlightResponse).segments.filter(s => s.correct).map(s => s.text).join('; ');
    case 'bow_tie':
      return (q.response as BowTieResponse).groups.map(g => `${g.label}: ${g.options.filter(o => o.correct).map(o => o.text).join(', ')}`).join('; ');
  }
}
