#!/usr/bin/env node
/** NursePrepIQ pre-import coverage/quality audit. No content is promoted or published. */
import fs from 'node:fs';
const file=process.argv[2];
if(!file){console.error('Usage: node scripts/audit-question-batch.mjs <batch.json>');process.exit(2)}
const d=JSON.parse(fs.readFileSync(file,'utf8'));
const qs=Array.isArray(d.questions)?d.questions:[];
if(!qs.length){console.error('No questions[] found');process.exit(2)}
const cj=['Recognize Cues','Analyze Cues','Prioritize Hypotheses','Generate Solutions','Take Action','Evaluate Outcomes'];
const ngn=new Set(['multiple_response','matrix_grid','cloze_dropdown','ordered_response','bow_tie']);
// Mirrors the top-level practice categories currently exposed in app/practice/page.tsx.
// Keep this list synchronized when a new website category is introduced.
const websiteCategories=['Fundamentals','Adult Health','Pharmacology','Mental Health','Maternal & Newborn','Pediatrics','Management of Care','Safety & Infection Control','NGN Clinical Judgment'];
const norm=v=>String(v||'').trim().toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,' ' ).trim();
const aliases=new Map([
  ['fundamentals','Fundamentals'],['adult health','Adult Health'],['medical surgical','Adult Health'],['med surg','Adult Health'],
  ['pharmacology','Pharmacology'],['mental health','Mental Health'],['psychiatric','Mental Health'],
  ['maternal and newborn','Maternal & Newborn'],['maternal newborn','Maternal & Newborn'],['obstetrics','Maternal & Newborn'],
  ['pediatrics','Pediatrics'],['pediatric','Pediatrics'],['management of care','Management of Care'],['coordinated care','Management of Care'],
  ['safety and infection control','Safety & Infection Control'],['safety infection control','Safety & Infection Control'],
  ['ngn clinical judgment','NGN Clinical Judgment'],['clinical judgment','NGN Clinical Judgment']
]);
const categoryFor=q=>{
  const explicit=aliases.get(norm(q.category)); if(explicit)return explicit;
  const subject=aliases.get(norm(q.subject)); if(subject)return subject;
  const need=aliases.get(norm(q.client_need)); if(need)return need;
  if(ngn.has(q.item_type)||cj.includes(q.clinical_judgment_step)) return 'NGN Clinical Judgment';
  return null;
};
const countBy=f=>qs.reduce((a,q)=>{const k=f(q)||'UNSPECIFIED';a[k]=(a[k]||0)+1;return a},{});
const tracks={rn:0,pn:0,both:0};
for(const q of qs){const a=q.exam_tracks||[];if(a.includes('rn'))tracks.rn++;if(a.includes('pn'))tracks.pn++;if(a.includes('rn')&&a.includes('pn'))tracks.both++;}
const warnings=[], failures=[];
if(qs.length<100) failures.push(`Batch contains ${qs.length} questions; production batches must contain at least 100.`);
const categoryCoverage=Object.fromEntries(websiteCategories.map(c=>[c,0]));
for(const q of qs){const c=categoryFor(q);if(c)categoryCoverage[c]++;}
const missingCategories=websiteCategories.filter(c=>categoryCoverage[c]===0);
if(missingCategories.length) failures.push(`Website category coverage missing: ${missingCategories.join(', ')}`);
for(const s of cj) if(!qs.some(q=>q.clinical_judgment_step===s)) warnings.push(`No ${s} item in batch`);
const ngnCount=qs.filter(q=>ngn.has(q.item_type)).length;
if(!ngnCount) warnings.push('No NGN-format items detected');
if(qs.length>=20&&ngnCount/qs.length<.15) warnings.push('NGN-format share is below 15%; increase item-format diversity where clinically appropriate.');
if(!tracks.rn) warnings.push('No RN-eligible items');
if(!tracks.pn) warnings.push('No PN-eligible items');
const missingSource=qs.filter(q=>!q.source_note||String(q.source_note).trim().length<12).length;
if(missingSource) failures.push(`${missingSource} item(s) have weak/missing source_note`);
const duplicateStems=Object.entries(countBy(q=>String(q.stem||'').trim().toLowerCase())).filter(([k,n])=>k&&n>1).map(([k,n])=>({stem:k.slice(0,90),count:n}));
if(duplicateStems.length) failures.push(`${duplicateStems.length} duplicate stem group(s)`);
const difficulty=countBy(q=>q.difficulty), hard=difficulty.hard||0, easy=difficulty.easy||0;
if(qs.length>=20&&hard/qs.length<.30) failures.push(`Hard/high-discrimination share is ${Math.round(hard/qs.length*100)}%; minimum is 30% for batches of 20+.`);
if(qs.length>=20&&easy/qs.length>.25) failures.push(`Easy-item share is ${Math.round(easy/qs.length*100)}%; maximum is 25% for batches of 20+.`);
const sba=qs.filter(q=>q.item_type==='single_best_answer'&&Array.isArray(q.options));
const positions=[0,0,0,0];
for(const q of sba){const p=q.options.findIndex(o=>o.is_correct);if(p>=0&&p<4)positions[p]++;}
if(sba.length>=8){const max=Math.max(...positions),min=Math.min(...positions);if(max>Math.ceil(sba.length*.40)||max-min>Math.ceil(sba.length*.30)) failures.push(`SBA answer positions are too predictable: A/B/C/D=${positions.join('/')}.`);}
const keyRationaleMismatch=qs.filter(q=>{
 const keyed=(q.options||[]).filter(o=>o.is_correct);
 return q.item_type==='single_best_answer'&&(keyed.length!==1||String(keyed[0]?.rationale||'').trim()!==String(q.rationale_correct||'').trim());
}).map(q=>q.slug);
if(keyRationaleMismatch.length) failures.push(`${keyRationaleMismatch.length} item(s) have a key/rationale mismatch: ${keyRationaleMismatch.slice(0,8).join(', ')}`);
const thinRationales=qs.filter(q=>String(q.rationale_correct||'').trim().length<45||String(q.rationale_distractors||'').trim().length<45).length;
if(thinRationales) failures.push(`${thinRationales} item(s) have rationales too thin for pilot review.`);
const report={file,total:qs.length,tracks,website_category_coverage:categoryCoverage,missing_website_categories:missingCategories,item_types:countBy(q=>q.item_type),subjects:countBy(q=>q.subject),client_needs:countBy(q=>q.client_need),clinical_judgment:countBy(q=>q.clinical_judgment_step),difficulty,ngn_count:ngnCount,ngn_share:Number((ngnCount/qs.length).toFixed(3)),sba_answer_positions:{A:positions[0],B:positions[1],C:positions[2],D:positions[3]},duplicate_stems:duplicateStems,key_rationale_mismatches:keyRationaleMismatch,warnings,failures,passed:failures.length===0};
console.log(JSON.stringify(report,null,2));
process.exit(failures.length?1:0);