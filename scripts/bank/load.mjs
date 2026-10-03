// Loads data/bank/build/*.json into Supabase (run scripts/bank/build.mjs first).
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/bank/load.mjs [--dry-run] [--retire-missing]
// Upserts by source_id, skips rows whose content_hash is unchanged, then verifies that the
// database matches the build exactly (by track, system, discipline and item type).
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required'); process.exit(1); }

const OUT = new URL('../../data/bank/build/', import.meta.url);
const questions = JSON.parse(readFileSync(new URL('questions.json', OUT), 'utf8'));
const caseStudies = JSON.parse(readFileSync(new URL('case_studies.json', OUT), 'utf8'));
const db = createClient(url, key, { auth: { persistSession: false } });

async function selectAll(table, columns) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(columns).order('id').range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}
async function upsert(table, rows, onConflict) {
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await db.from(table).upsert(rows.slice(i, i + 200), { onConflict });
    if (error) throw new Error(`${table} upsert: ${error.message}`);
  }
}

// Case studies first (questions reference them).
const existingCases = new Map((await selectAll('case_studies', 'id,title,scenario,exhibits')).map(c => [c.id, c]));
const changedCases = caseStudies.filter(c => {
  const e = existingCases.get(c.id);
  return !e || e.title !== c.title || e.scenario !== c.scenario || JSON.stringify(e.exhibits) !== JSON.stringify(c.exhibits);
});

const existing = new Map((await selectAll('questions', 'id,source_id,content_hash,status')).map(q => [q.source_id, q]));
const changed = questions.filter(q => existing.get(q.source_id)?.content_hash !== q.content_hash);
const bankIds = new Set(questions.map(q => q.source_id));
const missing = [...existing.values()].filter(q => !bankIds.has(q.source_id) && q.status !== 'retired');

console.log(`case studies: ${caseStudies.length} in bank, ${changedCases.length} new/changed`);
console.log(`questions: ${questions.length} in bank, ${existing.size} in db, ${changed.length} new/changed, ${missing.length} in db but not in bank`);
if (dryRun) { console.log('dry run: nothing written'); process.exit(0); }

await upsert('case_studies', changedCases, 'id');
// Status is managed in the database after first load; don't overwrite a promotion on reload.
await upsert('questions', changed.map(q => existing.has(q.source_id) ? (({ status, ...rest }) => rest)(q) : q), 'source_id');
if (missing.length && args.has('--retire-missing')) {
  const { error } = await db.from('questions').update({ status: 'retired' }).in('source_id', missing.map(q => q.source_id));
  if (error) throw new Error(`retire: ${error.message}`);
  console.log(`retired ${missing.length} questions no longer in the bank`);
}

// ---------- verification ----------
const live = (await selectAll('questions', 'id,source_id,track,system,discipline,item_type,content_hash')).filter(q => bankIds.has(q.source_id));
const tally = (rows, f) => rows.reduce((m, r) => (m[f(r)] = (m[f(r)] || 0) + 1, m), {});
const failures = [];
for (const [label, f] of [['track', q => q.track], ['track/system', q => q.track + ' / ' + q.system], ['track/discipline', q => q.track + ' / ' + q.discipline], ['track/item_type', q => q.track + ' / ' + q.item_type]]) {
  const want = tally(questions, f), got = tally(live, f);
  for (const k of new Set([...Object.keys(want), ...Object.keys(got)])) if (want[k] !== got[k]) failures.push(`${label} ${k}: bank ${want[k] || 0}, db ${got[k] || 0}`);
}
const hashes = new Map(live.map(q => [q.source_id, q.content_hash]));
const stale = questions.filter(q => hashes.get(q.source_id) !== q.content_hash);
if (stale.length) failures.push(`${stale.length} questions have a different content_hash in the db (e.g. ${stale[0].source_id})`);
const { count: caseCount } = await db.from('case_studies').select('id', { count: 'exact', head: true });
if (caseCount < caseStudies.length) failures.push(`case_studies: bank ${caseStudies.length}, db ${caseCount}`);

if (failures.length) { console.error('VERIFY FAILED\n' + failures.join('\n')); process.exit(1); }
console.log(`verified: ${live.length} questions and ${caseStudies.length} case studies match the bank`);
console.table(tally(live, q => q.track + ' / ' + q.item_type));
