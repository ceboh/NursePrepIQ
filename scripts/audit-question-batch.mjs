#!/usr/bin/env node
/** NursePrepIQ pre-import coverage audit. No content is promoted or published. */
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
const warnings=[];
for(const s of cj) if(!qs.some(q=>q.clinical_judgment_step===s)) warnings.push(`No ${s} item in batch`);
const ngnCount=qs.filter(q=>ngn.has(q.item_type)).length;
if(!ngnCount) warnings.push('No NGN-format items detected');
if(!tracks.rn) warnings.push('No RN-eligible items');
if(!tracks.pn) warnings.push('No PN-eligible items');
const missingSource=qs.filter(q=>!q.source_note||String(q.source_note).trim().length<8).length;
if(missingSource) warnings.push(`${missingSource} item(s) have weak/missing source_note`);
const duplicateStems=Object.entries(countBy(q=>String(q.stem||'').trim().toLowerCase())).filter(([k,n])=>k&&n>1).map(([k,n])=>({stem:k.slice(0,90),count:n}));
if(duplicateStems.length) warnings.push(`${duplicateStems.length} duplicate stem group(s)`);
const report={file,total:qs.length,tracks,item_types:countBy(q=>q.item_type),subjects:countBy(q=>q.subject),client_needs:countBy(q=>q.client_need),clinical_judgment:countBy(q=>q.clinical_judgment_step),difficulty:countBy(q=>q.difficulty),ngn_count:ngnCount,ngn_share:Number((ngnCount/qs.length).toFixed(3)),duplicate_stems:duplicateStems,warnings};
console.log(JSON.stringify(report,null,2));
process.exit(duplicateStems.length||missingSource?1:0);
