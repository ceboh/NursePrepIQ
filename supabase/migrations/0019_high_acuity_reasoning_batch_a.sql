-- NursePrepIQ 0019: high-acuity reasoning batch A
-- 16 original PILOT items (8 RN, 8 PN). Deliberately not production-published.
-- Emphasis: cue clustering, prioritization, deterioration, delegation/scope, and evaluation.
-- Clinical/editorial validation and pilot gates remain required before production promotion.

begin;

do $$
declare
  r record; qid uuid; vid uuid; correct_pos int; opts text[]; i int;
begin
  for r in
    select * from (values
      ('rn','cardiovascular','Acute Coronary Syndrome','hard','Analyze Cues','A client admitted with acute coronary syndrome reports recurrent chest pressure. The monitor now shows new ST-segment changes, blood pressure is 86/54 mm Hg, and the client is cool and diaphoretic. Which finding should the RN interpret as the priority?','The combination of recurrent ischemic symptoms, new ECG changes, hypotension, and diaphoresis suggests ongoing ischemia with hemodynamic instability.','Ongoing myocardial ischemia with impaired perfusion requires immediate escalation.','Anxiety related to hospitalization','Expected fatigue after admission','Need for additional discharge teaching'),
      ('pn','cardiovascular','Acute Coronary Syndrome','hard','Recognize Cues','An LPN/VN caring for a client with acute coronary syndrome notes new chest pressure, diaphoresis, and a blood pressure decrease from 128/76 to 88/52 mm Hg. What is the priority action?','These are acute deterioration cues. The LPN/VN should immediately report the change and remain with the client while following the established emergency response plan.','Immediately report the change and initiate the established escalation process while remaining with the client.','Reassess the client at the next scheduled vital-sign check.','Offer teaching about cardiac rehabilitation.','Document the findings after completing routine care.'),
      ('rn','respiratory','Asthma','hard','Take Action','A client with severe asthma becomes drowsy after hours of respiratory distress. Wheezing is now faint, respiratory effort is shallow, and oxygen saturation continues to fall despite prescribed oxygen. Which action is the RN priority?','Drowsiness, diminishing breath sounds, shallow effort, and worsening hypoxemia can signal impending respiratory failure; airway and ventilatory support require immediate escalation.','Activate emergency escalation and prepare for advanced airway/ventilatory support.','Encourage the client to ambulate to mobilize secretions.','Delay intervention until an arterial blood gas result is available.','Teach pursed-lip breathing and reassess in one hour.'),
      ('pn','respiratory','Asthma','hard','Recognize Cues','An LPN/VN is monitoring a client treated for an asthma exacerbation. Which change requires immediate communication to the RN/provider?','A quieter chest accompanied by increasing drowsiness and worsening oxygenation may reflect critically reduced airflow rather than improvement.','Wheezing becomes barely audible while drowsiness increases and oxygen saturation falls.','The client reports mild tremor after a prescribed bronchodilator.','The respiratory rate decreases from 28 to 22/min while the client speaks more easily.','The client asks when discharge teaching will begin.'),
      ('rn','neurologic','Stroke','hard','Take Action','A hospitalized client suddenly develops aphasia and right arm weakness. The symptoms began 20 minutes ago. Which RN action has the highest priority?','Sudden focal neurologic deficits require immediate stroke-system activation and rapid determination of onset/last-known-well to preserve time-sensitive treatment options.','Activate the stroke response immediately and communicate the exact last-known-well time.','Give oral fluids to evaluate swallowing ability.','Allow the client to rest and repeat the examination in one hour.','Administer an as-needed sedative for anxiety.'),
      ('pn','neurologic','Stroke','hard','Recognize Cues','An LPN/VN notices that a previously stable client suddenly has facial asymmetry and difficulty speaking. What should the LPN/VN do first?','New focal neurologic deficits are time-critical and require immediate escalation rather than independent diagnostic evaluation or delayed reassessment.','Notify the RN/emergency response immediately and report when the client was last known at baseline.','Give the client water to determine whether swallowing is affected.','Finish the medication pass before reporting the change.','Ask the family to observe the client for another hour.'),
      ('rn','renal','Acute Kidney Injury','hard','Analyze Cues','The RN reviews data for a client with acute kidney injury: urine output 15 mL/hr for 3 hours, potassium 6.2 mEq/L, increasing muscle weakness, and new peaked T waves. Which problem is the immediate priority?','Severe hyperkalemia with ECG changes is immediately life-threatening because it can precipitate lethal dysrhythmias.','Hyperkalemia producing cardiac electrical instability.','Risk for constipation from reduced activity.','Knowledge deficit about a renal diet.','Disturbed sleep from overnight monitoring.'),
      ('pn','renal','Acute Kidney Injury','hard','Recognize Cues','An LPN/VN caring for a client with acute kidney injury sees a potassium result of 6.1 mEq/L and notes new irregular cardiac rhythm and weakness. Which response is priority?','Hyperkalemia plus cardiac rhythm changes represents potential instability and must be communicated immediately.','Report the findings immediately and follow the established urgent-response plan.','Wait for the next routine electrolyte panel to confirm the trend.','Encourage a potassium-rich snack before calling the RN.','Document the result and discuss it during shift report.'),
      ('rn','respiratory','Pulmonary Embolism','hard','Analyze Cues','Two days after hip surgery, a client develops sudden dyspnea, pleuritic chest pain, heart rate 128/min, and oxygen saturation 84% on room air. Which interpretation should guide the RN priority response?','The abrupt respiratory symptoms, tachycardia, hypoxemia, and thromboembolic risk strongly suggest pulmonary embolism with impaired oxygenation.','Suspected pulmonary embolism causing acute gas-exchange compromise.','Expected postoperative atelectasis requiring only ambulation.','Opioid withdrawal causing isolated tachycardia.','Normal physiologic response to postoperative pain.'),
      ('pn','respiratory','Pulmonary Embolism','hard','Take Action','An LPN/VN assisting a postoperative client observes sudden shortness of breath, chest pain, tachycardia, and oxygen saturation of 85%. What is the priority response?','Possible pulmonary embolism is an emergency. The LPN/VN should immediately summon RN/emergency assistance and support oxygenation according to the established protocol.','Call for immediate RN/emergency assistance and implement the established oxygen/emergency measures.','Walk the client in the hallway to improve lung expansion.','Leave the client to locate the postoperative teaching booklet.','Recheck the oxygen saturation after the client naps.'),
      ('rn','cardiovascular','Heart Failure','hard','Evaluate Outcomes','A client with acute decompensated heart failure receives prescribed therapy. Which trend best indicates effective treatment without evidence of excessive volume removal?','Improving oxygenation and congestion with stable perfusion and renal function best demonstrates effective, tolerable decongestion.','Dyspnea and crackles decrease, oxygenation improves, blood pressure remains adequate, and renal function stays stable.','Weight decreases rapidly while blood pressure falls and creatinine rises.','Peripheral edema improves but confusion and cool extremities develop.','Urine output increases while potassium falls to a critically low level.'),
      ('pn','cardiovascular','Heart Failure','hard','Recognize Cues','An LPN/VN is monitoring a client with heart failure. Which change should be reported promptly as possible worsening perfusion?','New confusion, cool extremities, hypotension, and decreasing urine output are concerning for reduced cardiac output and organ perfusion.','New confusion with cool extremities, lower blood pressure, and decreasing urine output.','A request for an extra blanket with otherwise stable findings.','One missed television program because the client slept.','Questions about the low-sodium diet.'),
      ('rn','neurologic','Seizures','hard','Take Action','A client has a generalized tonic-clonic seizure in bed. Which RN action is the priority during the seizure?','Immediate care focuses on preventing injury and maintaining airway safety; nothing should be forced into the mouth and restraints should not be applied.','Protect the client from injury, position for airway safety when feasible, and time/observe the seizure.','Insert a tongue blade between the teeth.','Restrain the extremities to stop tonic-clonic movement.','Give oral antiseizure medication during active convulsions.'),
      ('pn','neurologic','Seizures','hard','Evaluate Outcomes','An LPN/VN is observing a client after a generalized seizure. Which finding requires immediate escalation rather than routine postictal monitoring?','Persistent inability to maintain airway/oxygenation or recurrent seizure activity without recovery can indicate a neurologic emergency.','The client has recurrent seizure activity without regaining consciousness and oxygenation is worsening.','The client is sleepy but arouses and gradually becomes more oriented.','The client reports muscle soreness after becoming fully alert.','The client cannot remember the seizure event but follows commands.'),
      ('rn','renal','Chronic Kidney Disease & Dialysis','hard','Analyze Cues','During hemodialysis, a client becomes nauseated and restless, then develops headache and decreasing level of consciousness. Which RN interpretation is the priority?','New neurologic deterioration during dialysis is not an expected finding and requires immediate assessment and escalation for a potentially serious dialysis-related complication.','An acute dialysis-related neurologic complication requiring immediate intervention.','Expected fatigue that can be reassessed after discharge.','A normal response to removal of excess fluid.','A teaching issue best addressed at the next clinic visit.'),
      ('pn','renal','Chronic Kidney Disease & Dialysis','hard','Recognize Cues','An LPN/VN caring for a client after hemodialysis finds the access has no palpable thrill. What is the priority action?','Loss of a previously present thrill suggests access occlusion and threatens vascular access patency; it requires prompt escalation.','Report the absent thrill immediately and protect the access from compression or venipuncture.','Apply a tight pressure dressing over the entire access.','Use the access arm for a blood pressure to assess circulation.','Wait until the next dialysis treatment to reassess the access.')
    ) as x(track,system,topic,difficulty,cj,stem,rationale,correct,w1,w2,w3)
  loop
    qid := md5('npq-0019-'||r.track||'-'||r.system||'-'||r.topic||'-'||r.stem)::uuid;
    vid := md5('npq-0019-v-'||r.track||'-'||r.system||'-'||r.topic||'-'||r.stem)::uuid;
    correct_pos := (abs(hashtext(r.stem)) % 4) + 1;
    opts := array[r.w1,r.w2,r.w3];

    insert into public.questions(id,slug,lifecycle_status,current_version)
    values(qid,'0019-'||r.track||'-'||substr(md5(r.stem),1,12),'pilot',1)
    on conflict(id) do nothing;

    insert into public.question_versions(
      id,question_id,version,stem,item_type,exam_tracks,subject,topic,client_need,
      clinical_judgment_step,difficulty,rationale_correct,rationale_distractors,
      memory_rule,source_note,validation_status,professional_role_focus,track_rationale
    ) values(
      vid,qid,1,r.stem,'single_best_answer',array[r.track],
      case r.system when 'cardiovascular' then 'Adult Health: Cardiovascular' when 'respiratory' then 'Adult Health: Respiratory' when 'neurologic' then 'Adult Health: Neurologic' else 'Adult Health: Renal & Urinary' end,
      r.topic,'Physiological Adaptation',r.cj,r.difficulty,r.rationale,
      'Distractors represent delay, unsafe action, benign interpretation, or a lower-priority response that does not address the acute cue cluster.',
      'Prioritize instability and time-sensitive threats using clustered cues rather than a single isolated finding.',
      'Original NursePrepIQ pilot item. Not an NCSBN item. Requires clinical, NCLEX-alignment, editorial, and pilot validation before production.',
      'pilot',
      'RN/PN role calibrated to assessment/synthesis versus focused monitoring, implementation, and escalation.',
      case when r.track='rn' then 'RN item requires comprehensive cue synthesis, prioritization, intervention, or evaluation.' else 'PN item emphasizes focused recognition, safe implementation, and timely escalation within the established plan.' end
    ) on conflict(question_id,version) do nothing;

    for i in 1..4 loop
      insert into public.question_options(question_version_id,option_key,option_text,is_correct,rationale,display_order)
      values(
        vid,chr(96+i),
        case when i=correct_pos then r.correct else opts[case when i<correct_pos then i else i-1 end] end,
        i=correct_pos,
        case when i=correct_pos then r.rationale else 'This option delays care, misinterprets the cue cluster, or addresses a lower-priority need.' end,
        i
      ) on conflict(question_version_id,option_key) do nothing;
    end loop;
  end loop;
end $$;

commit;
