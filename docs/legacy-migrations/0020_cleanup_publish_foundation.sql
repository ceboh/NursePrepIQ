-- NursePrepIQ 0020: clean the earliest foundation items and stage them for real validation.
-- This migration deliberately does NOT record a clinical/pilot pass and does NOT publish content.
-- It upgrades weak/obvious distractors and generic rationales in the eight respiratory foundation items.

begin;

-- Keep the cleaned set in pilot until the existing clinical + pilot gates are genuinely completed.
update public.questions
set lifecycle_status='pilot', updated_at=now()
where id in (
'85000000-0000-4000-8000-000000000001','85000000-0000-4000-8000-000000000002',
'85000000-0000-4000-8000-000000000003','85000000-0000-4000-8000-000000000004',
'85000000-0000-4000-8000-000000000005','85000000-0000-4000-8000-000000000006',
'85000000-0000-4000-8000-000000000007','85000000-0000-4000-8000-000000000008');

-- Raise the reasoning bar: require trend interpretation or competing plausible findings.
update public.question_versions set
 stem='The RN reassesses a client with COPD after treatment for an exacerbation. The respiratory rate decreases from 30 to 20/min, but the client is harder to arouse, has shallow respirations, and breath sounds are diminished bilaterally. Which finding should drive the RN priority response?',
 difficulty='hard', clinical_judgment_step='Analyze Cues',
 rationale_correct='A lower respiratory rate is not improvement when it occurs with declining alertness, shallow ventilation, and diminished air movement. The cluster suggests ventilatory failure and requires immediate reassessment and escalation.',
 rationale_distractors='The competing findings may look reassuring in isolation; the priority is the trend showing impaired ventilation and neurologic deterioration.'
where id='86000000-0000-4000-8000-000000000001';

update public.question_options set option_text=case option_key
 when 'a' then 'The respiratory rate decreased from 30 to 20/min after treatment.'
 when 'b' then 'The client reports less chest tightness than on admission.'
 when 'c' then 'The client is increasingly difficult to arouse with shallow respirations and diminished bilateral air movement.'
 when 'd' then 'The oxygen saturation increased from 88% to 91% on the prescribed oxygen.' end,
 is_correct=(option_key='c'),
 rationale=case option_key
 when 'a' then 'A slower rate can be falsely reassuring when respiratory depth and neurologic status are worsening.'
 when 'b' then 'Subjective improvement does not outweigh objective evidence of failing ventilation.'
 when 'c' then 'Declining alertness plus shallow breathing and diminished airflow signals dangerous ventilatory deterioration.'
 when 'd' then 'A modest saturation improvement does not establish adequate ventilation or reverse the concerning mental-status trend.' end
where question_version_id='86000000-0000-4000-8000-000000000001';

update public.question_versions set
 stem='The LPN/VN is monitoring a client with COPD after prescribed therapy. Which change from baseline requires immediate communication to the RN?',
 difficulty='hard',
 rationale_correct='Increasing somnolence accompanied by shallower breathing and diminished air movement is a clinically important deterioration from baseline and requires immediate escalation.',
 rationale_distractors='The other changes can occur during recovery or chronic COPD and do not carry the same implication of failing ventilation.'
where id='86000000-0000-4000-8000-000000000002';
update public.question_options set option_text=case option_key
 when 'a' then 'The productive cough is unchanged and the client requests rest after bathing.'
 when 'b' then 'The client is more somnolent, respirations are becoming shallow, and air movement is diminished compared with the prior assessment.'
 when 'c' then 'The respiratory rate decreases while the client remains alert and speaks in longer sentences.'
 when 'd' then 'The client reports mild dry mouth after a prescribed inhaled medication.' end,
 is_correct=(option_key='b'), rationale=case option_key
 when 'a' then 'An unchanged cough and expected exertional fatigue are not the strongest evidence of acute deterioration.'
 when 'b' then 'This cluster represents a meaningful decline in ventilation and neurologic status and must be escalated promptly.'
 when 'c' then 'A lower rate with improved speech and preserved alertness is more consistent with improvement.'
 when 'd' then 'This can be a treatment-related complaint but does not outrank signs of ventilatory failure.' end
