// Writes a full-text review of one additions file: every stem, option, key and rationale.
//   node scripts/bank/review-additions.mjs additions_rn_01   -> data/bank/additions/review/additions_rn_01.md
//   node scripts/bank/review-additions.mjs cases_pn_01       -> data/bank/additions/review/cases_pn_01.md
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { ADDITIONS_DIR, additionFiles } from './revisions.mjs';
import { CASE_CATEGORIES } from './taxonomy.mjs';

const name = String(process.argv[2] || '').replace(/\.json$/, '');
if (!additionFiles().includes(`${name}.json`)) { console.error(`no additions file ${name}.json`); process.exit(1); }
const data = JSON.parse(readFileSync(new URL(`${name}.json`, ADDITIONS_DIR), 'utf8'));
const TYPE = { single_best_answer: 'Multiple choice', multiple_response: 'Select all that apply', matrix_grid: 'Matrix', drop_down_cloze: 'Drop-down cloze', highlight: 'Highlight', bow_tie: 'Bow-tie' };

const count = (rows, f) => Object.entries(rows.reduce((m, r) => (m[f(r)] = (m[f(r)] || 0) + 1, m), {})).map(([k, v]) => `${k} ${v}`).join(', ');
const out = [`# ${name}`, ''];
if (data._comment) out.push(data._comment, '');
out.push(`${data.questions.length} items · client needs: ${count(data.questions, q => q.client_need)} · types: ${count(data.questions, q => TYPE[q.item_type])}`, '');

function item(q) {
  out.push(`### ${q.source_id} · ${TYPE[q.item_type]} · ${q.client_need}${q.clinical_judgment_step ? ` · ${q.clinical_judgment_step}` : ''}`, '');
  out.push(`**Topic:** ${q.topic}`, '', `**Stem:** ${q.stem}`, '');
  if (q.options) for (const o of q.options) out.push(`- ${o.is_correct ? '**✓ ' : ''}${o.key}. ${o.text}${o.is_correct ? '**' : ''}`);
  if (q.rows) {
    out.push(`| Row | ${q.columns.join(' | ')} |`, `|---|${q.columns.map(() => '---').join('|')}|`);
    for (const r of q.rows) out.push(`| ${r.text} | ${q.columns.map(c => (c === r.correct_column ? '✓' : '')).join(' | ')} |`);
  }
  if (q.blanks) {
    out.push(`Template: ${q.template}`, '');
    for (const b of q.blanks) out.push(`- Blank ${b.id}: ${b.options.map(o => (o === b.correct ? `**✓ ${o}**` : o)).join(' / ')}`);
  }
  if (q.passage_segments) {
    out.push(`Key (highlight): ${q.correct_text}`, '');
    for (const s of q.passage_segments) out.push(`- ${s.id}: ${s.text}`);
  }
  if (q.bowtie_groups) {
    out.push(`Key: ${q.answer_summary}`, '');
    for (const g of q.bowtie_groups) out.push(`- ${g.label}: ${g.options.join(' / ')}`);
  }
  out.push('', `**Answer:** ${q.answer_summary}`, '', `**Rationale:** ${q.rationale}`, '');
}

if (data.case_studies?.length) {
  for (const c of data.case_studies) {
    const cat = CASE_CATEGORIES.get(c.case_id);
    out.push(`## ${c.case_id}: ${cat?.title ?? '(missing from case_study_categories.json)'}`, '');
    if (cat) out.push(`System: ${cat.system} · Discipline: ${cat.discipline}`, '');
    out.push(`**Scenario:** ${c.scenario}`, '');
    for (const e of c.exhibits) out.push(`**${e.label}:** ${e.content}`, '');
    for (const q of data.questions.filter(q => q.case_id === c.case_id).sort((a, b) => a.case_sequence - b.case_sequence)) item(q);
  }
} else {
  for (const q of data.questions) item(q);
}

const outDir = new URL('review/', ADDITIONS_DIR);
mkdirSync(outDir, { recursive: true });
writeFileSync(new URL(`${name}.md`, outDir), out.join('\n') + '\n');
console.log(`wrote data/bank/additions/review/${name}.md (${data.questions.length} items)`);
