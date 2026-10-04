// Builds load-ready rows from data/bank/*.json, with data/bank/revisions/*.json and then
// data/bank/retags/*.json (client-need re-tags) applied on top.
//   node scripts/bank/build.mjs
// Writes data/bank/build/{questions,case_studies}.json plus review reports, and exits
// non-zero if any answer key cannot be resolved unambiguously.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { classifySystem, classifyDiscipline, CASE_CATEGORIES } from './taxonomy.mjs';
import { BANK_DIR as BANK, CLIENT_NEEDS, applyRevisions, applyRetags, loadBanks } from './revisions.mjs';

const OUT = new URL('build/', BANK);
const ITEM_TYPES = ['single_best_answer', 'multiple_response', 'matrix_grid', 'drop_down_cloze', 'highlight', 'bow_tie'];
// Manual answer-key decisions for items the matcher cannot resolve: { "<source_id>": { "segments": ["s1"] } | { "groups": [["opt text"]] } }
const overrides = existsSync(new URL('answer_key_overrides.json', BANK)) ? JSON.parse(readFileSync(new URL('answer_key_overrides.json', BANK), 'utf8')) : {};

const problems = [];
const review = [];

// ---------- text matching used to recover bow-tie and highlight keys ----------
const ABBREV = {
  loc: 'level consciousness', hr: 'heart rate', rr: 'respiratory rate', bp: 'blood pressure', t: 'temperature', temp: 'temperature', spo2: 'oxygen saturation', o2: 'oxygen', sat: 'saturation', k: 'potassium', na: 'sodium', mg: 'magnesium', wbc: 'white blood cell', hgb: 'hemoglobin', rn: 'nurse', vs: 'vital signs',
  // clinical interpretations used in highlight keys -> the measurement they refer to
  fever: 'temperature', hyperthermia: 'temperature', hypothermia: 'temperature', tachycardia: 'heart rate', bradycardia: 'heart rate', af: 'heart rate irregular atrial fibrillation',
  hypotension: 'blood pressure', hypertension: 'blood pressure', hypoxemia: 'oxygen saturation', tachypnea: 'respiratory rate', leukocytosis: 'white blood cell',
  hyperkalemia: 'potassium', hypocalcemia: 'calcium', hyperphosphatemia: 'phosphorus', hyperuricemia: 'uric acid', hypoglycemia: 'glucose', oliguria: 'urine output',
  drowsiness: 'drowsy', lethargy: 'lethargic', disorientation: 'oriented', confusion: 'confused', dysphagia: 'swallowing',
};
const STOP = new Set('a an the of and or to in on for with by at from is are be as that this than then its it his her their client resident patient nurse s per min mm hg mg dl meq l ml minute minutes'.split(' '));
function tokens(s) {
  const out = [];
  for (let w of String(s).toLowerCase().replace(/[“”"'’]/g, '').split(/[^a-z0-9.]+/)) {
    w = w.replace(/^\.+|\.+$/g, '');
    if (!w) continue;
    if (ABBREV[w]) { out.push(...ABBREV[w].split(' ')); continue; }
    if (STOP.has(w)) continue;
    out.push(/^\d/.test(w) ? w.replace(/,/g, '') : w.replace(/(ing|ed|es|s|ly)$/, ''));
  }
  return out;
}
function similarity(a, b) {
  const ta = tokens(a), tb = new Set(tokens(b));
  if (!ta.length) return 0;
  let s = 0, total = 0;
  for (const t of new Set(ta)) {
    const w = /^\d/.test(t) ? 3 : 1;
    total += w;
    if (tb.has(t) || [...tb].some(x => x.length > 4 && t.length > 4 && (x.startsWith(t) || t.startsWith(x)))) s += w;
  }
  return s / total;
}
// One-to-one assignment of each phrase to its best candidate (greedy on global best score).
function assign(phrases, candidates) {
  const pairs = [];
  phrases.forEach((p, i) => candidates.forEach((c, j) => pairs.push({ i, j, s: similarity(p, c) })));
  pairs.sort((a, b) => b.s - a.s);
  const usedP = new Set(), usedC = new Set(), result = new Array(phrases.length).fill(null);
  for (const { i, j, s } of pairs) {
    if (usedP.has(i) || usedC.has(j) || s < 0.34) continue;
    usedP.add(i); usedC.add(j); result[i] = { j, s };
  }
  return result;
}

// Order-preserving alignment: highlight keys list their findings in passage order, so each
// phrase maps to a later segment than the one before it. Maximises total similarity.
function alignInOrder(phrases, candidates) {
  const P = phrases.length, C = candidates.length;
  if (P > C) return null;
  const sim = phrases.map(p => candidates.map(c => similarity(p, c)));
  const dp = Array.from({ length: P + 1 }, () => new Array(C + 1).fill(-Infinity));
  for (let j = 0; j <= C; j++) dp[0][j] = 0;
  for (let i = 1; i <= P; i++) for (let j = i; j <= C; j++) dp[i][j] = Math.max(dp[i][j - 1], dp[i - 1][j - 1] + sim[i - 1][j - 1]);
  const out = new Array(P);
  for (let i = P, j = C; i > 0; j--) {
    if (dp[i][j] === dp[i][j - 1] && j - 1 >= i) continue;
    out[i - 1] = { j: j - 1, s: sim[i - 1][j - 1] };
    i--;
  }
  return out;
}

// ---------- per-type response builders ----------
const isNumericSet = opts => opts.every(o => /^[<>≤≥~]?\s*[\d.,/]+\s*[A-Za-z%/°μ.]*(\s*[A-Za-z/]+)?$/.test(o.text.trim()));
// Rationales that refer to an option by its letter ("the drainage volume in A") only make sense unshuffled.
const citesLetter = q => /\b(in|option|choice|answer)\s+[A-F]\b(?![.\w])/.test(q.rationale);

function choiceResponse(q) {
  const options = q.options.map((o, n) => ({ id: 'o' + (n + 1), text: o.text, correct: !!o.is_correct }));
  if (citesLetter(q)) {
    review.push({ id: q.source_id, kind: 'rationale', note: 'CITES-LETTER (not shuffled)', detail: q.rationale });
    return { options, shuffle: false };
  }
  const nCorrect = options.filter(o => o.correct).length;
  if (q.item_type === 'single_best_answer' && nCorrect !== 1) problems.push(`${q.source_id}: single-answer item has ${nCorrect} correct options`);
  if (q.item_type === 'multiple_response' && nCorrect < 1) problems.push(`${q.source_id}: SATA item has no correct options`);
  return { options, shuffle: !isNumericSet(q.options) };
}

function matrixResponse(q) {
  const rows = q.rows.map(r => ({ id: r.id, text: r.text, correct: r.correct_column }));
  for (const r of rows) if (!q.columns.includes(r.correct)) problems.push(`${q.source_id}: matrix row ${r.id} key "${r.correct}" is not a column`);
  return { columns: q.columns, rows };
}

function clozeResponse(q) {
  for (const b of q.blanks) if (!b.options.includes(b.correct)) problems.push(`${q.source_id}: blank ${b.id} key not among options`);
  const ids = [...q.template.matchAll(/___(\w+)___/g)].map(m => m[1]);
  if (ids.join() !== q.blanks.map(b => b.id).join()) problems.push(`${q.source_id}: template blanks [${ids}] do not match blank ids [${q.blanks.map(b => b.id)}]`);
  return { template: q.template, blanks: q.blanks.map(b => ({ id: b.id, options: b.options, correct: b.correct })) };
}

function highlightResponse(q) {
  const segs = q.passage_segments;
  let correctIds;
  if (overrides[q.source_id]?.segments) {
    correctIds = new Set(overrides[q.source_id].segments);
    review.push({ id: q.source_id, kind: 'highlight', note: 'override', detail: [...correctIds].join(', ') });
  } else {
    const phrases = q.correct_text.split(/;\s*/).map(s => s.trim()).filter(Boolean);
    const got = alignInOrder(phrases, segs.map(s => s.text));
    correctIds = new Set();
    if (!got) problems.push(`${q.source_id}: ${phrases.length} key phrases but only ${segs.length} segments`);
    else got.forEach((m, i) => {
      correctIds.add(segs[m.j].id);
      review.push({ id: q.source_id, kind: 'highlight', note: m.s === 0 ? 'ORDER-ONLY' : m.s < 0.5 ? 'LOW-CONFIDENCE' : 'ok', detail: `"${phrases[i]}" -> ${segs[m.j].id} "${segs[m.j].text}" (${m.s.toFixed(2)})` });
    });
  }
  return { segments: segs.map(s => ({ id: s.id, text: s.text, correct: correctIds.has(s.id) })) };
}

function bowtieResponse(q) {
  const parts = {};
  for (const m of q.answer_summary.matchAll(/(Condition|Situation|Actions?|Monitor|Parameters?)\s*:\s*([^]*?)(?=\s*(?:Condition|Situation|Actions?|Monitor|Parameters?)\s*:|$)/g)) {
    parts[m[1].toLowerCase().replace(/s$/, '').replace('parameter', 'monitor').replace('situation', 'condition')] = m[2].replace(/\.\s*$/, '');
  }
  const groups = q.bowtie_groups.map((g, gi) => {
    const key = /condition|situation/i.test(g.label) ? 'condition' : /action/i.test(g.label) ? 'action' : 'monitor';
    const options = g.options.map((text, n) => ({ id: `g${gi + 1}o${n + 1}`, text, correct: false }));
    const ov = overrides[q.source_id]?.groups?.[gi];
    if (ov) {
      for (const o of options) o.correct = ov.includes(o.text);
      review.push({ id: q.source_id, kind: 'bow_tie', note: 'override', detail: `${g.label}: ${ov.join(' | ')}` });
    } else {
      const phrases = (parts[key] || '').split(/;\s*/).map(s => s.trim()).filter(Boolean);
      if (phrases.length !== g.pick) problems.push(`${q.source_id}: bow-tie "${g.label}" expects ${g.pick} answers, summary gives ${phrases.length}`);
      assign(phrases, g.options).forEach((m, i) => {
        if (!m) { problems.push(`${q.source_id}: bow-tie phrase "${phrases[i]}" matched no option in "${g.label}"`); return; }
        options[m.j].correct = true;
        review.push({ id: q.source_id, kind: 'bow_tie', note: m.s < 0.6 ? 'LOW-CONFIDENCE' : 'ok', detail: `${g.label}: "${phrases[i]}" -> "${g.options[m.j]}" (${m.s.toFixed(2)})` });
      });
    }
    if (options.filter(o => o.correct).length !== g.pick) problems.push(`${q.source_id}: bow-tie "${g.label}" resolved ${options.filter(o => o.correct).length} of ${g.pick} answers`);
    return { id: 'g' + (gi + 1), label: g.label, pick: g.pick, options };
  });
  return { groups };
}

const BUILDERS = { single_best_answer: choiceResponse, multiple_response: choiceResponse, matrix_grid: matrixResponse, drop_down_cloze: clozeResponse, highlight: highlightResponse, bow_tie: bowtieResponse };

// ---------- build ----------
// ---------- content revisions ----------
// data/bank/revisions/*.json applied on top of the source bank (see revisions.mjs). Any
// error stops the build before anything is written.
const banks = loadBanks();
{
  const { files, revised, errors } = applyRevisions(banks);
  if (errors.length) { console.error(`Revisions rejected (${errors.length}); nothing was built:\n` + errors.join('\n')); process.exit(1); }
  console.log(`revisions: ${files.length} file(s), ${revised.size} item(s) changed`);
  for (const [id, changes] of revised) console.log(`  ${id}: ${changes.map(c => c.key).join(', ')} (${[...new Set(changes.map(c => c.file))].join(', ')})`);
}
// ---------- client-need re-tags ----------
// data/bank/retags/*.json applied after revisions (see revisions.mjs). Unknown ids or a client
// need that does not exist for the item's track stop the build before anything is written.
{
  const { files, retagged, errors } = applyRetags(banks);
  if (errors.length) { console.error(`Re-tags rejected (${errors.length}); nothing was built:\n` + errors.join('\n')); process.exit(1); }
  console.log(`re-tags: ${files.length} file(s), ${retagged.size} item(s) re-tagged`);
  for (const [id, t] of retagged) console.log(`  ${id}: ${t.from} -> ${t.to} (${t.file})`);
}

const questions = [], caseStudies = [], taxonomy = [];
for (const bank of banks) {
  for (const c of bank.case_studies) {
    const category = CASE_CATEGORIES.get(c.case_id);
    if (!category) { problems.push(`${c.case_id}: missing from case_study_categories.json`); continue; }
    caseStudies.push({ id: c.case_id, track: c.track, set_number: c.set_number, title: category.title, scenario: c.scenario, exhibits: c.exhibits });
  }
  for (const q of bank.questions) {
    if (q.track !== bank.track) problems.push(`${q.source_id}: track ${q.track} in ${bank.track} file`);
    if (!CLIENT_NEEDS[q.track]?.includes(q.client_need)) problems.push(`${q.source_id}: "${q.client_need}" is not a ${q.track.toUpperCase()} client need`);
    if (!ITEM_TYPES.includes(q.item_type)) { problems.push(`${q.source_id}: unknown item type ${q.item_type}`); continue; }
    const response = BUILDERS[q.item_type](q);
    const { system, basis } = classifySystem(q);
    const discipline = classifyDiscipline(q);
    taxonomy.push([q.source_id, q.track, q.set_number, q.topic, system, basis, discipline]);
    const row = {
      source_id: q.source_id, track: q.track, set_number: q.set_number, set_title: q.set_title, source_item_number: q.source_item_number,
      client_need: q.client_need, topic: q.topic, system, discipline, item_type: q.item_type, stem: q.stem, response,
      rationale: q.rationale, answer_summary: q.answer_summary, scoring: q.scoring,
      case_id: q.case_id ?? null, case_sequence: q.case_sequence ?? null, clinical_judgment_step: q.clinical_judgment_step ?? null,
      // source bank's hash is kept as provenance; content_hash below covers the revised text
      source_content_hash: q.content_hash, status: 'pilot',
    };
    // Hash of everything the loader writes, so taxonomy/key changes also trigger an update.
    row.content_hash = createHash('sha256').update(JSON.stringify(row)).digest('hex').slice(0, 32);
    questions.push(row);
  }
}

const ids = new Set();
for (const q of questions) { if (ids.has(q.source_id)) problems.push(`duplicate source_id ${q.source_id}`); ids.add(q.source_id); }
const caseIds = new Set(caseStudies.map(c => c.id));
for (const q of questions) if (q.case_id && !caseIds.has(q.case_id)) problems.push(`${q.source_id}: unknown case ${q.case_id}`);
// Cases are indivisible: sequence 1..n with no gaps, the exact items the category file lists,
// and one system and one discipline across all of them.
for (const c of CASE_CATEGORIES.values()) {
  const items = questions.filter(q => q.case_id === c.case_id).sort((a, b) => a.case_sequence - b.case_sequence);
  if (items.map(q => q.case_sequence).join() !== items.map((_, n) => n + 1).join()) problems.push(`${c.case_id}: case_sequence is not 1..${items.length}`);
  if (items.map(q => q.source_id).join() !== c.items.join()) problems.push(`${c.case_id}: bank items [${items.map(q => q.source_id)}] differ from category file [${c.items}]`);
  if (new Set(items.map(q => q.system)).size !== 1 || new Set(items.map(q => q.discipline)).size !== 1) problems.push(`${c.case_id}: items span more than one system or discipline`);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(new URL('questions.json', OUT), JSON.stringify(questions));
writeFileSync(new URL('case_studies.json', OUT), JSON.stringify(caseStudies));
const csv = v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
writeFileSync(new URL('taxonomy_review.csv', OUT), ['source_id,track,set,topic,system,system_basis,discipline', ...taxonomy.map(r => r.map(csv).join(','))].join('\n') + '\n');
writeFileSync(new URL('answer_key_review.csv', OUT), ['source_id,kind,status,detail', ...review.map(r => [r.id, r.kind, r.note, r.detail].map(csv).join(','))].join('\n') + '\n');

const count = (rows, f) => rows.reduce((m, r) => (m[f(r)] = (m[f(r)] || 0) + 1, m), {});
console.log('questions', questions.length, count(questions, q => q.track));
console.log('case studies', caseStudies.length);
console.log('item types', JSON.stringify(count(questions, q => q.track + ':' + q.item_type)));
console.log('low-confidence key matches', review.filter(r => r.note === 'LOW-CONFIDENCE').length);
if (problems.length) { console.error(`\n${problems.length} problem(s):\n` + problems.join('\n')); process.exit(1); }
console.log('OK');
