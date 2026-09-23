-- NursePrepIQ 0020: clean up the original respiratory foundation bank.
-- Replaces low-discrimination wording/distractors in the 8 existing RN/PN respiratory items.
-- Keeps all items PILOT. This migration does NOT fabricate clinical/pilot validation or publish content.

begin;

-- RN COPD: trend interpretation rather than simple acute-vs-routine recognition.
update public.question_versions set
  stem='A client with COPD who usually uses 2 L/min oxygen is increasingly somnolent. Respiratory rate changed from 24 to 10/min, breaths are shallow, SpO2 is 88% on the prescribed oxygen, and breath sounds are diminished bilaterally. Which finding should drive the RN priority response?',
  difficulty='hard', clinical_judgment_step='Analyze Cues',
  rationale_correct='The combination of declining level of consciousness, slower shallow respirations, persistent hypoxemia, and diminished air movement indicates worsening ventilation and possible respiratory failure. The RN should treat the trend as deterioration rather than attributing somnolence to fatigue alone.',
  rationale_distractors='The alternatives each use a real COPD consideration but fail to account for the dangerous change from baseline and the converging ventilation cues.',
  memory_rule='COPD deterioration is a trend: mentation + respiratory depth/rate + oxygenation + air movement matter together.'
where id='86000000-0000-4000-8000-000000000001';
update public.question_options set option_text=case option_key
 when 'a' then 'The SpO2 is below the client’s usual target despite prescribed oxygen.'
 when 'b' then 'The client has diminished breath sounds, which can occur with COPD.'
 when 'c' then 'Somnolence is increasing as respirations become slower and shallow.'
 when 'd' then 'The client is receiving supplemental oxygen and therefore should be observed before escalation.' end,
 is_correct=(option_key='c'), rationale=case option_key
 when 'a' then 'Persistent hypoxemia matters, but the worsening mentation plus slowing shallow ventilation identifies the more immediate threat.'
 when 'b' then 'Diminished breath sounds alone may be chronic; paired with the new ventilatory and neurologic decline they become more concerning.'
 when 'c' then 'This change signals failing ventilation and requires immediate reassessment and escalation.'
 when 'd' then 'Prescribed oxygen does not make worsening hypoventilation safe to observe without prompt action.' end
where question_version_id='86000000-0000-4000-8000-000000000001';

-- PN COPD: focused change recognition and escalation.
update public.question_versions set
 stem='An LPN/VN is monitoring a client with COPD. At 0800 the client was alert, RR 22/min, SpO2 92% on prescribed oxygen. At 1000 the client is difficult to arouse, RR 11/min with shallow breaths, and SpO2 is 88%. Which action is the priority?',
 difficulty='hard', clinical_judgment_step='Take Action',
 rationale_correct='The client has a significant change in mentation, ventilation, and oxygenation. The LPN/VN should remain with the client, obtain focused data while immediately escalating to the RN/emergency response according to the established plan.',
 rationale_distractors='Rechecking later, independently changing the treatment plan, or attributing the change to expected COPD delays response to deterioration.',
 memory_rule='PN: compare with baseline, protect the client, collect focused data, and escalate acute respiratory deterioration.'
where id='86000000-0000-4000-8000-000000000002';
update public.question_options set option_text=case option_key
 when 'a' then 'Recheck the oxygen saturation in 15 minutes because values below baseline can occur with COPD.'
 when 'b' then 'Remain with the client, obtain focused respiratory data, and immediately notify the RN/activate the established response.'
 when 'c' then 'Increase the oxygen flow substantially without an order and reassess before notifying the RN.'
 when 'd' then 'Allow the client to sleep because fatigue is common with chronic lung disease.' end,
 is_correct=(option_key='b'), rationale=case option_key
 when 'a' then 'The combined decline in mentation, respiratory rate/depth, and oxygenation makes delayed reassessment unsafe.'
 when 'b' then 'This matches PN focused assessment, safety, and prompt escalation for a significant change from baseline.'
 when 'c' then 'The client needs immediate escalation; independently changing therapy outside the established plan is not the safest first response.'
 when 'd' then 'New difficulty arousing the client with hypoventilation is not routine fatigue.' end
