-- NursePrepIQ 0021: clean up high-acuity pilot batch A (0019)
-- Replaces repeated generic distractor rationales with option-specific teaching rationales.
-- Keeps all 16 items PILOT. No clinical/pilot validation or publication is asserted here.

begin;

with rationale_map(option_text, rationale) as (values
  ('Anxiety related to hospitalization','Anxiety may accompany acute coronary syndrome, but it does not explain the new ST changes, hypotension, diaphoresis, and recurrent ischemic symptoms.'),
  ('Expected fatigue after admission','Fatigue is nonspecific and does not account for the acute hemodynamic and ECG deterioration.'),
  ('Need for additional discharge teaching','Teaching is important after stabilization, but it is not the priority during recurrent ischemia with impaired perfusion.'),
  ('Reassess the client at the next scheduled vital-sign check.','Waiting for routine reassessment delays response to a major change in perfusion and possible ongoing ischemia.'),
  ('Offer teaching about cardiac rehabilitation.','Rehabilitation teaching is appropriate later; it does not address the client’s current instability.'),
  ('Document the findings after completing routine care.','Documentation is necessary, but acute deterioration must be escalated before routine care is completed.'),
  ('Encourage the client to ambulate to mobilize secretions.','Ambulation is unsafe in a drowsy, hypoxemic client with signs of impending respiratory failure.'),
  ('Delay intervention until an arterial blood gas result is available.','Diagnostic data may guide treatment, but obtaining results must not delay emergency support for failing ventilation.'),
  ('Teach pursed-lip breathing and reassess in one hour.','Breathing techniques do not replace immediate escalation when consciousness, ventilation, and oxygenation are worsening.'),
  ('The client reports mild tremor after a prescribed bronchodilator.','A mild tremor can occur with beta-agonist therapy and is less urgent than evidence of critically reduced airflow.'),
  ('The respiratory rate decreases from 28 to 22/min while the client speaks more easily.','A lower rate accompanied by easier speech suggests improvement rather than deterioration.'),
  ('The client asks when discharge teaching will begin.','A teaching question does not indicate acute respiratory compromise.'),
  ('Give oral fluids to evaluate swallowing ability.','Oral intake should not be used to test swallowing during an acute stroke response because dysphagia and aspiration risk have not been assessed.'),
  ('Allow the client to rest and repeat the examination in one hour.','Stroke treatment is time-sensitive; delaying reassessment can forfeit treatment opportunities.'),
  ('Administer an as-needed sedative for anxiety.','Sedation can obscure neurologic assessment and does not address the sudden focal deficits.'),
  ('Finish the medication pass before reporting the change.','Routine medication administration must not delay escalation of new focal neurologic deficits.'),
  ('Ask the family to observe the client for another hour.','Observation without immediate escalation is unsafe because acute stroke symptoms require time-sensitive evaluation.'),
  ('Risk for constipation from reduced activity.','Constipation is not the immediate threat when severe hyperkalemia is producing ECG changes.'),
  ('Knowledge deficit about a renal diet.','Education is lower priority than an electrolyte disturbance capable of causing lethal dysrhythmias.'),
  ('Disturbed sleep from overnight monitoring.','Sleep disruption is not life-threatening and does not address the client’s electrical cardiac instability.'),
  ('Wait for the next routine electrolyte panel to confirm the trend.','A potassium above 6 mEq/L with weakness and rhythm change already warrants urgent escalation; waiting may permit deterioration.'),
  ('Encourage a potassium-rich snack before calling the RN.','Additional potassium could worsen hyperkalemia and increase dysrhythmia risk.'),
  ('Document the result and discuss it during shift report.','Documentation cannot substitute for immediate communication of a potentially life-threatening electrolyte abnormality.'),
  ('Expected postoperative atelectasis requiring only ambulation.','Atelectasis can cause hypoxemia, but sudden pleuritic pain, marked tachycardia, severe desaturation, and thromboembolic risk make pulmonary embolism more concerning.'),
  ('Opioid withdrawal causing isolated tachycardia.','Opioid withdrawal does not adequately explain the abrupt pleuritic chest pain and severe hypoxemia.'),
  ('Normal physiologic response to postoperative pain.','Postoperative pain can increase heart rate, but it does not make sudden dyspnea and oxygen saturation of 84% a normal response.'),
  ('Walk the client in the hallway to improve lung expansion.','Ambulation is unsafe during sudden hypoxemia and suspected pulmonary embolism.'),
  ('Leave the client to locate the postoperative teaching booklet.','The client should not be left during an acute cardiopulmonary emergency, and teaching materials are not the priority.'),
  ('Recheck the oxygen saturation after the client naps.','Delaying reassessment and escalation is unsafe when acute PE is possible and oxygenation is severely impaired.'),
  ('Weight decreases rapidly while blood pressure falls and creatinine rises.','Weight loss with hypotension and worsening renal function suggests excessive volume removal or impaired perfusion rather than a well-tolerated response.'),
  ('Peripheral edema improves but confusion and cool extremities develop.','Less edema does not represent successful treatment if new findings indicate worsening systemic perfusion.'),
  ('Urine output increases while potassium falls to a critically low level.','Improved urine output is not a favorable overall outcome when a dangerous electrolyte abnormality develops.'),
  ('A request for an extra blanket with otherwise stable findings.','A preference for warmth without other changes does not establish worsening perfusion.'),
  ('One missed television program because the client slept.','Sleeping through an activity is nonspecific and is not comparable to objective signs of reduced perfusion.'),
  ('Questions about the low-sodium diet.','Diet questions represent a teaching need, not evidence of acute circulatory deterioration.'),
  ('Insert a tongue blade between the teeth.','Nothing should be placed in the mouth during a seizure because it can injure the client or caregiver and obstruct the airway.'),
  ('Restrain the extremities to stop tonic-clonic movement.','Restraint can cause musculoskeletal injury and does not stop seizure activity.'),
  ('Give oral antiseizure medication during active convulsions.','Oral medication is unsafe during active convulsions because the client cannot swallow safely.'),
  ('The client is sleepy but arouses and gradually becomes more oriented.','Transient somnolence with progressive return toward baseline is consistent with an expected postictal recovery pattern.'),
  ('The client reports muscle soreness after becoming fully alert.','Muscle soreness can follow tonic-clonic activity and is less urgent than recurrent seizures with worsening oxygenation.'),
  ('The client cannot remember the seizure event but follows commands.','Amnesia for the event can occur after a seizure; following commands and recovering consciousness are reassuring compared with ongoing seizure activity.'),
  ('Expected fatigue that can be reassessed after discharge.','Progressive neurologic change during dialysis is not routine fatigue and should not be deferred until after discharge.'),
  ('A normal response to removal of excess fluid.','Fluid removal may cause hemodynamic symptoms, but worsening headache and level of consciousness are not normal findings to dismiss.'),
  ('A teaching issue best addressed at the next clinic visit.','Acute neurologic deterioration is a safety problem requiring immediate assessment, not a future teaching issue.'),
  ('Apply a tight pressure dressing over the entire access.','Unnecessary tight compression can compromise blood flow through the vascular access and worsen loss of patency.'),
  ('Use the access arm for a blood pressure to assess circulation.','Blood-pressure cuffs should be avoided on the access arm because compression can jeopardize the fistula or graft.'),
  ('Wait until the next dialysis treatment to reassess the access.','An absent thrill can indicate access occlusion and requires prompt reporting to preserve vascular access.')
)
update public.question_options qo
set rationale = rm.rationale
from rationale_map rm
where qo.option_text = rm.option_text
  and qo.question_version_id in (
    select qv.id from public.question_versions qv
    join public.questions q on q.id=qv.question_id
    where q.slug like '0019-%'
  )
  and qo.is_correct=false;

-- Replace the batch-level generic distractor summary with a more useful statement.
update public.question_versions qv
set rationale_distractors = case
  when qv.topic in ('Acute Coronary Syndrome','Heart Failure') then 'Incorrect choices either delay response to impaired perfusion, overvalue a lower-priority need, or misread a deterioration cue as routine care.'
  when qv.topic in ('Asthma','Pulmonary Embolism') then 'Incorrect choices either delay support for threatened oxygenation/ventilation, misinterpret worsening respiratory cues, or substitute routine care for emergency escalation.'
  when qv.topic in ('Stroke','Seizures') then 'Incorrect choices delay time-sensitive neurologic care, introduce avoidable safety risk, or misclassify abnormal neurologic findings as expected recovery.'
  else 'Incorrect choices delay response to a life-threatening renal/electrolyte or dialysis-access problem, introduce avoidable harm, or prioritize routine care over instability.'
end
from public.questions q
where q.id=qv.question_id and q.slug like '0019-%';

-- Preserve pilot status explicitly.
update public.questions set lifecycle_status='pilot', updated_at=now()
where slug like '0019-%';
update public.question_versions qv set validation_status='pilot'
from public.questions q
where q.id=qv.question_id and q.slug like '0019-%';

commit;
