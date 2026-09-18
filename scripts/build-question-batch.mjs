#!/usr/bin/env node
/** NursePrepIQ safe batch builder. Output is always PILOT, never production. */
import fs from 'node:fs';
import crypto from 'node:crypto';
const input=process.argv[2],output=process.argv[3];
if(!input||!output){console.error('Usage: node scripts/build-question-batch.mjs <batch.json> <output.sql>');process.exit(2)}
const data=JSON.parse(fs.readFileSync(input,'utf8'));
if(!Array.isArray(data.questions)||!data.questions.length) throw new Error('questions[] is required');
const tracks=new Set(['rn','pn']), difficulties=new Set(['easy','medium','hard']);
const required=['slug','stem','item_type','exam_tracks','subject','topic','client_need','clinical_judgment_step','difficulty','options','rationale_correct','rationale_distractors','source_note'];
const esc=s=>String(s).replaceAll("'","''"), arr=a=>`array[${a.map(x=>`'${esc(x)}'`).join(',')}]::text[]`;
const seen=new Set();
for(const [i,q] of data.questions.entries()){
 for(const k of required) if(q[k]===undefined||q[k]===null||q[k]==='') throw new Error(`Question ${i+1}: missing ${k}`);
 if(seen.has(q.slug)) throw new Error(`Duplicate slug: ${q.slug}`); seen.add(q.slug);
 if(!Array.isArray(q.exam_tracks)||!q.exam_tracks.length||q.exam_tracks.some(x=>!tracks.has(x))) throw new Error(`${q.slug}: exam_tracks must contain rn/pn`);
 if(!difficulties.has(q.difficulty)) throw new Error(`${q.slug}: difficulty must be easy, medium, or hard`);
 if(!Array.isArray(q.options)||q.options.length<2) throw new Error(`${q.slug}: at least 2 options required`);
 if(q.item_type==='single_best_answer'&&q.options.filter(o=>o.is_correct).length!==1) throw new Error(`${q.slug}: SBA requires exactly one correct answer`);
 if(q.options.some(o=>!o.key||!o.text||!o.rationale)) throw new Error(`${q.slug}: every option needs key, text, rationale`);
 if(new Set(q.options.map(o=>o.key)).size!==q.options.length) throw new Error(`${q.slug}: duplicate option key`);
}
let sql=`-- AUTO-GENERATED NursePrepIQ question batch\n-- Batch: ${esc(data.batch_name||input)}\n-- SHA256: ${crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')}\n-- SAFETY: PILOT ONLY. Promotion requires validation gates.\n\nbegin;\n`;
for(const q of data.questions){
 sql+=`\ndo $$\ndeclare qid uuid; qvid uuid;\nbegin\n  insert into public.questions(slug,lifecycle_status,current_version) values ('${esc(q.slug)}','pilot',1)\n  on conflict(slug) do update set updated_at=now() returning id into qid;\n\n  insert into public.question_versions(question_id,version,stem,item_type,exam_tracks,subject,topic,client_need,clinical_judgment_step,difficulty,rationale_correct,rationale_distractors,memory_rule,source_note,validation_status)\n  values(qid,1,'${esc(q.stem)}','${esc(q.item_type)}',${arr(q.exam_tracks)},'${esc(q.subject)}','${esc(q.topic)}','${esc(q.client_need)}','${esc(q.clinical_judgment_step)}','${esc(q.difficulty)}','${esc(q.rationale_correct)}','${esc(q.rationale_distractors)}',${q.memory_rule?`'${esc(q.memory_rule)}'`:'null'},'${esc(q.source_note)}','pilot')\n  on conflict(question_id,version) do update set stem=excluded.stem returning id into qvid;\n\n  delete from public.question_options where question_version_id=qvid;\n`;
 q.options.forEach((o,n)=>sql+=`  insert into public.question_options(question_version_id,option_key,option_text,is_correct,rationale,display_order) values(qvid,'${esc(o.key)}','${esc(o.text)}',${o.is_correct?'true':'false'},'${esc(o.rationale)}',${n+1});\n`);
 sql+=`end $$;\n`;
}
sql+='commit;\n'; fs.writeFileSync(output,sql);
console.log(JSON.stringify({batch:data.batch_name||input,questions:data.questions.length,output,status:'pilot_only'},null,2));