where question_version_id='86000000-0000-4000-8000-000000000002';

-- RN pneumonia: distinguish sepsis/respiratory deterioration among plausible findings.
update public.question_versions set
 stem='The RN reassesses a 76-year-old client admitted with pneumonia. Four hours ago: T 38.1 C, HR 96, BP 128/72, RR 22, alert. Now: T 39.2 C, HR 124, BP 92/56, RR 30, SpO2 89% on prescribed oxygen, and new confusion. Which interpretation should guide the RN priority?',
 difficulty='hard', clinical_judgment_step='Analyze Cues',
 rationale_correct='The worsening fever, tachycardia, hypotension, tachypnea, hypoxemia, and acute confusion form a cluster of systemic and respiratory deterioration requiring urgent escalation.',
 rationale_distractors='Each alternative explains one finding but fails to integrate the multi-system trend indicating instability.',
 memory_rule='Pneumonia: compare trends; hypotension + confusion + respiratory worsening signals systemic deterioration.'
where id='86000000-0000-4000-8000-000000000003';
update public.question_options set option_text=case option_key
 when 'a' then 'The fever alone explains the tachycardia, so continue routine monitoring.'
 when 'b' then 'The client is showing acute respiratory and systemic deterioration requiring immediate escalation.'
 when 'c' then 'The confusion is most likely age-related delirium and can be reassessed after the fever decreases.'
 when 'd' then 'The lower blood pressure is expected with bed rest if urine output remains adequate.' end,
 is_correct=(option_key='b'), rationale=case option_key
 when 'a' then 'Fever may increase heart rate but does not adequately explain the hypotension, hypoxemia, tachypnea, and new confusion.'
 when 'b' then 'The converging respiratory, perfusion, and neurologic changes indicate instability.'
 when 'c' then 'Acute confusion in this context is a deterioration cue, not a finding to dismiss because of age.'
 when 'd' then 'New hypotension accompanying the other changes is concerning for impaired perfusion.' end
where question_version_id='86000000-0000-4000-8000-000000000003';

-- PN pneumonia.
update public.question_versions set
 stem='An LPN/VN caring for a client with pneumonia notes that since the previous assessment the client is newly confused, RR increased from 22 to 30/min, SpO2 fell from 94% to 89% on prescribed oxygen, and BP fell from 124/70 to 96/58. What should the LPN/VN do first?',
 difficulty='hard', clinical_judgment_step='Take Action',
 rationale_correct='The cluster represents meaningful respiratory and perfusion deterioration. The LPN/VN should remain with the client, collect focused data, maintain safety, and promptly escalate according to the established response plan.',
 rationale_distractors='The competing actions address real nursing tasks but would delay recognition and escalation of an unstable trend.',
 memory_rule='PN pneumonia: a worsening trend across oxygenation, breathing, mentation, and pressure requires immediate escalation.'
where id='86000000-0000-4000-8000-000000000004';
update public.question_options set option_text=case option_key
 when 'a' then 'Assist the client to cough and deep breathe, then repeat the full assessment in 30 minutes.'
 when 'b' then 'Remain with the client, obtain focused data, and immediately report/activate the established escalation process.'
 when 'c' then 'Administer the next scheduled oral medication before contacting the RN.'
 when 'd' then 'Document the changes first so the complete trend is available when the RN is notified.' end,
 is_correct=(option_key='b'), rationale=case option_key
 when 'a' then 'Pulmonary hygiene may be appropriate but should not delay escalation of multi-system deterioration.'
 when 'b' then 'This prioritizes safety, focused monitoring, and timely communication within PN scope.'
 when 'c' then 'Routine medication administration should not delay response to acute deterioration.'
 when 'd' then 'Documentation is important but follows immediate safety assessment and escalation.' end
where question_version_id='86000000-0000-4000-8000-000000000004';