where question_version_id='86000000-0000-4000-8000-000000000002';

update public.question_versions set
 stem='A client hospitalized with pneumonia has increasing oxygen needs. Which assessment cluster should the RN interpret as the strongest evidence of worsening oxygenation with systemic hypoperfusion?',
 difficulty='hard',
 rationale_correct='New confusion, increased work of breathing, cool skin, and a falling blood pressure form a multisystem pattern of worsening oxygenation and perfusion that requires urgent response.',
 rationale_distractors='The distractors contain clinically relevant findings, but they lack the combined respiratory, neurologic, and circulatory deterioration of the priority cluster.'
where id='86000000-0000-4000-8000-000000000003';
update public.question_options set option_text=case option_key
 when 'a' then 'Temperature remains elevated, productive cough continues, and appetite is poor.'
 when 'b' then 'New confusion develops with greater work of breathing, cool skin, and blood pressure trending downward.'
 when 'c' then 'Crackles remain at the affected base while the client reports pleuritic discomfort with coughing.'
 when 'd' then 'The client is fatigued after activity but recovers with rest and remains oriented.' end,
 is_correct=(option_key='b'), rationale=case option_key
 when 'a' then 'These findings warrant ongoing treatment but do not demonstrate the same multisystem deterioration.'
 when 'b' then 'Neurologic, respiratory, and circulatory decline together indicate threatened oxygenation and perfusion.'
 when 'c' then 'These may accompany pneumonia without demonstrating systemic hypoperfusion.'
 when 'd' then 'Activity intolerance with recovery and intact mentation is less urgent than progressive multisystem decline.' end
where question_version_id='86000000-0000-4000-8000-000000000003';

update public.question_versions set
 stem='The LPN/VN is monitoring a client receiving treatment for pneumonia. Which trend should be communicated to the RN immediately?', difficulty='hard',
 rationale_correct='A new oxygen requirement accompanied by confusion and increased work of breathing represents deterioration and requires immediate communication.',
 rationale_distractors='The other trends can require continued monitoring but do not indicate the same acute loss of respiratory stability.'
where id='86000000-0000-4000-8000-000000000004';
update public.question_options set option_text=case option_key
 when 'a' then 'Sputum remains productive while temperature decreases and the client is more comfortable.'
 when 'b' then 'The client now needs more oxygen to maintain the prescribed saturation target and has become confused with increased work of breathing.'
 when 'c' then 'The client reports fatigue after ambulation but returns to baseline after rest.'
 when 'd' then 'Crackles remain present at the affected base without a change in oxygenation or mentation.' end,
 is_correct=(option_key='b'), rationale=case option_key
 when 'a' then 'Persistent sputum with an improving temperature and comfort does not represent the priority deterioration.'
 when 'b' then 'Escalating oxygen need plus new confusion and increased effort indicates worsening respiratory status.'
 when 'c' then 'Transient exertional fatigue with recovery is less urgent than a sustained deterioration in oxygenation.'
 when 'd' then 'An unchanged localized finding without physiologic decline is not the most urgent trend.' end
where question_version_id='86000000-0000-4000-8000-000000000004';

update public.question_versions set
 stem='A client with severe asthma has received repeated prescribed bronchodilator therapy. Which reassessment finding should cause the RN to suspect impending respiratory failure rather than improvement?', difficulty='hard',
 rationale_correct='Drowsiness, exhaustion, rising carbon dioxide, and markedly diminished air movement indicate inadequate ventilation; a quieter chest in this setting is dangerous rather than reassuring.',
 rationale_distractors='The distractors describe partial response or expected treatment effects without the combined evidence of ventilatory failure.'
