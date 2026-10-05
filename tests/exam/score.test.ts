import { describe, expect, it } from 'vitest';
import { displayResponse, type BowTieResponse, type ChoiceResponse, type ClozeResponse } from '@/lib/questions/bank';
import { maxPoints, scoreExamResponse, summarize } from '@/lib/exam/score';
import { publicItem, unmaskResponse } from '@/lib/exam/public';
import { bowtie, cloze, highlight, matrix, mc, sata } from './fixtures';

describe('single best answer (0/1)', () => {
  it('gives 1 point for the key and 0 otherwise', () => {
    expect(scoreExamResponse(mc, { selected: ['o2'] })).toMatchObject({ earned: 1, possible: 1, score: 1, isCorrect: true });
    expect(scoreExamResponse(mc, { selected: ['o1'] })).toMatchObject({ earned: 0, possible: 1, score: 0, isCorrect: false });
    expect(scoreExamResponse(mc, { selected: ['o1', 'o2'] }).earned).toBe(0);
    expect(scoreExamResponse(mc, null).earned).toBe(0);
  });
  it('scores by option id, whatever order the options were shown in', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
      const shown = (displayResponse(mc, seed) as ChoiceResponse).options;
      const keyPosition = shown.findIndex(o => o.text === 'Bravo');
      expect(scoreExamResponse(mc, { selected: [shown[keyPosition].id] }).isCorrect).toBe(true);
      expect(scoreExamResponse(mc, { selected: [shown[(keyPosition + 1) % 4].id] }).isCorrect).toBe(false);
    }
  });
  it('actually shuffles the display for different seeds', () => {
    const orders = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(s => (displayResponse(mc, s) as ChoiceResponse).options.map(o => o.id).join()));
    expect(orders.size).toBeGreaterThan(1);
  });
});

describe('select all that apply (+/-, floor 0)', () => {
  it('adds a point for each correct choice and subtracts one for each wrong choice', () => {
    expect(scoreExamResponse(sata, { selected: ['s1', 's2', 's4'] })).toMatchObject({ earned: 3, possible: 3, isCorrect: true });
    expect(scoreExamResponse(sata, { selected: ['s1', 's2'] })).toMatchObject({ earned: 2, possible: 3, isCorrect: false });
    expect(scoreExamResponse(sata, { selected: ['s1', 's2', 's3'] })).toMatchObject({ earned: 1, possible: 3, isCorrect: false });
    expect(scoreExamResponse(sata, { selected: ['s3', 's5', 's1'] })).toMatchObject({ earned: 0, possible: 3 });
  });
  it('ignores duplicates and ids from other questions', () => {
    expect(scoreExamResponse(sata, { selected: ['s1', 's1', 's1', 'o2'] })).toMatchObject({ earned: 1 });
  });
});

describe('matrix (0/1 per row)', () => {
  it('scores each row against its column label', () => {
    const all = { r1: 'Expected', r2: 'Report', r3: 'Report', r4: 'Expected' };
    expect(scoreExamResponse(matrix, { matrix: all })).toMatchObject({ earned: 4, possible: 4, score: 1, isCorrect: true });
    expect(scoreExamResponse(matrix, { matrix: { ...all, r2: 'Expected' } })).toMatchObject({ earned: 3, possible: 4, score: 0.75 });
  });
});

describe('drop-down cloze (0/1 per blank)', () => {
  it('scores each blank by the chosen option text, whatever order the options were shown in', () => {
    expect(scoreExamResponse(cloze, { blanks: { '1': 'dehydration', '2': 'vomiting' } })).toMatchObject({ earned: 2, possible: 2, isCorrect: true });
    expect(scoreExamResponse(cloze, { blanks: { '1': 'dehydration', '2': 'fever' } })).toMatchObject({ earned: 1, possible: 2, score: 0.5 });
    const shown = (displayResponse(cloze, 'seed-y') as ClozeResponse).blanks;
    expect(scoreExamResponse(cloze, { blanks: { '1': shown[0].options.find(o => o === 'dehydration'), '2': 'vomiting' } }).isCorrect).toBe(true);
  });
});

describe('highlight (+/-, floor 0)', () => {
  it('rewards correct segments and penalizes extras', () => {
    expect(scoreExamResponse(highlight, { highlights: ['h1', 'h2', 'h5'] })).toMatchObject({ earned: 3, possible: 3, isCorrect: true });
    expect(scoreExamResponse(highlight, { highlights: ['h1', 'h2', 'h5', 'h3'] })).toMatchObject({ earned: 2, isCorrect: false });
    expect(scoreExamResponse(highlight, { highlights: ['h3', 'h4'] })).toMatchObject({ earned: 0 });
  });
});

