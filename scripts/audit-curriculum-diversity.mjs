#!/usr/bin/env node
/**
 * NursePrepIQ curriculum-diversity gate.
 * Prevents scaling a bank by paraphrasing the same scenario/concept.
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
const failures=[],warnings=[];
const seen=[...existing];
for(const q of batch){
 const exact=seen.find(x=>norm(x.stem)===norm(q.stem));
 if(exact) failures.push({slug:q.slug,type:'verbatim_duplicate',matches:exact.slug});
 else {
  const near=seen.map(x=>[x,jac(q.stem,x.stem)]).sort((a,b)=>b[1]-a[1])[0];
  if(near?.[1]>=.82) failures.push({slug:q.slug,type:'near_duplicate',matches:near[0].slug,similarity:+near[1].toFixed(2)});
  else if(near?.[1]>=.68) warnings.push({slug:q.slug,type:'high_similarity',matches:near[0].slug,similarity:+near[1].toFixed(2)});
 }
 seen.push(q);
}
const concepts=new Map();
for(const q of batch){const k=[q.exam_tracks?.join('+'),q.subject,q.topic,q.client_need,q.clinical_judgment_step].map(norm).join('|');concepts.set(k,(concepts.get(k)||0)+1)}
for(const [k,n] of concepts) if(n>2) warnings.push({type:'concept_overuse',concept:k,count:n});
console.log(JSON.stringify({questions:batch.length,failures,warnings,passed:failures.length===0},null,2));
process.exit(failures.length?1:0);
