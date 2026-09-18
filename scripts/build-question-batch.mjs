#!/usr/bin/env node
/**
 * NursePrepIQ batch manifest builder.
 * Converts reviewed JSON question batches into deterministic SQL that ALWAYS
 * enters the bank as draft/pilot content. It never marks content production_validated.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';

const input=process.argv[2], output=process.argv[3];
if(!input||!output){console.error('Usage: node scripts/build-question-batch.mjs <batch.json> <output.sql>');process.exit(2)}
const data=JSON.parse(fs.readFileSync(input,'utf8'));
if(!Array.isArray(data.questions)||!data.questions.length) throw new Error('questions[] is required');

const allowedTracks=new Set(['rn','pn']);
const allowedDifficulty=new Set(['easy','moderate','hard']);
const required=['slug','stem','item_type','exam_tracks','subject','topic','client_need','clinical_judgment_step','difficulty','options','rationale','source_note'];
const esc=s=>String(s).replaceAll("'","''");
const arr=a=>`array[${a.map(x=>`'${esc(x)}'`).join(',')}]`;
const rows=[]; const seen=new Set();

for(const [i,q] of data.questions.entries()){
  for(const k of required) if(q[k]===undefined||q[k]===null||q[k]==='') throw new Error(`Question ${i+1}: missing ${k}`);
  if(seen.has(q.slug)) throw new Error(`Duplicate slug: ${q.slug}`); seen.add(q.slug);
  if(!Array.isArray(q.exam_tracks)||!q.exam_tracks.length||q.exam_tracks.some(x=>!allowedTracks.has(x))) throw new Error(`${q.slug}: exam_tracks must contain rn/pn`);
  if(!allowedDifficulty.has(q.difficulty)) throw new Error(`${q.slug}: invalid difficulty`);
  if(!Array.isArray(q.options)||q.options.length<2) throw new Error(`${q.slug}: at least 2 options required`);
  if(q.item_type==='single_best_answer' && q.options.filter(o=>o.is_correct).length!==1) throw new Error(`${q.slug}: SBA requires exactly one correct answer`);
  if(q.options.some(o=>!o.key||!o.text||!o.rationale)) throw new Error(`${q.slug}: every option needs key, text, rationale`);
  if(new Set(q.options.map(o=>o.key)).size!==q.options.length) throw new Error(`${q.slug}: duplicate option key`);
}

const header=`-- AUTO-GENERATED NursePrepIQ question batch
-- Batch: ${esc(data.batch_name||input)}
-- SHA256: ${crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')}
-- SAFETY: all imported content enters PILOT. Production promotion requires 0012 validation gates.

begin;
`;
let sql=header;
for(const q of data.questions){
 sql+=`
do $$
declare qid uuid;
begin
  insert into public.questions(slug,lifecycle_status,current_version)
  values ('${esc(q.slug)}','pilot',1)
  on conflict(slug) do update set updated_at=now()
  returning id into qid;

  insert into public.question_versions(
    question_id,version,stem,item_type,exam_tracks,subject,topic,client_need,
    clinical_judgment_step,difficulty,rationale,source_note,validation_status
  ) values (
    qid,1,'${esc(q.stem)}','${esc(q.item_type)}',${arr(q.exam_tracks)},'${esc(q.subject)}',
    '${esc(q.topic)}','${esc(q.client_need)}','${esc(q.clinical_judgment_step)}',
    '${esc(q.difficulty)}','${esc(q.rationale)}','${esc(q.source_note)}','pilot'
  ) on conflict(question_id,version) do nothing;
`;
 q.options.forEach((o,n)=>{sql+=`  insert into public.question_options(question_id,question_version,option_key,option_text,is_correct,rationale,display_order)
  values(qid,1,'${esc(o.key)}','${esc(o.text)}',${o.is_correct?'true':'false'},'${esc(o.rationale)}',${n+1})
  on conflict do nothing;
`;});
 sql+=`end $$;
`;
}
sql+=`commit;
`;
fs.writeFileSync(output,sql);
console.log(JSON.stringify({batch:data.batch_name||input,questions:data.questions.length,output,status:'pilot_only'},null,2));