-- RN asthma.
update public.question_versions set
 stem='A client with an acute asthma exacerbation has received prescribed bronchodilator therapy. Thirty minutes later the client is drowsy, speaks only one word at a time, RR has fallen from 34 to 18/min with shallow effort, SpO2 is 86%, and wheezing is now barely audible. How should the RN interpret this change?',
 difficulty='hard', clinical_judgment_step='Analyze Cues',
 rationale_correct='The quieter chest is accompanied by exhaustion, altered mentation, shallow effort, and worsening hypoxemia; it reflects critically reduced airflow and impending respiratory failure, not improvement.',
 rationale_distractors='A falling respiratory rate or quieter wheeze can appear favorable in isolation, but the entire cue cluster shows worsening ventilation.',
 memory_rule='Asthma: quieter is not better when air movement, mentation, effort, and oxygenation worsen.'
where id='86000000-0000-4000-8000-000000000005';
update public.question_options set option_text=case option_key
 when 'a' then 'Bronchospasm is resolving because wheezing and respiratory rate have decreased.'
 when 'b' then 'The client is developing impending respiratory failure from severely reduced airflow.'
 when 'c' then 'The drowsiness is an expected effect of relief after prolonged anxiety.'
 when 'd' then 'The oxygen saturation can be reassessed after another bronchodilator treatment because the client is breathing more slowly.' end,
 is_correct=(option_key='b'), rationale=case option_key
 when 'a' then 'The accompanying shallow effort, hypoxemia, and drowsiness make the quieter chest ominous rather than reassuring.'
 when 'b' then 'This interpretation integrates the worsening neurologic, oxygenation, speech, and airflow cues.'
 when 'c' then 'New drowsiness during worsening hypoxemia is a danger sign, not expected relaxation.'
 when 'd' then 'The client requires immediate escalation rather than delayed reassessment.' end
where question_version_id='86000000-0000-4000-8000-000000000005';

-- PN asthma.
update public.question_versions set
 stem='An LPN/VN reassesses a client being treated for an asthma exacerbation. Wheezing is less audible, but the client is increasingly drowsy, can no longer speak in full phrases, and SpO2 has fallen to 87% on prescribed oxygen. Which action is the priority?',
 difficulty='hard', clinical_judgment_step='Take Action',
 rationale_correct='Less audible wheezing with worsening mentation, speech, and oxygenation can indicate severely reduced airflow. The LPN/VN should recognize deterioration and immediately escalate while maintaining airway/oxygenation measures within the established plan.',
 rationale_distractors='The other choices misinterpret quieter wheezing as improvement or delay escalation for routine care.',
 memory_rule='PN asthma: assess the whole trend; a quiet chest with worsening mentation/oxygenation is an emergency.'
where id='86000000-0000-4000-8000-000000000006';
update public.question_options set option_text=case option_key
 when 'a' then 'Document improvement because wheezing is less prominent.'
 when 'b' then 'Immediately notify the RN/activate the established response while supporting oxygenation and remaining with the client.'
 when 'c' then 'Encourage oral fluids and reassess after the client rests.'
 when 'd' then 'Wait for the next scheduled respiratory treatment because the respiratory rate is not provided.' end,
 is_correct=(option_key='b'), rationale=case option_key
 when 'a' then 'Quieter wheezing is not improvement when mentation, speech, and oxygenation worsen.'
 when 'b' then 'This is the appropriate PN response to signs of impending respiratory failure.'
 when 'c' then 'Oral intake is not the priority and may be unsafe during significant respiratory distress.'
 when 'd' then 'The available cues already demonstrate deterioration and should not be delayed for another measurement.' end
where question_version_id='86000000-0000-4000-8000-000000000006';

-- RN pulmonary embolism: four-client prioritization with plausible competitors.
update public.question_versions set
 stem='The RN receives handoff on four postoperative clients. Which client should be assessed first?',
 difficulty='hard', clinical_judgment_step='Prioritize Hypotheses',
 rationale_correct='Sudden dyspnea, pleuritic chest pain, tachycardia, and hypoxemia after hip surgery create a high-risk pattern for pulmonary embolism and an immediate oxygenation threat.',
 rationale_distractors='The other clients have findings that require nursing attention, but their current data do not indicate the same immediate threat to oxygenation and circulation.',
 memory_rule='Across clients, prioritize the acute threat to airway, breathing, circulation, or neurologic function over stable or expected problems.'
