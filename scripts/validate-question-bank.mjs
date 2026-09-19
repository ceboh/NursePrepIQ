#!/usr/bin/env node
/**
 * NursePrepIQ question-bank quality gate.
 * Validates SQL migrations before they are approved for Supabase.
 * This is a structural/editorial gate, not a substitute for clinical review.
 */
import fs from 'node:fs';

const file=process.argv[2];
if(!file){console.error('Usage: node scripts/validate-question-bank.mjs <migration.sql>');process.exit(2)}
const sql=fs.readFileSync(file,'utf8');
const failures=[]; const warnings=[];
const count=(re)=>(sql.match(re)||[]).length;

const stems=count(/stem:=/g)+count(/,'single_best_answer'/g);
const rn=count(/role='rn'/g)+count(/array\['rn'\]/g);
const pn=count(/role='pn'/g)+count(/array\['pn'\]/g);
const correctA=count(/'a'[^\n]*true/g),correctB=count(/'b'[^\n]*true/g),correctC=count(/'c'[^\n]*true/g),correctD=count(/'d'[^\n]*true/g);
const cj=['Recognize Cues','Analyze Cues','Prioritize Hypotheses','Generate Solutions','Take Action','Evaluate Outcomes'];
for(const step of cj) if(!sql.includes(step)) warnings.push('Missing clinical-judgment function: '+step);
if(!/RN|role='rn'|array\['rn'\]/i.test(sql)) failures.push('No RN-specific content detected.');
if(!/PN|LPN\/VN|role='pn'|array\['pn'\]/i.test(sql)) failures.push('No PN-specific content detected.');
if(!/rationale/i.test(sql)) failures.push('Rationales not detected.');
if(!/pilot/i.test(sql)) failures.push('New clinical items must enter PILOT/validation state.');
if(/NCSBN item|actual NCLEX question|recalled NCLEX/i.test(sql)) failures.push('Potential prohibited/confidential-item claim detected.');
const answerCounts=[correctA,correctB,correctC,correctD];
const maxAnswerCount=Math.max(...answerCounts);
const minAnswerCount=Math.min(...answerCounts);
// Answer-position balance is a hard gate for meaningful SBA batches. This
// prevents students from learning a letter pattern instead of clinical logic.
if(stems>=8 && maxAnswerCount > Math.ceil(stems*.40)) failures.push('Correct-answer position is over-concentrated (>40% in one position). Rebalance A/B/C/D before import.');
else if(stems>=4 && maxAnswerCount-minAnswerCount > Math.ceil(stems*.35)) warnings.push('Correct-answer positions are uneven; review A/B/C/D distribution before scaling this batch.');
const generic=count(/Does not address the priority finding or safest response\./g);
if(generic>8) warnings.push('Repeated generic distractor rationale detected ('+generic+'). Replace with option-specific rationales.');
const longLines=sql.split('\n').filter(x=>x.length>10000).length;if(longLines) warnings.push('Very long SQL lines detected; consider maintainability.');

console.log(JSON.stringify({file,estimated_stems:stems,rn_markers:rn,pn_markers:pn,answer_positions:{A:correctA,B:correctB,C:correctC,D:correctD},failures,warnings,passed:failures.length===0},null,2));
process.exit(failures.length?1:0);