import { createClient } from '@supabase/supabase-js';

const need=n=>{if(!process.env[n]) throw new Error('Missing '+n); return process.env[n]};
const db=createClient(need('NEXT_PUBLIC_SUPABASE_URL'),need('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false}});
const apiKey=need('ANTHROPIC_API_KEY');
const model=process.env.ANTHROPIC_QUESTION_MODEL||'claude-sonnet-5';
const mode=process.argv[2]||'review';
const limit=Number(process.env.QUESTION_MAINTENANCE_LIMIT||40);

const reviewSchema={type:'object',additionalProperties:false,required:['items'],properties:{items:{type:'array',items:{type:'object',additionalProperties:false,required:['id','decision','reason','confidence'],properties:{id:{type:'string'},decision:{type:'string',enum:['keep','revise','retire']},reason:{type:'string'},confidence:{type:'number'}}}}}};
const generationSchema={type:'object',additionalProperties:false,required:['items'],properties:{items:{type:'array',items:{type:'object',additionalProperties:false,required:['track','subject','discipline','body_system','topic','client_need','difficulty','stem','options','rationale_correct','memory_rule'],properties:{track:{type:'string',enum:['rn','pn']},subject:{type:'string'},discipline:{type:'string'},body_system:{type:'string'},topic:{type:'string'},client_need:{type:'string'},clinical_judgment_step:{type:['string','null']},difficulty:{type:'string',enum:['medium','hard']},stem:{type:'string'},options:{type:'array',minItems:4,maxItems:4,items:{type:'object',additionalProperties:false,required:['text','rationale','is_correct'],properties:{text:{type:'string'},rationale:{type:'string'},is_correct:{type:'boolean'}}}},rationale_correct:{type:'string'},memory_rule:{type:'string'}}}}}};
async function claude(system,user,schema){
 const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},body:JSON.stringify({model,max_tokens:8000,system,messages:[{role:'user',content:user}],output_config:{format:{type:'json_schema',schema}}})});
 if(!r.ok) throw new Error('Anthropic '+r.status+': '+await r.text());
 const j=await r.json(); const t=j.content?.filter(x=>x.type==='text').map(x=>x.text).join('\n')||'';
 const cleaned=t.replace(/^\`\`\`(?:json)?\\s*/i,'').replace(/\\s*\`\`\`$/,'').trim();
 const m=cleaned.match(/\\[[\\s\\S]*\\]|\\{[\\s\\S]*\\}/);
 if(!m) throw new Error('No parseable JSON in Claude response; stop_reason='+String(j.stop_reason||'unknown')+'; chars='+cleaned.length);
 return JSON.parse(m[0]);
}
const standard=`Use current NCLEX-RN/PN principles: entry-level scope, Client Needs, clinical judgment/NCJMM when appropriate, varied cognitive tasks, plausible distractors, one defensible best answer for SBA, no trivia, no copied/recalled/live NCLEX items, no fabricated facts, no formulaic repetition. Priority/first-action stems must not dominate. Distinguish RN from PN scope. Be conservative: if an item can be repaired, recommend revise rather than retire. Output JSON only.`;

async function review(){
 const {data:qs,error}=await db.from('questions').select('id,slug,current_version,lifecycle_status,question_versions!inner(id,version,stem,item_type,exam_tracks,subject,topic,client_need,clinical_judgment_step,difficulty,rationale_correct,body_system,discipline,question_options(option_key,option_text,is_correct,rationale,display_order))').eq('lifecycle_status','active').limit(limit);
 if(error) throw error;
 const items=qs.map(q=>({id:q.id,slug:q.slug,...q.question_versions.find(v=>v.version===q.current_version)}));
 const out=(await claude('You are the independent NursePrepIQ NCLEX item reviewer. '+standard,`Review each item. Return a JSON array with exactly one object per id: {"id":"uuid","decision":"keep|revise|retire","reason":"specific concise reason","confidence":0-1}. RETIRE only for clinically unsafe/wrong, fundamentally ambiguous, obsolete, severe scope/alignment failure, or unrecoverable duplication. REVIEW DATA:\n${JSON.stringify(items)}`,reviewSchema)).items;
 for(const x of out){
   if(!['keep','revise','retire'].includes(x.decision)) continue;
   await db.from('anthropic_question_maintenance').insert({question_id:x.id,agent:'reviewer',model,decision:x.decision,reason:x.reason,confidence:x.confidence,raw_result:x});
   // Safety rule: reviewer may retire only at high confidence. "revise" is audit-only and stays live pending replacement.
   if(x.decision==='retire' && Number(x.confidence)>=0.92){
     await db.from('questions').update({lifecycle_status:'retired'}).eq('id',x.id).eq('lifecycle_status','active');
   }
 }
 console.log(JSON.stringify({mode:'review',reviewed:out.length,retire_recommendations:out.filter(x=>x.decision==='retire').length}));
}
async function generate(){
 const {data:ret}=await db.from('anthropic_question_maintenance').select('question_id,reason').eq('agent','reviewer').eq('decision','retire').order('created_at',{ascending:false}).limit(limit);
 const {data:live}=await db.from('question_versions').select('body_system,discipline,exam_tracks,topic').eq('validation_status','production_validated').limit(2000);
 const prompt=`Create ${Math.max(4,Math.min(limit,ret?.length||limit))} ORIGINAL replacement/new NCLEX-style questions. Use this current coverage snapshot to diversify topics and skills: ${JSON.stringify(live)}. Retirement reasons to avoid repeating: ${JSON.stringify(ret)}. Return ONLY a compact valid JSON array with no markdown or commentary. Keep rationales concise. Each object: {track:"rn|pn",subject,discipline,body_system,topic,client_need,clinical_judgment_step:null|string,difficulty:"medium|hard",stem,options:[{text,rationale,is_correct} x4],rationale_correct,memory_rule}. Correct positions must be balanced across the batch. Do not copy public/proprietary questions.`;
 const out=(await claude('You are the NursePrepIQ NCLEX item-development agent. '+standard,prompt,generationSchema)).items;
 for(const [i,x] of out.entries()){
   if(!Array.isArray(x.options)||x.options.length!==4||x.options.filter(o=>o.is_correct).length!==1) continue;
   const slug=`anthropic-${Date.now()}-${i+1}`;
   const {data:q,error:qe}=await db.from('questions').insert({slug,lifecycle_status:'pilot',current_version:1}).select('id').single(); if(qe) throw qe;
   const correct=x.options.find(o=>o.is_correct);
   const {data:v,error:ve}=await db.from('question_versions').insert({question_id:q.id,version:1,stem:x.stem,item_type:'single_best_answer',exam_tracks:[x.track],subject:x.subject,discipline:x.discipline,body_system:x.body_system,topic:x.topic,client_need:x.client_need,clinical_judgment_step:x.clinical_judgment_step||null,difficulty:x.difficulty,rationale_correct:x.rationale_correct||correct.rationale,rationale_distractors:'Anthropic-generated pilot distractors require independent validation.',memory_rule:x.memory_rule||null,source_note:'Original NursePrepIQ pilot generated by Anthropic maintenance agent; requires independent validation before production. Not an NCSBN item.',validation_status:'pilot',professional_role_focus:x.track==='rn'?'RN entry-level scope.':'PN entry-level scope.',track_rationale:'Generated specifically for '+x.track.toUpperCase()+' scope.'}).select('id').single(); if(ve) throw ve;
   await db.from('question_options').insert(x.options.map((o,n)=>({question_version_id:v.id,option_key:String.fromCharCode(97+n),option_text:o.text,is_correct:o.is_correct,rationale:o.rationale,display_order:n+1})));
   await db.from('anthropic_question_maintenance').insert({question_id:q.id,agent:'generator',model,decision:'created_pilot',reason:'Coverage-driven new/replacement item; independent validation required.',confidence:null,raw_result:x});
 }
 console.log(JSON.stringify({mode:'generate',created:out.length}));
}
if(mode==='review') await review(); else if(mode==='generate') await generate(); else throw new Error('Use review or generate');
