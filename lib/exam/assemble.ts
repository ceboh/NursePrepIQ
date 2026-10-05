// Exam assembly: picks whole case studies and standalone items so the exam matches the
// blueprint (each client need within ±TOLERANCE items of its target), prefers items the
// student has not seen, and is fully reproducible from the session seed.
import { shuffled } from '@/lib/questions/bank';
import { BLUEPRINT, CASE_SIZE, FORMS, TOLERANCE, targetCounts, type ExamForm, type Track } from './blueprint';

export type PoolItem = { id: string; client_need: string; case_id: string | null; case_sequence: number | null; system: string };
export type AssembledItem = { question_id: string; case_id: string | null };

export type AssemblyReport = {
  track: Track;
  form: ExamForm;
  total: number;
  targets: Record<string, number>;
  counts: Record<string, number>;          // final items per client need
  caseCounts: Record<string, number>;      // of which from case studies
  caseIds: string[];
  casePositions: number[];                 // first position of each case block (1-based)
  unseenItems: number;
  seenItems: number;
};

export type Shortfall = { need: string; needed: number; available: number };

export class QuotaError extends Error {
  constructor(message: string, readonly details: { targets: Record<string, number>; shortfalls: Shortfall[]; cases?: { needed: number; available: number } }) {
    super(message);
    this.name = 'QuotaError';
  }
}

const byId = <T extends { id: string }>(a: T, b: T) => a.id.localeCompare(b.id);

