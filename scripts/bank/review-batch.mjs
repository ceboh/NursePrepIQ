// Writes a before/after review of one revision batch.
//   node scripts/bank/review-batch.mjs 03   -> data/bank/revisions/review/batch03.md
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { REVISIONS_DIR, loadBanks, revisionFiles, setsCovered } from './revisions.mjs';

const nn = String(process.argv[2] || '').padStart(2, '0');
const file = revisionFiles().find(f => f.startsWith(`content_revisions_batch${nn}_`));
if (!file) { console.error(`no revision file for batch ${nn}`); process.exit(1); }

// "Before" is the bank as it stood before this batch: source plus all earlier batches.
const banks = loadBanks();
const byId = new Map(banks.flatMap(b => b.questions).map(q => [q.source_id, q]));
for (const earlier of revisionFiles().filter(f => f < file)) {
  for (const [id, changes] of Object.entries(JSON.parse(readFileSync(new URL(earlier, REVISIONS_DIR), 'utf8')))) {
    if (id.startsWith('_')) continue;
    for (const [key, text] of Object.entries(changes)) byId.get(id).options.find(o => o.key === key).text = text;
  }
}

const batch = JSON.parse(readFileSync(new URL(file, REVISIONS_DIR), 'utf8'));
const cell = s => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const excerpt = (s, n = 110) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
const ids = Object.keys(batch).filter(k => !k.startsWith('_'));
const lines = [
  `# Revision batch ${nn} (sets ${setsCovered(file).join(', ')})`,
  '',
  batch._comment || '',
  '',
  `Source file: \`${file}\` · ${ids.length} items (${ids.filter(i => i.startsWith('RN')).length} RN, ${ids.filter(i => i.startsWith('PN')).length} PN). Lengths are in characters.`,
  '',
  '| Item | Stem (excerpt) | Correct answer | Option | Before | After |',
  '|---|---|---|---|---|---|',
];
for (const id of ids) {
  const q = byId.get(id), correct = q.options.find(o => o.is_correct);
  Object.entries(batch[id]).forEach(([key, text], n) => {
    const old = q.options.find(o => o.key === key).text;
    lines.push(n === 0
      ? `| ${id} | ${cell(excerpt(q.stem))} | ${correct.key}. ${cell(correct.text)} (${correct.text.length}) | ${key} | ${cell(old)} (${old.length}) | ${cell(text)} (${text.length}) |`
      : `| | | | ${key} | ${cell(old)} (${old.length}) | ${cell(text)} (${text.length}) |`);
  });
}
const outDir = new URL('review/', REVISIONS_DIR);
mkdirSync(outDir, { recursive: true });
writeFileSync(new URL(`batch${nn}.md`, outDir), lines.join('\n') + '\n');
console.log(`wrote data/bank/revisions/review/batch${nn}.md (${ids.length} items)`);
