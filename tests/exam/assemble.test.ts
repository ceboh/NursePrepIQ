import { describe, expect, it } from 'vitest';
import { assembleExam, QuotaError, type PoolItem } from '@/lib/exam/assemble';
import { BLUEPRINT, FORMS, targetCounts, TOLERANCE, type Track } from '@/lib/exam/blueprint';

const SYSTEMS = ['Cardiovascular', 'Respiratory', 'Neurologic', 'Endocrine', 'Gastrointestinal', 'Renal & Urinary'];

// A synthetic pool shaped like the real bank: plenty of standalone items per client need and
// 40 six-item cases whose items lean toward Physiological Adaptation, as the RN cases do.
function pool(track: Track, standalonePerNeed = 60, cases = 40): PoolItem[] {
  const needs = Object.keys(BLUEPRINT[track]);
  const out: PoolItem[] = [];
  needs.forEach((need, n) => {
    for (let i = 0; i < standalonePerNeed; i++) out.push({ id: `${track}-s-${n}-${i}`, client_need: need, case_id: null, case_sequence: null, system: SYSTEMS[i % SYSTEMS.length] });
  });
  const pa = 'Physiological Adaptation';
  for (let c = 0; c < cases; c++) {
    const caseId = `${track}-case-${c}`;
    const caseNeeds = [pa, pa, needs[c % needs.length], pa, needs[(c + 3) % needs.length], needs[(c + 5) % needs.length]];
    caseNeeds.forEach((need, s) => out.push({ id: `${caseId}-${s + 1}`, client_need: need, case_id: caseId, case_sequence: s + 1, system: SYSTEMS[c % SYSTEMS.length] }));
  }
  return out;
}

const countByNeed = (ids: string[], p: PoolItem[]) => {
  const byId = new Map(p.map(q => [q.id, q]));
  const counts: Record<string, number> = {};
  for (const id of ids) counts[byId.get(id)!.client_need] = (counts[byId.get(id)!.client_need] ?? 0) + 1;
  return counts;
};

describe('blueprint targets', () => {
  it('sum to the exam length and follow the published weights', () => {
    expect(targetCounts('rn', 85)).toEqual({
      'Management of Care': 15, 'Safety and Infection Control': 11, 'Health Promotion and Maintenance': 8, 'Psychosocial Integrity': 8,
      'Basic Care and Comfort': 8, 'Pharmacological and Parenteral Therapies': 13, 'Reduction of Risk Potential': 10, 'Physiological Adaptation': 12,
    });
    for (const track of ['rn', 'pn'] as Track[]) for (const n of [85, 40]) {
      expect(Object.values(targetCounts(track, n)).reduce((a, b) => a + b, 0)).toBe(n);
    }
  });
});

describe.each([['rn'], ['pn']] as [Track][])('%s exam assembly', track => {
  const p = pool(track);
  for (const form of ['full', 'short'] as const) {
    it(`${form}: right length, whole cases in order, blueprint within ±${TOLERANCE}`, () => {
      const { items, report } = assembleExam({ track, form, seed: 'seed-1', pool: p, seen: new Set() });
      expect(items).toHaveLength(FORMS[form].items);
      expect(new Set(items.map(i => i.question_id)).size).toBe(items.length);

      const caseIds = [...new Set(items.filter(i => i.case_id).map(i => i.case_id))];
      expect(caseIds).toHaveLength(FORMS[form].cases);
      for (const caseId of caseIds) {
        const positions = items.map((it, n) => (it.case_id === caseId ? n : -1)).filter(n => n >= 0);
        expect(positions).toHaveLength(6);
        expect(positions[5] - positions[0]).toBe(5);                                       // contiguous
        expect(positions.map(n => items[n].question_id)).toEqual([1, 2, 3, 4, 5, 6].map(s => `${caseId}-${s}`)); // in order
      }

      const counts = countByNeed(items.map(i => i.question_id), p);
      const targets = targetCounts(track, FORMS[form].items);
      for (const need of Object.keys(targets)) expect(Math.abs((counts[need] ?? 0) - targets[need])).toBeLessThanOrEqual(TOLERANCE);
      expect(report.counts).toEqual(Object.fromEntries(Object.keys(targets).map(n => [n, counts[n] ?? 0])));
    });
  }

  it('meets the blueprint for every seed, even when early cases are heavy in one need', () => {
    for (let i = 0; i < 50; i++) for (const form of ['full', 'short'] as const) {
      const { items, report } = assembleExam({ track, form, seed: `stress-${i}`, pool: p, seen: new Set() });
      expect(items).toHaveLength(FORMS[form].items);
      for (const need of Object.keys(report.targets)) expect(Math.abs(report.counts[need] - report.targets[need])).toBeLessThanOrEqual(TOLERANCE);
    }
  });

  it('spreads case blocks through the exam instead of bunching them', () => {
    const { report } = assembleExam({ track, form: 'full', seed: 'spread', pool: p, seen: new Set() });
    expect(report.casePositions).toHaveLength(3);
    expect(report.casePositions[0]).toBeGreaterThan(10);
    expect(report.casePositions[1] - report.casePositions[0]).toBeGreaterThan(15);
    expect(report.casePositions[2] - report.casePositions[1]).toBeGreaterThan(15);
  });

  it('is reproducible from the seed and varies between seeds', () => {
    const a = assembleExam({ track, form: 'full', seed: 'same', pool: p, seen: new Set() }).items;
    const b = assembleExam({ track, form: 'full', seed: 'same', pool: [...p].reverse(), seen: new Set() }).items;
    const c = assembleExam({ track, form: 'full', seed: 'other', pool: p, seen: new Set() }).items;
    expect(b).toEqual(a);
    expect(c).not.toEqual(a);
  });

  it('prefers items the student has not seen', () => {
    const first = assembleExam({ track, form: 'full', seed: 'one', pool: p, seen: new Set() });
    const seen = new Set(first.items.map(i => i.question_id));
    const second = assembleExam({ track, form: 'full', seed: 'one', pool: p, seen });
    expect(second.report.seenItems).toBe(0);
    expect(second.items.some(i => seen.has(i.question_id))).toBe(false);
  });

  it('reuses seen items only when the unseen pool runs out', () => {
    const small = pool(track, 16, 4);
    const seen = new Set(small.map(q => q.id));
    const { report } = assembleExam({ track, form: 'full', seed: 'x', pool: small, seen });
    expect(report.unseenItems).toBe(0);
    expect(report.seenItems).toBe(85);
  });

  it('reports a quota it cannot meet instead of substituting', () => {
    const need = Object.keys(BLUEPRINT[track])[0];
    const thin = pool(track).filter(q => q.case_id || q.client_need !== need || Number(q.id.split('-').pop()) < 3);
    try {
      assembleExam({ track, form: 'full', seed: 'x', pool: thin, seen: new Set() });
      throw new Error('expected a QuotaError');
    } catch (e) {
      expect(e).toBeInstanceOf(QuotaError);
      expect((e as QuotaError).details.shortfalls.map(s => s.need)).toEqual([need]);
    }
  });

  it('reports missing case studies', () => {
    expect(() => assembleExam({ track, form: 'full', seed: 'x', pool: pool(track, 60, 2), seen: new Set() })).toThrow(QuotaError);
  });

  it('never uses a case that is missing an item', () => {
    const broken = pool(track).filter(q => !(q.case_id && q.case_sequence === 4));
    expect(() => assembleExam({ track, form: 'short', seed: 'x', pool: broken, seen: new Set() })).toThrow(/case studies/);
  });
});
