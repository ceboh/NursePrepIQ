// Writes a review of one re-tag batch.
//   node scripts/bank/review-retags.mjs 01   -> data/bank/retags/review/retags_01.md
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { RETAGS_DIR, applyRevisions, loadBanks, retagFiles } from './revisions.mjs';

const nn = String(process.argv[2] || '').padStart(2, '0');
const file = retagFiles().find(f => f === `retags_${nn}.json`);
if (!file) { console.error(`no re-tag file retags_${nn}.json`); process.exit(1); }

// "Old" is the client need after content revisions and all earlier re-tag files.
const banks = loadBanks();
applyRevisions(banks);
const byId = new Map(banks.flatMap(b => b.questions).map(q => [q.source_id, q]));
for (const earlier of retagFiles().filter(f => f < file)) {
  for (const [id, tag] of Object.entries(JSON.parse(readFileSync(new URL(earlier, RETAGS_DIR), 'utf8')))) {
    if (!id.startsWith('_')) byId.get(id).client_need = tag.client_need;
  }
}

const batch = JSON.parse(readFileSync(new URL(file, RETAGS_DIR), 'utf8'));
const ids = Object.keys(batch).filter(k => !k.startsWith('_'));
const cell = s => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const excerpt = (s, n = 140) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
const lines = [
  `# Re-tag batch ${nn}`,
  '',
  batch._comment || '',
  '',
  `Source file: \`${file}\` · ${ids.length} items (${ids.filter(i => i.startsWith('RN')).length} RN, ${ids.filter(i => i.startsWith('PN')).length} PN).`,
  '',
  '| Item | Stem (excerpt) | Old → new | Reason |',
  '|---|---|---|---|',
  ...ids.map(id => {
    const q = byId.get(id);
    return `| ${id} | ${cell(excerpt(q.stem))} | ${q.client_need} → ${batch[id].client_need} | ${cell(batch[id].reason)} |`;
  }),
];
const outDir = new URL('review/', RETAGS_DIR);
mkdirSync(outDir, { recursive: true });
writeFileSync(new URL(`retags_${nn}.md`, outDir), lines.join('\n') + '\n');
console.log(`wrote data/bank/retags/review/retags_${nn}.md (${ids.length} items)`);