export function assembleExam(args: { track: Track; form: ExamForm; seed: string; pool: PoolItem[]; seen: Set<string> }): { items: AssembledItem[]; report: AssemblyReport } {
  const { track, form, seed, pool, seen } = args;
  const { items: total, cases: caseTarget } = FORMS[form];
  const targets = targetCounts(track, total);
  const needs = Object.keys(BLUEPRINT[track]);
  const inBlueprint = (q: PoolItem) => needs.includes(q.client_need);

  // ---- whole case studies -------------------------------------------------
  const caseItems = new Map<string, PoolItem[]>();
  for (const q of pool) if (q.case_id) caseItems.set(q.case_id, [...(caseItems.get(q.case_id) ?? []), q]);
  type Case = { id: string; items: PoolItem[]; system: string; unseen: number; counts: Record<string, number> };
  const complete: Case[] = [];
  for (const [id, items] of caseItems) {
    items.sort((a, b) => (a.case_sequence ?? 0) - (b.case_sequence ?? 0));
    if (items.length !== CASE_SIZE || !items.every((q, n) => q.case_sequence === n + 1) || !items.every(inBlueprint)) continue;
    const counts: Record<string, number> = {};
    for (const q of items) counts[q.client_need] = (counts[q.client_need] ?? 0) + 1;
    complete.push({ id, items, system: items[0].system, unseen: items.filter(q => !seen.has(q.id)).length, counts });
  }
  // Seeded order, then fewest previously seen items first (Array.sort is stable).
  const candidates = shuffled(complete.sort(byId), seed + ':cases').sort((a, b) => b.unseen - a.unseen);

  // Standalone quotas that complete the blueprint for a given set of case items, or null when
  // some client need would land more than TOLERANCE items from its target.
  const standaloneTotal = total - caseTarget * CASE_SIZE;
  const allocate = (caseCounts: Record<string, number>): Record<string, number> | null => {
    const quota: Record<string, number> = Object.fromEntries(needs.map(n => [n, Math.max(0, targets[n] - caseCounts[n])]));
    const final = (n: string) => caseCounts[n] + quota[n] - targets[n];
    let excess = needs.reduce((a, n) => a + quota[n], 0) - standaloneTotal;
    // Cases that run over a target leave fewer standalone slots; take them one at a time from the
    // need that is currently closest to (or above) its target, larger targets first.
    while (excess > 0) {
      const n = needs.filter(x => quota[x] > 0).sort((a, b) => final(b) - final(a) || targets[b] - targets[a] || a.localeCompare(b))[0];
      if (!n) return null;
      quota[n]--;
      excess--;
    }
    while (excess < 0) {
      const n = needs.slice().sort((a, b) => final(a) - final(b) || targets[b] - targets[a] || a.localeCompare(b))[0];
      quota[n]++;
      excess++;
    }
    return needs.every(n => Math.abs(final(n)) <= TOLERANCE) ? quota : null;
  };
  const countsOf = (cases: Case[]) => {
    const counts: Record<string, number> = Object.fromEntries(needs.map(n => [n, 0]));
    for (const c of cases) for (const n of needs) counts[n] += c.counts[n] ?? 0;
    return counts;
  };

  // First feasible combination in candidate order (seeded, unseen first): a small depth-first
  // search, so heavy cases chosen early never leave the exam unable to meet the blueprint.
  const search = (distinctSystems: boolean): Case[] | null => {
    const chosen: Case[] = [];
    const extend = (start: number): boolean => {
      if (chosen.length === caseTarget) return allocate(countsOf(chosen)) !== null;
      for (let i = start; i < candidates.length; i++) {
        const c = candidates[i];
        if (distinctSystems && chosen.some(x => x.system === c.system)) continue;
        const counts = countsOf([...chosen, c]);
        if (needs.some(n => counts[n] > targets[n] + TOLERANCE)) continue;
        chosen.push(c);
        if (extend(i + 1)) return true;
        chosen.pop();
      }
      return false;
    };
    return extend(0) ? chosen : null;
  };
  const chosenCases = search(true) ?? search(false);
  if (!chosenCases) {
    throw new QuotaError(`Not enough complete case studies fit the ${form} ${track.toUpperCase()} exam blueprint`, {
      targets, shortfalls: [], cases: { needed: caseTarget, available: complete.length },
    });
  }
  const caseCounts = countsOf(chosenCases);
  const quota = allocate(caseCounts)!;
  const final = (n: string) => caseCounts[n] + quota[n] - targets[n];

  const standalonePool = new Map<string, PoolItem[]>(needs.map(n => [n, []]));
  for (const q of pool) if (!q.case_id && inBlueprint(q)) standalonePool.get(q.client_need)!.push(q);
  const shortfalls: Shortfall[] = needs
    .filter(n => quota[n] > standalonePool.get(n)!.length)
    .map(n => ({ need: n, needed: quota[n], available: standalonePool.get(n)!.length }));
  if (shortfalls.length) {
    throw new QuotaError(`The ${track.toUpperCase()} item pool cannot meet the ${form} exam blueprint`, { targets, shortfalls });
  }
  const off = needs.filter(n => Math.abs(final(n)) > TOLERANCE);
  if (off.length) {
    throw new QuotaError(`Could not keep every client need within ±${TOLERANCE} of its target`, {
      targets, shortfalls: off.map(n => ({ need: n, needed: targets[n], available: caseCounts[n] + quota[n] })),
    });
  }

  const standalone: PoolItem[] = [];
  for (const n of needs) {
    const ordered = shuffled(standalonePool.get(n)!.sort(byId), `${seed}:${n}`)
      .sort((a, b) => Number(seen.has(a.id)) - Number(seen.has(b.id)));
    standalone.push(...ordered.slice(0, quota[n]));
  }

  // ---- delivery order: shuffled standalone items, case blocks spread through the exam -------
  const order = shuffled(standalone.sort(byId), seed + ':order');
  const blocks = shuffled(chosenCases.sort(byId), seed + ':case-order');
  const items: AssembledItem[] = [];
  const casePositions: number[] = [];
  let next = 0;
  blocks.forEach((c, j) => {
    const upTo = Math.round(((j + 1) * order.length) / (blocks.length + 1));
    while (next < upTo) items.push({ question_id: order[next++].id, case_id: null });
    casePositions.push(items.length + 1);
    for (const q of c.items) items.push({ question_id: q.id, case_id: c.id });
  });
  while (next < order.length) items.push({ question_id: order[next++].id, case_id: null });

  const chosenIds = new Set(items.map(i => i.question_id));
  const unseenItems = pool.filter(q => chosenIds.has(q.id) && !seen.has(q.id)).length;
  return {
    items,
    report: {
      track, form, total, targets,
      counts: Object.fromEntries(needs.map(n => [n, caseCounts[n] + quota[n]])),
      caseCounts,
      caseIds: blocks.map(c => c.id),
      casePositions,
      unseenItems,
      seenItems: items.length - unseenItems,
    },
  };
}