describe('bow-tie (0/1 per selection)', () => {
  it('scores each selection in each group', () => {
    const full = { condition: ['c1'], actions: ['a1', 'a2'], monitor: ['m1', 'm2'] };
    expect(scoreExamResponse(bowtie, { groups: full })).toMatchObject({ earned: 5, possible: 5, isCorrect: true });
    expect(scoreExamResponse(bowtie, { groups: { ...full, actions: ['a1', 'a3'] } })).toMatchObject({ earned: 4, possible: 5 });
    expect(scoreExamResponse(bowtie, { groups: { ...full, actions: ['a1', 'a2', 'a3'] } })).toMatchObject({ earned: 5 });
  });
  it('maps shuffled group options by id', () => {
    const groups = (displayResponse(bowtie, 'seed-z') as BowTieResponse).groups;
    const pick = (gid: string, texts: string[]) => groups.find(g => g.id === gid)!.options.filter(o => texts.includes(o.text)).map(o => o.id);
    const response = { groups: { condition: pick('condition', ['Shock']), actions: pick('actions', ['Call for help', 'Lie flat']), monitor: pick('monitor', ['Heart rate', 'Level of consciousness']) } };
    expect(scoreExamResponse(bowtie, response).isCorrect).toBe(true);
  });
});

describe('end to end: tokenized, shuffled exam display -> server score', () => {
  // The student answers on the exam payload (shuffled, tokenized ids); the server unmasks and
  // scores. Every item type gets full credit for the key and less for a wrong answer.
  const seed = 'session-seed';
  const shown = (q: typeof mc) => publicItem({ q, seed, position: 1, total: 85, caseStudy: null, caseSize: 6 }).display as any;
  const byText = (list: { id: string; text: string }[], texts: string[]) => list.filter(o => texts.includes(o.text)).map(o => o.id);
  const score = (q: typeof mc, r: unknown) => scoreExamResponse(q, unmaskResponse(q, seed, r));

  it('scores every item type correctly through the token mapping', () => {
    expect(score(mc, { selected: byText(shown(mc).options, ['Bravo']) }).isCorrect).toBe(true);
    expect(score(mc, { selected: byText(shown(mc).options, ['Alpha']) }).earned).toBe(0);
    expect(score(sata, { selected: byText(shown(sata).options, ['One', 'Two', 'Four']) })).toMatchObject({ earned: 3, isCorrect: true });
    expect(score(sata, { selected: byText(shown(sata).options, ['One', 'Three']) })).toMatchObject({ earned: 0 });
    const rows = shown(matrix).rows;
    const answer = Object.fromEntries(rows.map((r: any) => [r.id, ({ 'Row one': 'Expected', 'Row two': 'Report', 'Row three': 'Report', 'Row four': 'Report' } as Record<string, string>)[r.text]]));
    expect(score(matrix, { matrix: answer })).toMatchObject({ earned: 3, possible: 4 });
    expect(score(cloze, { blanks: { '1': 'dehydration', '2': 'vomiting' } }).isCorrect).toBe(true);
    expect(score(highlight, { highlights: byText(shown(highlight).segments, ['HR 128', 'BP 84/50', 'Cool skin']) }).isCorrect).toBe(true);
    const g = shown(bowtie).groups;
    const grp = (i: number, texts: string[]) => byText(g[i].options, texts);
    expect(score(bowtie, { groups: { condition: grp(0, ['Shock']), actions: grp(1, ['Call for help', 'Walk']), monitor: grp(2, ['Heart rate', 'Level of consciousness']) } })).toMatchObject({ earned: 4, possible: 5 });
  });
});

describe('unanswered items and summary', () => {
  it('reports the points available on each item', () => {
    expect([mc, sata, matrix, cloze, highlight, bowtie].map(maxPoints)).toEqual([1, 3, 4, 2, 3, 5]);
  });
  it('adds partial-credit points into overall and category breakdowns', () => {
    const rows = [
      { q: mc, ...scoreExamResponse(mc, { selected: ['o2'] }), answered: true },
      { q: sata, ...scoreExamResponse(sata, { selected: ['s1'] }), answered: true },
      { q: { ...matrix, client_need: 'Management of Care', case_id: 'C1', clinical_judgment_step: 'Analyze cues' }, ...scoreExamResponse(matrix, { matrix: { r1: 'Expected', r2: 'Report' } }), answered: true },
      { q: cloze, earned: 0, possible: maxPoints(cloze), isCorrect: false, answered: false },
    ];
    const s = summarize(rows, { usedSeconds: 600, limitSeconds: 9000, endedBy: 'completed' });
    expect(s.overall).toMatchObject({ items: 4, correct: 1, earned: 4, possible: 10, percent: 40, answered: 3 });
    expect(s.byClientNeed['Physiological Adaptation']).toMatchObject({ items: 3, earned: 2, possible: 6 });
    expect(s.byClientNeed['Management of Care']).toMatchObject({ items: 1, earned: 2, possible: 4, percent: 50 });
    expect(s.byItemType.single_best_answer.percent).toBe(100);
    expect(Object.keys(s.byJudgmentStep)).toEqual(['Analyze cues']);
    expect(s.timeUsedSeconds).toBe(600);
  });
});
