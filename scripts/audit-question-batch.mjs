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
const countBy=f=>qs.reduce((a,q)=>{const k=f(q)||'UNSPECIFIED';a[k]=(a[k]||0)+1;return a},{});
const tracks={rn:0,pn:0,both:0};
for(const q of qs){const a=q.exam_tracks||[];if(a.includes('rn'))tracks.rn++;if(a.includes('pn'))tracks.pn++;if(a.includes('rn')&&a.includes('pn'))tracks.both++;}
const warnings=[], failures=[];
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
const thinRationales=qs.filter(q=>String(q.rationale_correct||'').trim().length<45||String(q.rationale_distractors||'').trim().length<45).length;
if(thinRationales) failures.push(`${thinRationales} item(s) have rationales too thin for pilot review.`);
const report={file,total:qs.length,tracks,item_types:countBy(q=>q.item_type),subjects:countBy(q=>q.subject),client_needs:countBy(q=>q.client_need),clinical_judgment:countBy(q=>q.clinical_judgment_step),difficulty,ngn_count:ngnCount,ngn_share:Number((ngnCount/qs.length).toFixed(3)),sba_answer_positions:{A:positions[0],B:positions[1],C:positions[2],D:positions[3]},duplicate_stems:duplicateStems,warnings,failures,passed:failures.length===0};
console.log(JSON.stringify(report,null,2));
process.exit(failures.length?1:0);