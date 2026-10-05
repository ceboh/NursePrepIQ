import { describe, expect, it } from 'vitest';
import { scoreQuestion, type ChoiceResponse } from '@/lib/questions/bank';
import { findForbiddenKeys, publicItem, tokenMap, unmaskResponse } from '@/lib/exam/public';
import { sanitizeResponse } from '@/lib/exam/response';
import { allTypes, bowtie, highlight, matrix, mc, sata } from './fixtures';

const item = (q: (typeof allTypes)[number], seed = 's') => publicItem({ q, seed, position: 1, total: 40, caseStudy: null, caseSize: 6 });

describe('in-exam item payload', () => {
  it('contains no correctness or identifying fields for any item type', () => {
    for (const q of allTypes) {
      const payload = publicItem({ q: { ...q, case_id: 'RN-S01-CASE', case_sequence: 2, clinical_judgment_step: 'Analyze cues' }, seed: 's', position: 5, total: 85, caseStudy: { scenario: 'Scenario', exhibits: [{ label: 'Vitals', content: 'HR 120' }] }, caseSize: 6 });
      expect(findForbiddenKeys(payload)).toEqual([]);
      const json = JSON.stringify(payload);
      expect(json).not.toContain('"correct"');
      expect(json).not.toContain(q.rationale);
      expect(json).not.toContain(q.source_id);
      expect(json).not.toContain('RN-S01-CASE');
    }
  });

  it('replaces stored option, row and segment ids with opaque per-session tokens', () => {
    const real = ['o1', 'o2', 'o3', 'o4', 's1', 's2', 'r1', 'r2', 'h1', 'h2', 'c1', 'a1', 'm1'];
    for (const q of allTypes) {
      const json = JSON.stringify(item(q).display);
      for (const id of real) expect(json).not.toContain(`"${id}"`);
    }
    // Tokens differ between sessions, so a token never identifies a key across exams.
    expect(tokenMap(mc, 'seed-a').get('o2')).not.toEqual(tokenMap(mc, 'seed-b').get('o2'));
    expect(new Set(tokenMap(sata, 's').values()).size).toBe(6);
  });

  it('keeps every option, row, blank and segment the student needs to answer', () => {
    const [m, s, mx, cz, hl, bt] = allTypes.map(q => item(q).display as any);
    expect(m.options).toHaveLength(4);
    expect(s.options).toHaveLength(6);
    expect(mx.columns).toEqual(['Expected', 'Report']);
    expect(mx.rows.map((r: any) => Object.keys(r).sort())).toEqual(Array(4).fill(['id', 'text']));
    expect(cz.blanks.map((b: any) => b.options.length)).toEqual([3, 3]);
    expect(hl.segments).toHaveLength(5);
    expect(bt.groups.map((g: any) => g.pick)).toEqual([1, 2, 2]);
  });

  it('shows the case scenario and exhibits but not the case title or id', () => {
    const p = publicItem({ q: { ...mc, case_id: 'PN-C03', case_sequence: 3, clinical_judgment_step: 'Prioritize hypotheses' }, seed: 's', position: 9, total: 40, caseStudy: { scenario: 'An 81-year-old resident...', exhibits: [{ label: 'Labs', content: 'Digoxin 2.8' }] }, caseSize: 6 });
    expect(p.case).toEqual({ scenario: 'An 81-year-old resident...', exhibits: [{ label: 'Labs', content: 'Digoxin 2.8' }], step: 3, total: 6, judgmentStep: 'Prioritize hypotheses' });
  });

  it('flags forbidden keys anywhere in a payload', () => {
    expect(findForbiddenKeys({ a: [{ b: { correct: true } }], rationale: 'x' })).toEqual(['$.a[0].b.correct', '$.rationale']);
  });
});

describe('mapping tokens back to stored ids', () => {
  const token = (q: (typeof allTypes)[number], text: string) => (item(q).display as any).options.find((o: any) => o.text === text).id;

  it('scores a choice clicked on the shuffled, tokenized display', () => {
    const r = sanitizeResponse(mc, unmaskResponse(mc, 's', { selected: [token(mc, 'Bravo')] }));
    expect(r).toEqual({ selected: ['o2'] });
    expect(scoreQuestion(mc, r).isCorrect).toBe(true);
    const keyIndex = (item(mc).display as ChoiceResponse).options.findIndex(o => o.text === 'Bravo');
    expect(keyIndex).toBeGreaterThanOrEqual(0);
  });

  it('maps matrix rows, highlight segments and bow-tie options', () => {
    const mx = item(matrix).display as any;
    const rowToken = (text: string) => mx.rows.find((r: any) => r.text === text).id;
    expect(unmaskResponse(matrix, 's', { matrix: { [rowToken('Row one')]: 'Expected', [rowToken('Row two')]: 'Report' } })).toEqual({ matrix: { r1: 'Expected', r2: 'Report' } });

    const segs = (item(highlight).display as any).segments;
    expect(unmaskResponse(highlight, 's', { highlights: segs.filter((x: any) => x.text.startsWith('HR')).map((x: any) => x.id) })).toEqual({ highlights: ['h1'] });

    const groups = (item(bowtie).display as any).groups;
    const shock = groups[0].options.find((o: any) => o.text === 'Shock').id;
    expect(unmaskResponse(bowtie, 's', { groups: { condition: [shock] } })).toEqual({ groups: { condition: ['c1'] } });
  });

  it('drops tokens from another session or question and raw stored ids', () => {
    expect(unmaskResponse(mc, 's', { selected: [token(mc, 'Bravo')] })).toEqual({ selected: ['o2'] });
    expect(unmaskResponse(mc, 'other-seed', { selected: [token(mc, 'Bravo')] })).toEqual({ selected: [] });
    expect(unmaskResponse(mc, 's', { selected: ['o2'] })).toEqual({ selected: [] });
    expect(unmaskResponse(mc, 's', null)).toEqual({});
  });
});
