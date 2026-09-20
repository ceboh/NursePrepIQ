-- NursePrepIQ 0026: cleanup legacy Heart Failure items from 0002/0003.
-- Purpose: raise reasoning quality and remove legacy active bypass.
-- No clinical/pilot validation is asserted here; all affected items remain pilot.

begin;

-- Legacy shared items: strengthen stems/distractors while preserving clinically correct concepts.
update public.question_versions set
  stem='A client with chronic heart failure has several findings during morning assessment. Which change requires the nurse to intervene first?',
  difficulty='medium',
  rationale_correct='New dyspnea at rest with increasing crackles represents an acute change in oxygenation and pulmonary congestion. A new breathing problem takes priority over stable chronic congestion findings and routine teaching needs.',
  rationale_distractors='The competing findings are clinically relevant, but they are either stable/baseline manifestations or nonurgent teaching needs and therefore do not outrank an acute respiratory change.',
  memory_rule='Trend beats snapshot: in heart failure, prioritize a NEW breathing or perfusion change over stable chronic congestion.'
where question_id='22222222-2222-4222-8222-222222222222' and version=1;

update public.question_options set option_text='The client reports sleeping on two pillows for the past 6 months with no recent change.', rationale='A stable, longstanding orthopnea pattern needs ongoing management but does not outrank a new respiratory deterioration.' where question_version_id='52222222-2222-4222-8222-222222222222' and option_key='a';
update public.question_options set option_text='The client has bilateral 2+ ankle edema unchanged from yesterday.', rationale='Unchanged dependent edema reflects congestion but is less urgent than a new breathing problem.' where question_version_id='52222222-2222-4222-8222-222222222222' and option_key='b';
update public.question_options set option_text='The client develops new dyspnea at rest with increasing bibasilar crackles.', rationale='This acute change suggests worsening pulmonary congestion and impaired oxygenation and requires prompt assessment/intervention.' where question_version_id='52222222-2222-4222-8222-222222222222' and option_key='c';
update public.question_options set option_text='The client asks how to record daily weights after discharge.', rationale='Teaching is important, but it can wait until acute physiologic threats are addressed.' where question_version_id='52222222-2222-4222-8222-222222222222' and option_key='d';

update public.question_versions set
  stem='The nurse reviews assessment data for a client with heart failure. Which cluster most strongly supports predominant systemic venous congestion?',
  difficulty='medium',
  rationale_correct='Jugular venous distention and dependent edema are manifestations of elevated systemic venous pressure and are characteristic of predominant right-sided congestion.',
  rationale_distractors='The other clusters primarily reflect pulmonary congestion or respiratory compromise rather than systemic venous backup.',
  memory_rule='Differentiate the congestion pattern: systemic venous backup produces JVD and dependent edema; pulmonary congestion produces crackles, orthopnea, and frothy sputum.'
where question_id='33333333-3333-4333-8333-333333333333' and version=1;
update public.question_options set option_text='Bibasilar crackles with worsening orthopnea', rationale='This cluster is more consistent with pulmonary congestion.' where question_version_id='53333333-3333-4333-8333-333333333333' and option_key='a';
update public.question_options set option_text='Jugular venous distention with increasing dependent edema', rationale='These findings directly reflect systemic venous congestion and best support predominant right-sided failure.' where question_version_id='53333333-3333-4333-8333-333333333333' and option_key='b';
update public.question_options set option_text='Pink frothy sputum with diffuse crackles', rationale='This cluster indicates severe pulmonary edema rather than predominant systemic venous congestion.' where question_version_id='53333333-3333-4333-8333-333333333333' and option_key='c';
update public.question_options set option_text='Increasing dyspnea when supine with an oxygen-saturation decline', rationale='This pattern points toward worsening pulmonary congestion/oxygenation rather than systemic venous backup.' where question_version_id='53333333-3333-4333-8333-333333333333' and option_key='d';

update public.question_versions set
  stem='After heart-failure self-management teaching, which client statement gives the nurse the strongest evidence that the client can detect fluid retention early at home?',
  difficulty='medium',
  rationale_correct='Daily weights obtained under comparable conditions are a sensitive way to identify fluid accumulation before more obvious congestion develops. The client should also follow the individualized plan for reporting concerning changes.',
  rationale_distractors='Waiting for visible edema, independently changing fluid intake, or stopping symptom monitoring can delay recognition or lead to unsafe self-management.',
  memory_rule='Heart-failure self-monitoring: consistent daily weights reveal fluid trends earlier than visible edema.'
