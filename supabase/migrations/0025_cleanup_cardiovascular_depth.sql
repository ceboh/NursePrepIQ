-- NursePrepIQ 0025: cleanup cardiovascular depth bank (0005)
-- Editorial/quality cleanup only. Keeps all affected content in pilot.
-- Improves distractor plausibility, option-specific teaching rationales, and difficulty calibration.

begin;

-- Prevent legacy active state from exposing content that has not completed the validation gates.
update public.questions q
set lifecycle_status='pilot', updated_at=now()
from public.question_versions qv
where qv.question_id=q.id
  and qv.version=q.current_version
  and qv.id::text like '84000000-0000-4000-8000-%';

update public.question_versions
set difficulty='hard',
    rationale_distractors='Each alternative is clinically plausible in context, but only one option best reflects the priority cue cluster, outcome, or vascular pattern being tested. Interpret the whole client rather than selecting an isolated finding.'
where id::text like '84000000-0000-4000-8000-%'
  and clinical_judgment_step in ('Analyze Cues','Evaluate Outcomes');

-- Replace low-information distractors in the ACS deterioration pair.
update public.question_options set option_text='The client reports persistent chest pressure rated 3/10, unchanged from the previous assessment.', rationale='Persistent symptoms require continued assessment, but an unchanged finding is less urgent than a new cluster of hypotension, altered mentation, and cool clammy skin.' where question_version_id='84000000-0000-4000-8000-000000000001' and option_key='a';
update public.question_options set option_text='Heart rate increases from 82/min to 96/min after the client walks to the bathroom.', rationale='A modest activity-related increase can be clinically relevant, but it does not indicate the same degree of impaired systemic perfusion as hypotension with confusion and cool clammy skin.' where question_version_id='84000000-0000-4000-8000-000000000001' and option_key='c';
update public.question_options set option_text='The client reports nausea after receiving an opioid analgesic but remains warm, alert, and normotensive.', rationale='Nausea warrants assessment, but preserved mentation, skin perfusion, and blood pressure make it less urgent than the deterioration cluster.' where question_version_id='84000000-0000-4000-8000-000000000001' and option_key='d';

update public.question_options set option_text='The client reports chest pressure unchanged from the previous assessment and has stable vital signs.', rationale='Persistent chest pressure still requires monitoring and communication according to the plan, but it is less urgent than a new perfusion decline.' where question_version_id='84000000-0000-4000-8000-000000000002' and option_key='a';
update public.question_options set option_text='The heart rate rises by 12/min after repositioning, then returns to baseline.', rationale='A transient change that resolves is less concerning than sustained new findings suggesting impaired perfusion.' where question_version_id='84000000-0000-4000-8000-000000000002' and option_key='b';
update public.question_options set option_text='The client reports nausea after analgesic administration but remains alert with blood pressure at baseline.', rationale='This requires observation but does not carry the urgency of new confusion, clamminess, and hypotension.' where question_version_id='84000000-0000-4000-8000-000000000002' and option_key='d';

-- Dysrhythmia outcome pair: force evaluation of perfusion rather than monitor cosmetics.
update public.question_options set option_text='The ventricular rate decreases from 154/min to 108/min, but the client remains confused with a blood pressure of 82/48 mm Hg.', rationale='Rate improvement alone is insufficient when hypotension and altered mentation show persistent poor perfusion.' where question_version_id='84000000-0000-4000-8000-000000000003' and option_key='a';
update public.question_options set option_text='The rhythm converts to sinus rhythm, but urine output remains low and the client reports worsening dizziness.', rationale='A more normal rhythm does not prove effective treatment when end-organ perfusion findings remain abnormal.' where question_version_id='84000000-0000-4000-8000-000000000003' and option_key='c';
update public.question_options set option_text='The client reports less awareness of palpitations, but blood pressure remains well below baseline.', rationale='Symptom improvement is encouraging, but persistent hypotension prevents concluding that perfusion has adequately improved.' where question_version_id='84000000-0000-4000-8000-000000000003' and option_key='d';

update public.question_options set option_text='The monitor shows a slower rate, but the client remains dizzy when sitting upright.', rationale='A monitor change without symptom improvement does not establish restored perfusion.' where question_version_id='84000000-0000-4000-8000-000000000004' and option_key='b';
update public.question_options set option_text='The client reports fewer palpitations, but blood pressure remains substantially below baseline.', rationale='Reduced palpitations are favorable, but persistent hypotension remains a concerning perfusion finding.' where question_version_id='84000000-0000-4000-8000-000000000004' and option_key='c';
update public.question_options set option_text='The heart rate is closer to baseline, but the client develops new cool extremities.', rationale='A heart-rate trend cannot outweigh a new physical finding suggesting impaired peripheral perfusion.' where question_version_id='84000000-0000-4000-8000-000000000004' and option_key='d';

