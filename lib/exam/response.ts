// Cleans a student's exam response against the question's own ids, so a malformed or
// tampered request can only lose points: unknown ids are dropped, single-answer items keep at
// most one choice, and bow-tie groups keep at most the allowed number of picks.
import type { BankQuestion, BowTieResponse, ChoiceResponse, ClozeResponse, HighlightResponse, MatrixResponse, StudentResponse } from '@/lib/questions/bank';

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const record = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const unique = (xs: string[]) => [...new Set(xs)];

export function sanitizeResponse(q: BankQuestion, raw: unknown): StudentResponse {
  const r = record(raw);
  switch (q.item_type) {
    case 'single_best_answer': {
      const ids = new Set((q.response as ChoiceResponse).options.map(o => o.id));
      const picked = unique(strings(r.selected)).filter(id => ids.has(id));
      return { selected: picked.length === 1 ? picked : [] };
    }
    case 'multiple_response': {
      const ids = new Set((q.response as ChoiceResponse).options.map(o => o.id));
      return { selected: unique(strings(r.selected)).filter(id => ids.has(id)) };
    }
    case 'matrix_grid': {
      const m = q.response as MatrixResponse;
      const given = record(r.matrix);
      const matrix: Record<string, string> = {};
      for (const row of m.rows) {
        const v = given[row.id];
        if (typeof v === 'string' && m.columns.includes(v)) matrix[row.id] = v;
      }
      return { matrix };
    }
    case 'drop_down_cloze': {
      const c = q.response as ClozeResponse;
      const given = record(r.blanks);
      const blanks: Record<string, string> = {};
      for (const b of c.blanks) {
        const v = given[b.id];
        if (typeof v === 'string' && b.options.includes(v)) blanks[b.id] = v;
      }
      return { blanks };
    }
    case 'highlight': {
      const ids = new Set((q.response as HighlightResponse).segments.map(s => s.id));
      return { highlights: unique(strings(r.highlights)).filter(id => ids.has(id)) };
    }
    case 'bow_tie': {
      const given = record(r.groups);
      const groups: Record<string, string[]> = {};
      for (const g of (q.response as BowTieResponse).groups) {
        const ids = new Set(g.options.map(o => o.id));
        groups[g.id] = unique(strings(given[g.id])).filter(id => ids.has(id)).slice(0, g.pick);
      }
      return { groups };
    }
  }
}

export function isEmptyResponse(r: StudentResponse) {
  return !(r.selected?.length || Object.keys(r.matrix ?? {}).length || Object.keys(r.blanks ?? {}).length
    || r.highlights?.length || Object.values(r.groups ?? {}).some(g => g.length));
}