where question_id='44444444-4444-4444-8444-444444444444' and version=1;
update public.question_options set option_text='I will wait until my shoes feel tight before I start weighing myself.', rationale='Visible or symptomatic edema may occur after fluid has already accumulated; routine consistent weights detect trends earlier.' where question_version_id='54444444-4444-4444-8444-444444444444' and option_key='a';
update public.question_options set option_text='I will weigh myself at about the same time each day under similar conditions and follow my plan for reporting a concerning increase.', rationale='Comparable daily measurements improve trend detection and link the finding to the established follow-up plan.' where question_version_id='54444444-4444-4444-8444-444444444444' and option_key='b';
update public.question_options set option_text='If my weight rises, I will automatically drink extra fluid to improve circulation.', rationale='Fluid changes should follow the individualized treatment plan; automatically increasing intake may worsen congestion.' where question_version_id='54444444-4444-4444-8444-444444444444' and option_key='c';
update public.question_options set option_text='When I feel well for several days, I can stop tracking weight and symptoms.', rationale='Heart failure can worsen before symptoms become obvious; ongoing monitoring remains important.' where question_version_id='54444444-4444-4444-8444-444444444444' and option_key='d';

-- RN/PN paired items: make distractors more competitive and role-calibrated.
update public.question_versions set difficulty='hard', rationale_distractors='Each competing client needs nursing attention, but the priority is determined by evidence of acute impaired perfusion rather than stable congestion, a chronic baseline pattern, or a teaching need.' where question_id='61111111-1111-4111-8111-111111111111' and version=1;
update public.question_options set option_text='A client whose ankle edema increased from 1+ to 2+ overnight and who denies dyspnea.', rationale='The worsening edema requires assessment, but acute altered mentation with hypotension and cool extremities indicates a more immediate perfusion threat.' where question_version_id='71111111-1111-4111-8111-111111111111' and option_key='a';
update public.question_options set option_text='A client with chronic three-pillow orthopnea whose respiratory status is unchanged from baseline.', rationale='This is clinically important but described as the client’s stable baseline rather than an acute deterioration.' where question_version_id='71111111-1111-4111-8111-111111111111' and option_key='b';
update public.question_options set option_text='A client with new confusion, cool extremities, and systolic blood pressure falling from 118 to 86 mm Hg.', rationale='The cluster indicates worsening organ perfusion and possible low cardiac output, making this the priority comprehensive RN assessment.' where question_version_id='71111111-1111-4111-8111-111111111111' and option_key='c';
update public.question_options set option_text='A stable client who needs clarification about sodium limits before discharge later today.', rationale='Discharge teaching is necessary but does not outrank evidence of acute circulatory instability.' where question_version_id='71111111-1111-4111-8111-111111111111' and option_key='d';

update public.question_versions set difficulty='hard', rationale_distractors='The alternatives represent teaching needs or congestion findings that require monitoring, but they do not signal the same acute perfusion deterioration as the correct cue cluster.' where question_id='62222222-2222-4222-8222-222222222222' and version=1;
update public.question_options set option_text='The client reports needing an additional pillow overnight but has stable vital signs and no dyspnea at rest.', rationale='This change warrants focused follow-up, but the perfusion-related cue cluster is more immediately concerning.' where question_version_id='72222222-2222-4222-8222-222222222222' and option_key='a';
update public.question_options set option_text='Bilateral ankle edema increases from 1+ to 2+ while oxygen saturation and blood pressure remain at baseline.', rationale='Increasing edema should be monitored and communicated according to the plan, but it is less urgent than signs of reduced organ perfusion.' where question_version_id='72222222-2222-4222-8222-222222222222' and option_key='b';
update public.question_options set option_text='The client becomes newly confused with cool extremities and blood pressure well below the documented baseline.', rationale='These new findings suggest impaired perfusion; the LPN/VN should collect focused data, maintain safety, and promptly escalate the change.' where question_version_id='72222222-2222-4222-8222-222222222222' and option_key='c';
update public.question_options set option_text='The client asks for reinforcement of previously taught low-sodium food choices.', rationale='Reinforcement is appropriate PN care but can follow escalation of an acute physiologic change.' where question_version_id='72222222-2222-4222-8222-222222222222' and option_key='d';

-- Remove the legacy active-state bypass. Cleanup is not clinical/pilot validation.
update public.questions set lifecycle_status='pilot', updated_at=now()
where id in (
 '22222222-2222-4222-8222-222222222222',
 '33333333-3333-4333-8333-333333333333',
 '44444444-4444-4444-8444-444444444444',
 '61111111-1111-4111-8111-111111111111',
 '62222222-2222-4222-8222-222222222222'
);
update public.question_versions set validation_status='pilot'
where question_id in (
 '22222222-2222-4222-8222-222222222222',
 '33333333-3333-4333-8333-333333333333',
 '44444444-4444-4444-8444-444444444444',
 '61111111-1111-4111-8111-111111111111',
 '62222222-2222-4222-8222-222222222222'
) and version=1;

commit;
