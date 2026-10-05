import { describe, expect, it } from 'vitest';
import type { BowTieResponse, CaseStudy, ChoiceResponse, ClozeResponse } from '@/lib/questions/bank';
import { buildReview, type StoredItem } from '@/lib/exam/review';
import { publicDisplay } from '@/lib/exam/public';
import { maxPoints, scoreExamResponse } from '@/lib/exam/score';
import { allTypes, bowtie, cloze, mc, sata } from './fixtures';

const seed = 'review-seed';
const caseStudy: CaseStudy = { id: 'case-1', title: 'Sepsis in a 70-year-old', scenario: 'Scenario', exhibits: [{ label: 'Vitals', content: 'HR 120' }] };
const caseQ = { ...mc, id: 'case-q', source_id: 'T-CASE', case_id: 'case-1', case_sequence: 4, clinical_judgment_step: 'Generate solutions' };

const stored = (position: number, question_id: string, over: Partial<StoredItem> = {}): StoredItem => ({
  position, question_id, case_id: null, response: null, points_earned: null, max_score: null,
  is_correct: null, time_spent_seconds: null, answered_at: null, ...over,
});

describe('buildReview', () => {
  it('returns items in exam order with the answer key and rationale', () => {
    const items = allTypes.map((q, i) => stored(allTypes.length - i, q.id));
    const review = buildReview(seed, items, allTypes, []);
    expect(review.map(r => r.position)).toEqual([1, 2, 3, 4, 5, 6]);
    for (const r of review) {
      expect(r.answerKey.length).toBeGreaterThan(0);
      expect(r.rationale).toBe('Because.');
    }
  });

  it('shows options in the order the student saw them during the exam', () => {
    const [m, s, c, b] = buildReview(seed, [stored(1, mc.id), stored(2, sata.id), stored(3, cloze.id), stored(4, bowtie.id)], [mc, sata, cloze, bowtie], []);
    const seen = (q: typeof mc) => (publicDisplay(q, seed) as { options: { text: string }[] }).options.map(o => o.text);
    expect((m.display as ChoiceResponse).options.map(o => o.text)).toEqual(seen(mc));
    expect((s.display as ChoiceResponse).options.map(o => o.text)).toEqual(seen(sata));
    const seenCloze = publicDisplay(cloze, seed) as { blanks: { options: string[] }[] };
    expect((c.display as ClozeResponse).blanks.map(x => x.options)).toEqual(seenCloze.blanks.map(x => x.options));
    const seenBowtie = publicDisplay(bowtie, seed) as { groups: { options: { text: string }[] }[] };
    expect((b.display as BowTieResponse).groups.map(g => g.options.map(o => o.text))).toEqual(seenBowtie.groups.map(g => g.options.map(o => o.text)));
  });

  it('carries the stored score for answered items and zero for unanswered ones', () => {
    const scored = scoreExamResponse(sata, { selected: ['s1', 's2', 's3'] });
    const review = buildReview(seed, [
      stored(1, sata.id, { response: scored.response, points_earned: String(scored.earned), max_score: String(scored.possible), is_correct: scored.isCorrect, answered_at: '2026-10-05T00:00:00Z', time_spent_seconds: 42 }),
      stored(2, mc.id),
    ], [sata, mc], []);
    expect(review[0]).toMatchObject({ answered: true, earned: scored.earned, possible: scored.possible, isCorrect: false, timeSpentSeconds: 42 });
    expect(review[0].response.selected).toEqual(['s1', 's2', 's3']);
    expect(review[1]).toMatchObject({ answered: false, earned: 0, possible: maxPoints(mc), isCorrect: false, response: {} });
  });

  it('attaches the case, including its title, once the exam is over', () => {
    const [r] = buildReview(seed, [stored(1, caseQ.id, { case_id: 'case-1' })], [caseQ], [caseStudy]);
    expect(r.case).toMatchObject({ title: 'Sepsis in a 70-year-old', step: 4, total: 6 });
    expect(r.judgmentStep).toBe('Generate solutions');
  });

  it('fails loudly when a question is missing', () => {
    expect(() => buildReview(seed, [stored(1, 'missing')], [mc], [])).toThrow(/missing/);
  });
});