where id='86000000-0000-4000-8000-000000000007';
update public.question_options set option_text=case option_key
 when 'a' then 'A client 1 day after abdominal surgery with pain 8/10, HR 104/min, BP 138/82, and SpO2 95% on room air.'
 when 'b' then 'A client 2 days after hip surgery with sudden dyspnea, pleuritic chest pain, HR 128/min, and SpO2 84% on room air.'
 when 'c' then 'A client after bowel surgery with urine output averaging 25 mL/hr for the last 2 hours and BP 112/68.'
 when 'd' then 'A client after knee surgery with unilateral calf tenderness and swelling but no dyspnea, chest pain, or hypoxemia.' end,
 is_correct=(option_key='b'), rationale=case option_key
 when 'a' then 'Severe postoperative pain requires treatment, but current oxygenation and hemodynamics are comparatively stable.'
 when 'b' then 'This client has an acute oxygenation threat and classic high-risk PE cue cluster.'
 when 'c' then 'Low urine output requires assessment but is not as immediately threatening as severe acute hypoxemia with suspected PE.'
 when 'd' then 'Possible DVT requires prompt evaluation, but the client with respiratory compromise is the immediate priority.' end
where question_version_id='86000000-0000-4000-8000-000000000007';

-- PN pulmonary embolism.
update public.question_versions set
 stem='An LPN/VN is assisting a client on postoperative day 2 after hip surgery. The client suddenly reports sharp chest pain and shortness of breath; HR is 126/min and SpO2 falls from 95% to 85% on room air. What should the LPN/VN do first?',
 difficulty='hard', clinical_judgment_step='Take Action',
 rationale_correct='The abrupt symptoms and hypoxemia after major orthopedic surgery are concerning for pulmonary embolism. The LPN/VN should stay with the client, summon RN/emergency assistance, and implement established oxygen/emergency measures.',
 rationale_distractors='Ambulation, delayed confirmation, or completing routine tasks first could worsen risk or delay treatment of a potentially life-threatening event.',
 memory_rule='PN suspected PE: stay, summon help, support oxygenation per protocol, and report the acute change immediately.'
where id='86000000-0000-4000-8000-000000000008';
update public.question_options set option_text=case option_key
 when 'a' then 'Assist the client to ambulate because postoperative atelectasis is common.'
 when 'b' then 'Stay with the client, call for immediate RN/emergency assistance, and implement established oxygen/emergency measures.'
 when 'c' then 'Recheck the saturation after obtaining a complete pain history to confirm the symptoms are not incisional.'
 when 'd' then 'Finish the scheduled medication pass, then report the change if the symptoms persist.' end,
 is_correct=(option_key='b'), rationale=case option_key
 when 'a' then 'Ambulation is unsafe in a client with sudden severe cardiopulmonary symptoms and suspected PE.'
 when 'b' then 'This provides immediate safety, escalation, and oxygenation support within the established plan.'
 when 'c' then 'Further history should not delay emergency response to abrupt hypoxemia and chest symptoms.'
 when 'd' then 'Routine tasks must not delay escalation of a potentially life-threatening change.' end
where question_version_id='86000000-0000-4000-8000-000000000008';

-- Preserve pilot lifecycle/validation state after cleanup.
update public.questions set lifecycle_status='pilot', updated_at=now()
where id in (
 '85000000-0000-4000-8000-000000000001','85000000-0000-4000-8000-000000000002',
 '85000000-0000-4000-8000-000000000003','85000000-0000-4000-8000-000000000004',
 '85000000-0000-4000-8000-000000000005','85000000-0000-4000-8000-000000000006',
 '85000000-0000-4000-8000-000000000007','85000000-0000-4000-8000-000000000008'
);
update public.question_versions set validation_status='pilot'
where id between '86000000-0000-4000-8000-000000000001'::uuid and '86000000-0000-4000-8000-000000000008'::uuid;

commit;
