#!/usr/bin/env node
/**
 * NursePrepIQ production planner.
 * Converts a requested batch size into RN/PN, Client Needs, clinical-judgment,
 * difficulty, and item-format targets. Planning only: it never publishes content.
 *
 * 2026 NCLEX source basis:
 * - RN/PN Client Needs ranges: 2026 NCSBN test plans / candidate bulletin.
 * - Clinical judgment: 18 case-study items (3 x 6) plus ~10% stand-alone items.
 * We use range midpoints only as internal production-planning targets; they are
 * not a claim that every NCLEX form has exactly these percentages.
 */
const n=Number(process.argv[2]||200);
if(!Number.isInteger(n)||n<20) throw new Error('Usage: node scripts/plan-question-production.mjs <count>=20+');

const blueprints={
 rn:{
  'Management of Care':[15,21],
  'Safety and Infection Prevention and Control':[10,16],
  'Health Promotion and Maintenance':[6,12],
  'Psychosocial Integrity':[6,12],
  'Basic Care and Comfort':[6,12],
  'Pharmacological and Parenteral Therapies':[13,19],
  'Reduction of Risk Potential':[9,15],
  'Physiological Adaptation':[11,17]
 },
 pn:{
  'Coordinated Care':[18,24],
  'Safety and Infection Prevention and Control':[10,16],
  'Health Promotion and Maintenance':[6,12],
  'Psychosocial Integrity':[9,15],
  'Basic Care and Comfort':[7,13],
  'Pharmacological Therapies':[10,16],
  'Reduction of Risk Potential':[9,15],
  'Physiological Adaptation':[7,13]
 }
};
const allocate=(total,weights)=>{
 const entries=Object.entries(weights), sum=entries.reduce((s,[,w])=>s+w,0);
 const raw=entries.map(([k,w])=>[k,total*w/sum]);
 const out=Object.fromEntries(raw.map(([k,v])=>[k,Math.floor(v)]));
 let left=total-Object.values(out).reduce((a,b)=>a+b,0);
 raw.sort((a,b)=>(b[1]%1)-(a[1]%1));
 for(let i=0;i<left;i++) out[raw[i%raw.length][0]]++;
 return out;
};
const midpointWeights=ranges=>Object.fromEntries(Object.entries(ranges).map(([k,[lo,hi]])=>[k,(lo+hi)/2]));
const rn=Math.ceil(n/2),pn=n-rn;
const cjSteps=['Recognize Cues','Analyze Cues','Prioritize Hypotheses','Generate Solutions','Take Action','Evaluate Outcomes'];
const caseSets=Math.floor(n/50); // 12% case-study items: 2 six-item cases per 100 produced.
const caseItems=caseSets*6;
const standaloneCJ=Math.round(n*.10);
const ngnTarget=Math.max(caseItems+standaloneCJ,Math.round(n*.25));
const formats=allocate(n,{single_best_answer:55,multiple_response:15,matrix_grid:8,cloze_dropdown:8,ordered_response:6,bow_tie:8});
const report={
 requested:n,
 safety:'PLANNING ONLY — generated content remains pilot until all validation gates pass',
 tracks:{rn,pn},
 client_need_targets:{rn:allocate(rn,midpointWeights(blueprints.rn)),pn:allocate(pn,midpointWeights(blueprints.pn))},
 difficulty_targets:allocate(n,{easy:15,medium:50,hard:35}),
 item_format_targets:formats,
 ngn:{minimum_planning_target:ngnTarget,case_study_sets:caseSets,case_study_items:caseItems,standalone_clinical_judgment_target:standaloneCJ},
 clinical_judgment_targets:allocate(caseItems+standaloneCJ,Object.fromEntries(cjSteps.map(x=>[x,1]))),
 notes:[
  'Client Needs allocations use normalized midpoints of official 2026 percentage ranges for production coverage planning.',
  'Case-study production must preserve six linked unfolding items spanning all six clinical-judgment functions.',
  'Do not infer CAT equivalence, pass probability, or official NCLEX scoring from these production targets.'
 ]
};
console.log(JSON.stringify(report,null,2));
