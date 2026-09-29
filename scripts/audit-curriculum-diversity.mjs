#!/usr/bin/env node
/**
 * NursePrepIQ duplicate/admission review gate.
 *
 * IMPORTANT:
 * - Exact normalized duplicates FAIL admission.
 * - Near-text and concept similarity are REVIEW FLAGS only; they never delete content.
 * - Intentional unfolding NGN case members sharing the same case_set_id are exempt from
 *   within-case similarity flags, because reuse of the scenario is expected.
 * - This script never mutates Supabase and must not be used as a deletion engine.
 *
 * Usage: node scripts/audit-curriculum-diversity.mjs batch.json [existing.json]
 */
import fs from 'node:fs';
const [batchFile,existingFile]=process.argv.slice(2);
if(!batchFile) throw new Error('Usage: node scripts/audit-curriculum-diversity.mjs batch.json [existing.json]');
const load=p=>JSON.parse(fs.readFileSync(p,'utf8')).questions||[];
const batch=load(batchFile), existing=existingFile?load(existingFile):[];
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const tokens=s=>new Set(norm(s).split(' ').filter(x=>x.length>3));
const jac=(a,b)=>{a=tokens(a);b=tokens(b);const i=[...a].filter(x=>b.has(x)).length;return i/(a.size+b.size-i||1)};
const sameIntentionalCase=(a,b)=>Boolean(a.case_set_id&&b.case_set_id&&String(a.case_set_id)===String(b.case_set_id));
const failures=[],review_flags=[],warnings=[];
const seen=[...existing];

for(const q of batch){
 const exact=seen.find(x=>norm(x.stem)===norm(q.stem));
 if(exact){
   // Even inside a case, an identical question stem is an actual duplicate.
   failures.push({slug:q.slug,type:'exact_normalized_duplicate',matches:exact.slug||exact.source_id||'existing'});
 } else {
   const candidates=seen
     .filter(x=>!sameIntentionalCase(q,x))
     .map(x=>[x,jac(q.stem,x.stem)])
     .sort((a,b)=>b[1]-a[1]);
   const near=candidates[0];
   if(near?.[1]>=.82) review_flags.push({slug:q.slug,type:'very_high_text_similarity',matches:near[0].slug||near[0].source_id||'existing',similarity:+near[1].toFixed(2),action:'human_or_independent_content_review'});
   else if(near?.[1]>=.68) review_flags.push({slug:q.slug,type:'high_text_similarity',matches:near[0].slug||near[0].source_id||'existing',similarity:+near[1].toFixed(2),action:'review_not_delete'});
 }
 seen.push(q);
}

const concepts=new Map();
for(const q of batch){
 if(q.case_set_id) continue;
 const k=[q.exam_tracks?.join('+'),q.subject,q.topic,q.client_need,q.clinical_judgment_step].map(norm).join('|');
 const arr=concepts.get(k)||[];arr.push(q.slug||q.source_id||'item');concepts.set(k,arr);
}
for(const [k,items] of concepts) if(items.length>2) review_flags.push({type:'concept_concentration',concept:k,count:items.length,items,action:'review_for_distinct_nursing_decisions'});

const caseSets={};
for(const q of batch) if(q.case_set_id){const k=String(q.case_set_id);caseSets[k]??=[];caseSets[k].push({slug:q.slug||q.source_id,step:q.clinical_judgment_step,item_type:q.item_type});}

const report={
 questions:batch.length,
 exact_duplicate_failures:failures,
 review_flags,
 warnings,
 intentional_case_sets:caseSets,
 policy:{
   auto_skip:'exact normalized duplicate only',
   near_duplicate:'review flag; no automatic deletion',
   concept_similarity:'review flag; no automatic deletion',
   intentional_case_set:'preserve linked items; shared scenario expected'
 },
 passed:failures.length===0
};
console.log(JSON.stringify(report,null,2));
process.exit(failures.length?1:0);
