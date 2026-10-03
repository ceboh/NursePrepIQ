// Checks content revisions against the source bank.
//   node scripts/bank/check-revisions.mjs              check, report per set, exit 1 on failure
//   node scripts/bank/check-revisions.mjs --list 4-5   print items still over the length limit in sets 4-5
//   node scripts/bank/check-revisions.mjs --stats      answer-length statistics, source vs revised
//
// Fails if a revision names an unknown source_id or option key, touches a correct option,
// makes two options of a question identical, or if any single_best_answer item in a set
// covered by a revision file still has a correct option more than 15% longer than its
// longest distractor (unless listed in data/bank/revisions/skipped.json with a reason).
// Sets not yet covered by any revision file are reported as pending, not failed.
import { readFileSync, existsSync } from 'node:fs';
import { REVISIONS_DIR, applyRevisions, loadBanks, setsCovered } from './revisions.mjs';

export const LIMIT = 1.15;
const args = process.argv.slice(2);

const SKIPPED_FILE = new URL('skipped.json', REVISIONS_DIR);
const skipped = existsSync(SKIPPED_FILE) ? JSON.parse(readFileSync(SKIPPED_FILE, 'utf8')) : {};

const lengths = q => {
  const correct = q.options.find(o => o.is_correct).text.length;
  const longestDistractor = Math.max(...q.options.filter(o => !o.is_correct).map(o => o.text.length));
  return { correct, longestDistractor, ratio: correct / longestDistractor };
};
const overLimit = q => lengths(q).ratio > LIMIT;
const correctIsLongest = q => lengths(q).ratio >= 1;
const sba = banks => banks.flatMap(b => b.questions).filter(q => q.item_type === 'single_best_answer');

const source = sba(loadBanks());
const banks = loadBanks();
const { files, revised, errors } = applyRevisions(banks);
const items = sba(banks);
const sourceById = new Map(source.map(q => [q.source_id, q]));

const covered = new Set(files.flatMap(setsCovered));
for (const [id, reason] of Object.entries(skipped)) {
  if (id.startsWith('_')) continue;
  if (!sourceById.has(id)) errors.push(`skipped.json: unknown or non-single-answer source_id ${id}`);
  if (typeof reason !== 'string' || !reason.trim()) errors.push(`skipped.json: ${id} needs a reason`);
  if (revised.has(id)) errors.push(`skipped.json: ${id} is both revised and skipped`);
}

if (args[0] === '--stats') {
  for (const track of ['rn', 'pn']) {
    const before = source.filter(q => q.track === track), after = items.filter(q => q.track === track);
    const pct = (rows, f) => `${rows.filter(f).length}/${rows.length} (${(100 * rows.filter(f).length / rows.length).toFixed(1)}%)`;
    console.log(`${track.toUpperCase()} correct is longest: before ${pct(before, correctIsLongest)}, after ${pct(after, correctIsLongest)}; `
      + `>15% longer: before ${pct(before, overLimit)}, after ${pct(after, overLimit)}`);
  }
  process.exit(0);
}

if (args[0] === '--list') {
  const [from, to = from] = (args[1] || '').split('-').map(Number);
  for (const q of items.filter(q => q.set_number >= from && q.set_number <= to && overLimit(q) && !skipped[q.source_id])) {
    const l = lengths(q);
    console.log(`\n### ${q.source_id} (correct ${l.correct} chars, longest distractor ${l.longestDistractor}, ratio ${l.ratio.toFixed(2)})`);
    console.log(`STEM: ${q.stem}`);
    for (const o of q.options) console.log(`  ${o.key}${o.is_correct ? '*' : ' '} [${o.text.length}] ${o.text}`);
    console.log(`RATIONALE: ${q.rationale}`);
  }
  process.exit(0);
}

// ---------- check ----------
const remaining = [];
console.log(`revision files: ${files.length}; sets covered: ${[...covered].sort((a, b) => a - b).join(', ') || 'none'}; skipped items: ${Object.keys(skipped).filter(k => !k.startsWith('_')).length}`);
console.log('track set  checked  flagged  revised  skipped  remaining');
for (const track of ['rn', 'pn']) {
  for (let set = 1; set <= 40; set++) {
    const rows = items.filter(q => q.track === track && q.set_number === set);
    if (!rows.length) continue;
    const flagged = rows.filter(q => overLimit(sourceById.get(q.source_id)));
    const left = rows.filter(q => overLimit(q) && !skipped[q.source_id]);
    const status = covered.has(set) ? '' : '  (pending)';
    if (covered.has(set)) remaining.push(...left);
    console.log(`${track.padEnd(5)} ${String(set).padStart(3)}  ${String(rows.length).padStart(7)}  ${String(flagged.length).padStart(7)}  ${String(rows.filter(q => revised.has(q.source_id)).length).padStart(7)}  ${String(rows.filter(q => skipped[q.source_id]).length).padStart(7)}  ${String(left.length).padStart(9)}${status}`);
  }
}
for (const q of remaining) {
  const l = lengths(q);
  errors.push(`${q.source_id}: correct option is ${l.correct} chars vs longest distractor ${l.longestDistractor} (${Math.round((l.ratio - 1) * 100)}% longer); revise or add to skipped.json`);
}
if (errors.length) { console.error(`\nFAILED (${errors.length}):\n` + errors.join('\n')); process.exit(1); }
console.log('\nOK');