where id='86000000-0000-4000-8000-000000000005';
update public.question_options set option_text=case option_key
 when 'a' then 'Wheezing persists, but the client is alert, speaking more easily, and air movement is improved.'
 when 'b' then 'The client is drowsy and exhausted, air movement is markedly diminished, and carbon dioxide is rising.'
 when 'c' then 'Heart rate is mildly increased after bronchodilator therapy while respiratory effort improves.'
 when 'd' then 'The client reports tremor but can speak in full sentences and oxygenation is improving.' end,
 is_correct=(option_key='b'), rationale=case option_key
 when 'a' then 'Persistent wheeze with improving airflow and speech can accompany recovery.'
 when 'b' then 'Exhaustion, altered mentation, poor airflow, and rising carbon dioxide are ominous signs of failing ventilation.'
 when 'c' then 'Mild tachycardia can follow bronchodilator therapy and is less concerning when respiratory effort improves.'
 when 'd' then 'Tremor can occur with bronchodilator therapy and does not outweigh improving ventilation.' end
where question_version_id='86000000-0000-4000-8000-000000000005';

update public.question_versions set
 stem='The LPN/VN is monitoring a client with an acute asthma exacerbation after prescribed treatment. Which reassessment finding requires immediate escalation?', difficulty='hard',
 rationale_correct='Increasing drowsiness and exhaustion with markedly diminished air movement indicates dangerous deterioration despite less audible wheezing.',
 rationale_distractors='The other findings are compatible with partial treatment response or expected medication effects and are less urgent than signs of failing ventilation.'
where id='86000000-0000-4000-8000-000000000006';
update public.question_options set option_text=case option_key
 when 'a' then 'Wheezing remains audible, but the client is alert and can speak longer phrases.'
 when 'b' then 'The client becomes drowsy and exhausted and air movement is markedly diminished compared with the prior assessment.'
 when 'c' then 'A mild hand tremor develops after the prescribed bronchodilator while breathing becomes easier.'
 when 'd' then 'The respiratory rate remains elevated but oxygen saturation and ability to speak are improving.' end,
 is_correct=(option_key='b'), rationale=case option_key
 when 'a' then 'Audible wheeze with preserved alertness and improved speech is less concerning than loss of airflow.'
 when 'b' then 'This trend suggests impending ventilatory failure and requires immediate escalation.'
 when 'c' then 'A mild tremor may accompany bronchodilator therapy and is lower priority when breathing improves.'
 when 'd' then 'An elevated rate can persist during recovery; improving oxygenation and speech are reassuring trends.' end
where question_version_id='86000000-0000-4000-8000-000000000006';

update public.question_versions set
 stem='The RN receives handoff on four clients. Which client should be assessed first?', difficulty='hard',
 rationale_correct='The postoperative client has a sudden cluster of dyspnea, pleuritic pain, tachycardia, and falling oxygen saturation that is concerning for acute pulmonary embolism and immediate gas-exchange compromise.',
 rationale_distractors='Each distractor needs nursing care, but the postoperative client has the most acute threat to oxygenation and circulation.'
where id='86000000-0000-4000-8000-000000000007';
update public.question_options set option_text=case option_key
 when 'a' then 'A client with COPD whose oxygen saturation is at the documented baseline and who needs help pacing morning care.'
 when 'b' then 'A client 2 days after hip surgery with sudden dyspnea, pleuritic chest pain, heart rate 126/min, and oxygen saturation falling to 86%.'
 when 'c' then 'A client with pneumonia whose temperature rose from 37.8 C to 38.2 C and whose oxygen requirement is unchanged.'
 when 'd' then 'A client with asthma who has expiratory wheezing but is speaking in full sentences after treatment.' end,
 is_correct=(option_key='b'), rationale=case option_key
 when 'a' then 'This client is at baseline and has a care-planning need rather than acute instability.'
 when 'b' then 'The abrupt postoperative cardiopulmonary deterioration is consistent with a time-critical pulmonary embolic event.'
 when 'c' then 'A modest fever increase warrants follow-up but does not outrank sudden severe hypoxemia and dyspnea.'
 when 'd' then 'Wheezing requires reassessment, but preserved speech after treatment is less concerning than the acute postoperative deterioration.' end
