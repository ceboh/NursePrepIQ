-- NursePrepIQ Milestone 3: make RN/PN scope an explicit content property.
-- Run after 0002_question_engine.sql in the Supabase SQL Editor.

alter table public.question_versions
  add column if not exists professional_role_focus text,
  add column if not exists track_rationale text;

comment on column public.question_versions.professional_role_focus is
'What professional decision this item tests for the selected RN or PN pathway.';
comment on column public.question_versions.track_rationale is
'Why the item belongs to the selected pathway and how the reasoning should be framed for that role.';

-- Existing shared Heart Failure knowledge remains shared only where the decision itself is common to both roles.
update public.question_versions
set professional_role_focus='Recognize an acute change in respiratory status and respond promptly within the nurse''s role.',
    track_rationale='Shared foundational safety item. RN learners should connect the cue to comprehensive assessment and prioritization; PN learners should connect the cue to focused data collection, immediate safety actions within scope, and prompt communication/escalation.'
where question_id='22222222-2222-4222-8222-222222222222' and version=1;

update public.question_versions
set professional_role_focus='Recognize the clinical pattern of systemic venous congestion.',
    track_rationale='Shared pathophysiology knowledge. The underlying finding is appropriate for both pathways; later remediation should frame RN synthesis and PN observation/reporting responsibilities separately.'
where question_id='33333333-3333-4333-8333-333333333333' and version=1;

update public.question_versions
set professional_role_focus='Recognize effective heart-failure self-monitoring.',
    track_rationale='Shared patient-safety knowledge. RN teaching emphasizes planning and evaluation of education; PN teaching emphasizes reinforcing established education and reporting evidence that the plan is not understood.'
where question_id='44444444-4444-4444-8444-444444444444' and version=1;

-- First paired scope-sensitive cardiovascular items. These intentionally test different professional decisions.
insert into public.questions(id,slug,lifecycle_status,current_version) values
('61111111-1111-4111-8111-111111111111','rn-heart-failure-priority-assessment','active',1),
('62222222-2222-4222-8222-222222222222','pn-heart-failure-change-reporting','active',1)
on conflict (id) do update set lifecycle_status=excluded.lifecycle_status,current_version=excluded.current_version;

insert into public.question_versions(
 id,question_id,version,stem,item_type,exam_tracks,subject,topic,client_need,clinical_judgment_step,difficulty,
 rationale_correct,rationale_distractors,memory_rule,source_note,validation_status,professional_role_focus,track_rationale
) values
('71111111-1111-4111-8111-111111111111','61111111-1111-4111-8111-111111111111',1,
'The RN receives report on four clients with heart failure. Which client should the RN assess first?',
'single_best_answer',array['rn'],'Adult Health: Cardiovascular','Heart Failure','Physiological Integrity','Prioritize Hypotheses','medium',
'The client with new confusion, cool extremities, and a falling blood pressure has cues of worsening perfusion and possible decreased cardiac output. The RN should prioritize a comprehensive assessment of this unstable change and initiate appropriate escalation/interventions based on findings.',
'Chronic dependent edema and an established need for pillows are important but do not indicate the same degree of acute instability. A request for diet teaching can be addressed after physiologic threats are assessed.',
'RN priority: synthesize the trend, identify instability, then assess the highest physiologic threat first.',
'Original NursePrepIQ item aligned to 2026 NCLEX-RN entry-level assessment, prioritization, physiological adaptation and hemodynamic reasoning. Not an NCSBN item.',
'pilot','RN comprehensive assessment, synthesis of multiple cues, prioritization, and management of an unstable change.','RN-specific because the decision asks the learner to synthesize handoff data across clients and determine which client requires the RN''s priority comprehensive assessment.'),
('72222222-2222-4222-8222-222222222222','62222222-2222-4222-8222-222222222222',1,
'The LPN/VN is caring for a client with chronic heart failure whose usual ankle edema is unchanged. Which new finding should the LPN/VN report promptly to the RN or appropriate provider according to the care setting?',
'single_best_answer',array['pn'],'Adult Health: Cardiovascular','Heart Failure','Physiological Integrity','Recognize Cues','medium',
'New confusion with cool extremities and a blood pressure lower than the client''s usual baseline may signal worsening perfusion. The LPN/VN should recognize this change, collect relevant focused data, maintain safety, and promptly communicate the change according to the established plan and setting.',
'Unchanged chronic edema is not a new deterioration. A routine request for diet information and a stable longstanding sleep pattern do not outrank a new perfusion-related change.',
'PN priority: notice what changed, collect focused data, keep the client safe, and communicate significant deterioration promptly.',
'Original NursePrepIQ item aligned to 2026 NCLEX-PN entry-level care of commonly occurring problems, data collection, monitoring and contribution to the interdisciplinary team. Not an NCSBN item.',
'pilot','PN recognition of change from baseline, focused data collection, safety, and appropriate communication/escalation.','PN-specific because the decision centers on recognizing and reporting a significant change while functioning within the practical/vocational nurse role rather than independently managing the overall plan of care.')
on conflict (question_id,version) do nothing;

insert into public.question_options(question_version_id,option_key,option_text,is_correct,rationale,display_order) values
('71111111-1111-4111-8111-111111111111','a','A client with unchanged 2+ ankle edema who is awaiting morning medications.',false,'This is important but described as unchanged and does not indicate the greatest current instability.',1),
('71111111-1111-4111-8111-111111111111','b','A client who uses two pillows at home and reports no change in breathing.',false,'This is an established pattern without a new respiratory change.',2),
('71111111-1111-4111-8111-111111111111','c','A client with new confusion, cool extremities, and blood pressure trending below baseline.',true,'These clustered cues suggest worsening perfusion and require priority RN assessment.',3),
('71111111-1111-4111-8111-111111111111','d','A stable client asking for additional teaching about a low-sodium diet.',false,'Teaching matters, but a potential perfusion problem takes priority.',4),
('72222222-2222-4222-8222-222222222222','a','The client asks for written information about a low-sodium diet.',false,'This teaching need is not as urgent as a new physiologic change.',1),
('72222222-2222-4222-8222-222222222222','b','The client has the same 2+ ankle edema documented on previous shifts.',false,'This is an unchanged finding rather than a new deterioration.',2),
('72222222-2222-4222-8222-222222222222','c','The client has new confusion, cool extremities, and blood pressure below the usual baseline.',true,'These are new perfusion-related cues that require focused data collection and prompt communication/escalation.',3),
('72222222-2222-4222-8222-222222222222','d','The client reports routinely sleeping with two pillows and denies increased shortness of breath.',false,'This is a stable baseline pattern in the scenario.',4)
on conflict (question_version_id,option_key) do nothing;