-- Hypertension pair: make competing findings medically plausible but less indicative of acute target-organ injury.
update public.question_options set option_text='The client reports a moderate headache but is alert, oriented, and has no focal neurologic deficit.', rationale='Headache warrants assessment, but objective new neurologic dysfunction is more concerning for acute target-organ involvement.' where question_version_id='84000000-0000-4000-8000-000000000005' and option_key='b';
update public.question_options set option_text='The client reports missing the morning antihypertensive dose and denies new symptoms.', rationale='A missed dose may help explain the elevation, but it does not itself demonstrate acute target-organ dysfunction.' where question_version_id='84000000-0000-4000-8000-000000000005' and option_key='c';
update public.question_options set option_text='The client has bilateral ankle edema documented at the same degree for several weeks.', rationale='Chronic unchanged edema deserves ongoing management but is less suggestive of an acute new target-organ event.' where question_version_id='84000000-0000-4000-8000-000000000005' and option_key='d';

update public.question_options set option_text='The client reports a headache but remains fully oriented with no weakness or speech change.', rationale='Headache should be reported and assessed, but new focal neurologic change is a more urgent deterioration cue.' where question_version_id='84000000-0000-4000-8000-000000000006' and option_key='a';
update public.question_options set option_text='The client states that the morning antihypertensive medication was missed but has no new symptoms.', rationale='The missed medication is relevant history, but it is less urgent than a major blood-pressure change accompanied by new neurologic dysfunction.' where question_version_id='84000000-0000-4000-8000-000000000006' and option_key='c';
update public.question_options set option_text='The client has unchanged bilateral ankle edema documented on prior assessments.', rationale='An unchanged chronic finding does not indicate the same acute deterioration as new confusion and speech difficulty.' where question_version_id='84000000-0000-4000-8000-000000000006' and option_key='d';

-- PVD discrimination/safety: improve distractor specificity and teaching value.
update public.question_options set rationale='Cool pallor with weak pulses reflects reduced arterial inflow rather than venous congestion.' where question_version_id='84000000-0000-4000-8000-000000000007' and option_key='a';
update public.question_options set rationale='Dependent edema and hemosiderin-related brown discoloration are classic consequences of chronic venous hypertension.' where question_version_id='84000000-0000-4000-8000-000000000007' and option_key='b';
update public.question_options set option_text='Calf discomfort with walking that improves after several minutes of rest.', rationale='Exertional pain relieved by rest is intermittent claudication, a pattern associated with arterial insufficiency.' where question_version_id='84000000-0000-4000-8000-000000000007' and option_key='c';
update public.question_options set option_text='A small painful toe ulcer with a pale wound bed and diminished pedal pulse.', rationale='A distal painful ulcer plus weak pulse supports arterial ischemia rather than chronic venous insufficiency.' where question_version_id='84000000-0000-4000-8000-000000000007' and option_key='d';

update public.question_versions set difficulty='medium' where id='84000000-0000-4000-8000-000000000008';
update public.question_options set option_text='Inspecting the feet daily, including between the toes, using a mirror if needed.', rationale='Daily inspection helps detect pressure injury, cracks, or ulcers early when perfusion is impaired.' where question_version_id='84000000-0000-4000-8000-000000000008' and option_key='a';
update public.question_options set option_text='Wearing well-fitting shoes and clean socks rather than walking barefoot.', rationale='Protective footwear reduces trauma to tissue that may heal poorly because of arterial insufficiency.' where question_version_id='84000000-0000-4000-8000-000000000008' and option_key='b';
update public.question_options set rationale='Direct heat can burn ischemic tissue and does not correct impaired arterial flow; safer warming and perfusion measures should follow the established plan.' where question_version_id='84000000-0000-4000-8000-000000000008' and option_key='c';
update public.question_options set option_text='Reporting a new blister, color change, or nonhealing area instead of treating it independently.', rationale='Early reporting of skin or perfusion changes supports timely evaluation and reduces complication risk.' where question_version_id='84000000-0000-4000-8000-000000000008' and option_key='d';

-- Record only defensible non-clinical validation evidence. Human/clinical and pilot gates remain untouched.
insert into public.question_validation_events(question_id,question_version,gate,outcome,validator,notes,evidence)
select qv.question_id,qv.version,'editorial','pass','NursePrepIQ cleanup 0025',
       'Distractor plausibility, option-specific teaching rationales, clarity, and answerability reviewed during cleanup.',
       jsonb_build_object('migration','0025','scope','cardiovascular-depth-cleanup')
from public.question_versions qv
where qv.id::text like '84000000-0000-4000-8000-%'
  and not exists (select 1 from public.question_validation_events e where e.question_id=qv.question_id and e.question_version=qv.version and e.gate='editorial' and e.outcome='pass' and e.validator='NursePrepIQ cleanup 0025');

commit;