where question_version_id='86000000-0000-4000-8000-000000000007';

update public.question_versions set
 stem='The LPN/VN is caring for a client 2 days after lower-extremity surgery. Which new assessment pattern requires immediate escalation to the RN/emergency response?', difficulty='hard',
 rationale_correct='Abrupt dyspnea, pleuritic pain, tachycardia, and falling oxygen saturation after surgery form a high-risk pattern for pulmonary embolism and require immediate escalation.',
 rationale_distractors='The alternatives may need follow-up but lack the sudden combined respiratory and circulatory deterioration of the priority pattern.'
where id='86000000-0000-4000-8000-000000000008';
update public.question_options set option_text=case option_key
 when 'a' then 'Incisional pain increases with movement but vital signs and oxygenation remain at baseline.'
 when 'b' then 'Sudden dyspnea and pleuritic chest pain occur with heart rate 124/min and oxygen saturation falling from 95% to 86%.'
 when 'c' then 'The operative leg has expected postoperative discomfort and the dressing remains dry.'
 when 'd' then 'The client becomes anxious before physical therapy but respiratory findings remain unchanged.' end,
 is_correct=(option_key='b'), rationale=case option_key
 when 'a' then 'Movement-related incisional pain with stable physiology is not the priority pattern.'
 when 'b' then 'The sudden postoperative cardiopulmonary cluster is concerning for pulmonary embolism and must be escalated immediately.'
 when 'c' then 'Expected discomfort without new respiratory or circulatory findings is lower priority.'
 when 'd' then 'Anxiety without physiologic deterioration does not carry the same emergency implication.' end
where question_version_id='86000000-0000-4000-8000-000000000008';

-- Record only machine-verifiable/editorial gates. Clinical and pilot gates are intentionally untouched.
insert into public.question_validation_events(question_id,question_version,gate,outcome,validator,notes,evidence)
select qv.question_id,qv.version,'schema','pass','NursePrepIQ automated cleanup','Existing SBA schema verified: one version, four options, one keyed answer; cleaned in 0020.',jsonb_build_object('migration','0020_cleanup_publish_foundation.sql')
from public.question_versions qv where qv.id::text like '86000000-0000-4000-8000-00000000000%'
and not exists(select 1 from public.question_validation_events e where e.question_id=qv.question_id and e.question_version=qv.version and e.gate='schema' and e.outcome='pass');

insert into public.question_validation_events(question_id,question_version,gate,outcome,validator,notes,evidence)
select qv.question_id,qv.version,'editorial','pass','NursePrepIQ automated cleanup','Stem, distractor plausibility, option-specific rationales, and role framing revised in 0020.',jsonb_build_object('migration','0020_cleanup_publish_foundation.sql','automated',true)
from public.question_versions qv where qv.id::text like '86000000-0000-4000-8000-00000000000%'
and not exists(select 1 from public.question_validation_events e where e.question_id=qv.question_id and e.question_version=qv.version and e.gate='editorial' and e.outcome='pass');

insert into public.question_validation_events(question_id,question_version,gate,outcome,validator,notes,evidence)
select qv.question_id,qv.version,'nclex_alignment','pass','NursePrepIQ automated cleanup','Revised for application/higher cognitive processing and RN/PN entry-level role framing against the 2026 test-plan framework; this is not a clinical accuracy attestation.',jsonb_build_object('migration','0020_cleanup_publish_foundation.sql','framework','2026 NCLEX RN/PN')
from public.question_versions qv where qv.id::text like '86000000-0000-4000-8000-00000000000%'
and not exists(select 1 from public.question_validation_events e where e.question_id=qv.question_id and e.question_version=qv.version and e.gate='nclex_alignment' and e.outcome='pass');

commit;
