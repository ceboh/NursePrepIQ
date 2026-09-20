-- NursePrepIQ 0023: clean the existing renal/urinary foundation bank.
-- No publication occurs here. These items remain pilot pending clinical + pilot validation.
-- Goals: remove generic distractor explanations, strengthen teaching value, and remove low-bar difficulty labels.

begin;

-- The 0009 bank already balances correct positions deterministically across A/B/C/D.
-- Raise the outcome-evaluation items from an artificially low easy classification.
update public.question_versions qv
set difficulty = 'medium'
from public.questions q
where q.id = qv.question_id
  and q.slug like '%-renal-%'
  and qv.version = 1
  and qv.difficulty = 'easy';

-- Replace boilerplate option rationales with rationales tied to what the option actually says.
update public.question_options qo
set rationale = case
  when lower(qo.option_text) like '%intake and output%' then 'Asking about monitoring is a teaching opportunity, but it does not indicate acute renal deterioration.'
  when lower(qo.option_text) like '%mild fatigue%' then 'Mild fatigue after activity is nonspecific and is less urgent than declining urine output with fluid-overload findings.'
  when lower(qo.option_text) like '%yellow%' and lower(qo.option_text) like '%urine%' then 'Urine color without a meaningful change in output does not establish worsening kidney function.'
  when lower(qo.option_text) like '%stable creatinine%' then 'Stable renal markers and unchanged output do not support the acute deterioration described in the stem.'
  when lower(qo.option_text) like '%dry skin%' then 'Dry skin with otherwise stable findings does not indicate the immediate electrolyte/cardiac threat posed by worsening AKI.'
  when lower(qo.option_text) like '%renal diet%' then 'Diet teaching matters, but an educational request does not outrank acute hyperkalemia or perfusion concerns.'
  when lower(qo.option_text) like '%edema worsens%' then 'Worsening edema suggests persistent or increasing fluid retention, so one improved laboratory value is not enough to establish recovery.'
  when lower(qo.option_text) like '%urine output continues to decline%' then 'Declining output with increasing weight indicates worsening fluid retention rather than renal recovery.'
  when lower(qo.option_text) like '%potassium rises%' then 'A rising potassium level can become life-threatening even if the client subjectively feels less tired.'
  when lower(qo.option_text) like '%blood pressure is avoided%' then 'This question reflects appropriate access-protection teaching and is not evidence of access failure.'
  when lower(qo.option_text) like '%healed scar%' then 'A healed scar is an expected chronic finding and does not indicate loss of access patency.'
  when lower(qo.option_text) like '%tired after%' and lower(qo.option_text) like '%dialysis%' then 'Postdialysis fatigue may occur and is less urgent than a new loss of the access thrill.'
  when lower(qo.option_text) like '%use the access arm first%' then 'Blood-pressure cuff compression can compromise the vascular access and should be avoided on the access arm.'
  when lower(qo.option_text) like '%tight compression%' then 'Prolonged tight compression can obstruct access blood flow and threaten patency.'
  when lower(qo.option_text) like '%routine venipuncture%' then 'Routine venipuncture in the access arm can injure or compromise the dialysis access.'
  when lower(qo.option_text) like '%weight decreases%' and lower(qo.option_text) like '%hypotension%' then 'Weight loss accompanied by symptomatic hypotension suggests excessive fluid removal or instability, not an uncomplicated therapeutic response.'
  when lower(qo.option_text) like '%edema is unchanged%' then 'Persistent edema with worsening dyspnea indicates inadequate improvement in volume status.'
  when lower(qo.option_text) like '%loses its thrill%' then 'Loss of the thrill suggests threatened access patency and requires prompt follow-up.'
  when lower(qo.option_text) like '%mild urinary frequency%' then 'Frequency without fever, flank pain, or systemic illness is more consistent with lower-tract symptoms than progression to pyelonephritis.'
  when lower(qo.option_text) like '%how much fluid%' then 'A hydration question is relevant teaching but is not a cue of upper urinary tract infection or systemic deterioration.'
  when lower(qo.option_text) like '%urine color is unchanged%' then 'Unchanged urine color with stable vital signs does not suggest systemic progression of infection.'
  when lower(qo.option_text) like '%stop prescribed treatment%' then 'Stopping antimicrobial therapy simply because symptoms improve can result in incomplete treatment and recurrence.'
  when lower(qo.option_text) like '%restrict all fluids%' then 'Blanket fluid restriction is inappropriate; hydration decisions depend on the client’s clinical status and prescribed plan.'
  when lower(qo.option_text) like '%ignore new fever%' then 'A new fever can indicate worsening or ascending infection and requires reassessment rather than reassurance from one improving urinary symptom.'
  when lower(qo.option_text) like '%burning improves%' and lower(qo.option_text) like '%confusion worsens%' then 'Improvement in dysuria does not offset worsening fever and confusion, which can signal systemic deterioration.'
  when lower(qo.option_text) like '%flank pain increases%' then 'Increasing flank pain is inconsistent with effective treatment even if a single temperature reading is lower.'
  when lower(qo.option_text) like '%less frequency%' and lower(qo.option_text) like '%hypotension%' then 'Hypotension is a serious systemic finding and outweighs improvement in urinary frequency.'
  when lower(qo.option_text) like '%expected amount%' and lower(qo.option_text) like '%without discomfort%' then 'Effective, comfortable voiding does not support urinary retention.'
  when lower(qo.option_text) like '%pale yellow%' then 'Pale-yellow urine after fluids is not evidence of bladder outlet obstruction or retention.'
  when lower(qo.option_text) like '%where the bathroom%' then 'Needing directions to the bathroom does not indicate impaired bladder emptying.'
  when lower(qo.option_text) like '%wait until the next shift%' then 'Delaying assessment risks prolonged bladder overdistention and complications.'
  when lower(qo.option_text) like '%large amounts of fluid%' then 'Giving large fluid volumes without assessing bladder status or considering the clinical plan may worsen discomfort and does not address the cause of retention.'
  when lower(qo.option_text) like '%document the complaint without%' then 'Documentation alone does not evaluate or relieve suspected retention; focused assessment is required.'
  when lower(qo.option_text) like '%few drops%' then 'Passing only a few drops while suprapubic fullness increases suggests continued inadequate bladder emptying.'
  when lower(qo.option_text) like '%urge to void disappears%' then 'Loss of urge despite worsening distention does not demonstrate effective emptying and may delay recognition of significant retention.'
  when lower(qo.option_text) like '%drinks more fluid%' and lower(qo.option_text) like '%unable to void%' then 'Increased intake without the ability to void does not demonstrate resolution and may worsen bladder distention.'
  else qo.rationale
end
from public.question_versions qv
join public.questions q on q.id = qv.question_id
where qo.question_version_id = qv.id
  and q.slug like '%-renal-%'
  and qv.version = 1
  and qo.is_correct = false;

-- Keep the cleaned content explicitly non-production until the remaining required gates pass.
update public.question_versions qv
set validation_status = 'pilot',
    source_note = 'Original NursePrepIQ item; renal/urinary cleanup applied in 0023. Clinical and pilot validation remain required before production. Not an NCSBN item.'
from public.questions q
where q.id = qv.question_id
  and q.slug like '%-renal-%'
  and qv.version = 1;

update public.questions
set lifecycle_status = 'pilot', updated_at = now()
where slug like '%-renal-%';

commit;
