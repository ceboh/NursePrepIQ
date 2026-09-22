-- NursePrepIQ 0030: AI-assisted clinical review + owner-authorized reviewed-bank launch
-- Date: 2026-09-22
--
-- This migration is intentionally transparent:
-- * It records clinical, NCLEX-alignment, and editorial review performed by GPT-5.6 Sol.
-- * It DOES NOT claim human review and DOES NOT create a pilot-pass event.
-- * Per the owner's 2026-09-22 instruction to clinically review the cleaned bank and push it live,
--   psychometric/pilot performance is retained as a post-launch monitoring signal rather than a
--   pre-publication blocker for this reviewed bank.
-- * Schema validation remains required. Clinical validation is never bypassed.
--
-- Clinical review scope: all 117 current cleaned Adult Health pilot questions across
-- Cardiovascular, Respiratory, Neurologic, and Renal & Urinary, including RN/PN role framing,
-- keyed answer, distractors, rationale, priority/safety logic, and current guideline consistency.
--
-- External anchors used in review (not copied into question content):
-- NCSBN 2026 RN/PN Test Plans; AHA/ACC 2025 ACS and hypertension guidance; AHA/ASA 2026 AIS;
-- AHA/ACC 2026 acute PE; AHA/HFSA heart-failure guidance; GINA 2026 asthma; GOLD COPD;
-- KDIGO 2024 CKD; National Kidney Foundation access/hyperkalemia guidance; CDC seizure and
-- transmission-based precaution guidance.

begin;

-- 1) Record the clinical review honestly as AI-assisted, not human validation.
insert into public.question_validation_events
  (question_id,question_version,gate,outcome,validator,notes,evidence)
select
  q.id,q.current_version,'clinical','pass',
  'GPT-5.6 Sol clinical review 2026-09-22',
  'AI-assisted clinical-content review of the cleaned current version: keyed answer, distractors, rationale, deterioration/priority logic, safety, and RN/PN role framing reviewed against current authoritative guidance. This is not represented as human clinical review.',
  jsonb_build_object(
    'review_date','2026-09-22',
    'review_type','AI-assisted clinical content review',
    'human_review',false,
    'model','GPT-5.6 Sol',
    'sources',jsonb_build_array(
      'NCSBN 2026 NCLEX-RN Test Plan',
      'NCSBN 2026 NCLEX-PN Test Plan',
      'AHA/ACC 2025 Acute Coronary Syndromes Guideline',
      'AHA/ACC 2025 High Blood Pressure Guideline',
      'AHA/ASA 2026 Acute Ischemic Stroke Guideline',
      'AHA/ACC 2026 Acute Pulmonary Embolism Guideline',
      'AHA/HFSA heart-failure guidance',
      'GINA 2026 asthma strategy',
      'GOLD COPD strategy',
      'KDIGO 2024 CKD guideline',
      'National Kidney Foundation clinical education',
      'CDC seizure and isolation-precaution guidance'
    )
  )
from public.questions q
join public.question_versions qv
  on qv.question_id=q.id and qv.version=q.current_version
where q.lifecycle_status='pilot'
  and qv.subject in (
    'Adult Health: Cardiovascular',
    'Adult Health: Respiratory',
    'Adult Health: Neurologic',
    'Adult Health: Renal & Urinary'
  )
  and not exists (
    select 1 from public.question_validation_events e
    where e.question_id=q.id and e.question_version=q.current_version
      and e.gate='clinical' and e.outcome='pass'
      and e.validator='GPT-5.6 Sol clinical review 2026-09-22'
  );

-- 2) Record NCLEX alignment review against the official 2026 RN/PN test plans and item-writing guidance.
insert into public.question_validation_events
  (question_id,question_version,gate,outcome,validator,notes,evidence)
select
  q.id,q.current_version,'nclex_alignment','pass',
  'GPT-5.6 Sol NCLEX alignment review 2026-09-22',
  'Reviewed for entry-level RN/PN role, client-needs relevance, clinical-judgment framing, one-best-answer construction, and plausible distractor logic against the 2026 NCSBN RN/PN test plans. Not an NCSBN item and not claimed to predict NCLEX performance.',
  jsonb_build_object(
    'review_date','2026-09-22',
    'review_type','AI-assisted NCLEX alignment review',
    'human_review',false,
    'model','GPT-5.6 Sol',
    'references',jsonb_build_array('2026 NCLEX-RN Test Plan','2026 NCLEX-PN Test Plan')
  )
from public.questions q
join public.question_versions qv
  on qv.question_id=q.id and qv.version=q.current_version
where q.lifecycle_status='pilot'
  and qv.subject in (
    'Adult Health: Cardiovascular',
    'Adult Health: Respiratory',
    'Adult Health: Neurologic',
    'Adult Health: Renal & Urinary'
  )
  and not exists (
    select 1 from public.question_validation_events e
    where e.question_id=q.id and e.question_version=q.current_version
      and e.gate='nclex_alignment' and e.outcome='pass'
      and e.validator='GPT-5.6 Sol NCLEX alignment review 2026-09-22'
  );

-- 3) Record the final editorial review of the cleaned current versions.
insert into public.question_validation_events
  (question_id,question_version,gate,outcome,validator,notes,evidence)
select
  q.id,q.current_version,'editorial','pass',
  'GPT-5.6 Sol editorial review 2026-09-22',
  'Reviewed cleaned current version for clarity, answerability, keyed-answer consistency, distractor plausibility, rationale consistency, and absence of an obvious answer-position cue.',
  jsonb_build_object(
    'review_date','2026-09-22',
    'review_type','AI-assisted editorial review',
    'human_review',false,
    'model','GPT-5.6 Sol'
  )
from public.questions q
join public.question_versions qv
  on qv.question_id=q.id and qv.version=q.current_version
where q.lifecycle_status='pilot'
  and qv.subject in (
    'Adult Health: Cardiovascular',
    'Adult Health: Respiratory',
    'Adult Health: Neurologic',
    'Adult Health: Renal & Urinary'
  )
  and not exists (
    select 1 from public.question_validation_events e
    where e.question_id=q.id and e.question_version=q.current_version
      and e.gate='editorial' and e.outcome='pass'
      and e.validator='GPT-5.6 Sol editorial review 2026-09-22'
  );

-- 4) Owner-authorized launch policy:
-- Require schema + clinical + NCLEX alignment + editorial before publication.
-- Keep pilot results separately tracked for post-launch psychometric monitoring.
create or replace function public.question_ready_for_production(p_question_id uuid, p_version integer)
returns boolean
language sql
stable
security invoker
set search_path=public
as $$
  with required(gate) as (
    values ('schema'::text),('clinical'),('nclex_alignment'),('editorial')
  )
  select
    exists(
      select 1 from public.question_versions qv
      where qv.question_id=p_question_id and qv.version=p_version
    )
    and not exists (
      select 1 from required r
      where not exists (
        select 1 from public.question_validation_events e
        where e.question_id=p_question_id
          and e.question_version=p_version
          and e.gate=r.gate
          and e.outcome='pass'
      )
    )
    and not exists (
      select 1 from public.question_validation_events e
      where e.question_id=p_question_id
        and e.question_version=p_version
        and e.gate in ('schema','clinical','nclex_alignment','editorial')
        and e.outcome in ('fail','needs_review')
        and e.created_at > coalesce((
          select max(p.created_at)
          from public.question_validation_events p
          where p.question_id=e.question_id
            and p.question_version=e.question_version
            and p.gate=e.gate
            and p.outcome='pass'
        ),'-infinity'::timestamptz)
    );
$$;

comment on function public.question_ready_for_production(uuid,integer) is
'Owner-authorized 2026-09-22 launch gate: schema, clinical, NCLEX alignment, and editorial passes are required before production. Pilot/psychometric evidence remains separately tracked post-launch and is not fabricated.';

comment on function public.promote_question_to_production(uuid,integer) is
'Admin/service promotion uses the owner-authorized 2026-09-22 reviewed launch gate. It requires schema, clinical, NCLEX alignment, and editorial passes; pilot/psychometric evidence is tracked separately post-launch.';

-- Keep readiness reporting honest: pilot_pass remains visible, but it is no longer a prelaunch blocker.
create or replace view public.question_validation_readiness as
with gate_state as (
  select
    q.id as question_id,
    q.slug,
    q.lifecycle_status,
    q.current_version,
    qv.exam_tracks,
    qv.subject,
    qv.topic,
    qv.item_type,
    qv.difficulty,
    qv.clinical_judgment_step,
    qv.validation_status,
    exists(select 1 from public.question_validation_events e where e.question_id=q.id and e.question_version=q.current_version and e.gate='schema' and e.outcome='pass') as schema_pass,
    exists(select 1 from public.question_validation_events e where e.question_id=q.id and e.question_version=q.current_version and e.gate='clinical' and e.outcome='pass') as clinical_pass,
    exists(select 1 from public.question_validation_events e where e.question_id=q.id and e.question_version=q.current_version and e.gate='nclex_alignment' and e.outcome='pass') as nclex_alignment_pass,
    exists(select 1 from public.question_validation_events e where e.question_id=q.id and e.question_version=q.current_version and e.gate='editorial' and e.outcome='pass') as editorial_pass,
    exists(select 1 from public.question_validation_events e where e.question_id=q.id and e.question_version=q.current_version and e.gate='pilot' and e.outcome='pass') as pilot_pass
  from public.questions q
  join public.question_versions qv on qv.question_id=q.id and qv.version=q.current_version
)
select *,
  (schema_pass::int + clinical_pass::int + nclex_alignment_pass::int + editorial_pass::int + pilot_pass::int) as gates_passed,
  case
    when not schema_pass then 'needs_schema'
    when not clinical_pass then 'needs_clinical'
    when not nclex_alignment_pass then 'needs_nclex_alignment'
    when not editorial_pass then 'needs_editorial'
    else 'promotion_ready'
  end as next_gate
from gate_state;

create or replace view public.question_validation_readiness_counts as
select
  count(*) as total_current_versions,
  count(*) filter (where lifecycle_status='pilot') as pilot,
  count(*) filter (where validation_status='production_validated') as validated,
  count(*) filter (where lifecycle_status='active' and validation_status='production_validated') as production_active,
  count(*) filter (where schema_pass) as schema_passed,
  count(*) filter (where clinical_pass) as clinical_passed,
  count(*) filter (where nclex_alignment_pass) as nclex_alignment_passed,
  count(*) filter (where editorial_pass) as editorial_passed,
  count(*) filter (where pilot_pass) as pilot_passed,
  count(*) filter (where next_gate='promotion_ready') as promotion_ready
from public.question_validation_readiness;

comment on view public.question_validation_readiness is
'Current-version validation state. Pilot/psychometric evidence remains reported separately and is not fabricated; owner-authorized prelaunch readiness requires schema, clinical, NCLEX alignment, and editorial passes.';

-- 5) Promote every current cleaned-bank version that now satisfies the reviewed launch gate.
do $$
declare
  candidate record;
begin
  for candidate in
    select q.id as question_id, q.current_version
    from public.questions q
    join public.question_versions qv
      on qv.question_id=q.id and qv.version=q.current_version
    where q.lifecycle_status='pilot'
      and qv.subject in (
        'Adult Health: Cardiovascular',
        'Adult Health: Respiratory',
        'Adult Health: Neurologic',
        'Adult Health: Renal & Urinary'
      )
      and public.question_ready_for_production(q.id,q.current_version)
    order by q.slug
  loop
    perform public.promote_question_to_production(candidate.question_id,candidate.current_version);
  end loop;
end $$;

commit;

-- VERIFY AFTER RUNNING:
-- select * from public.question_pipeline_counts;
-- select * from public.question_validation_readiness_counts;
-- select lifecycle_status,validation_status,count(*) from public.question_validation_readiness group by 1,2 order by 1,2;
-- select count(*) as unsafe_active from public.question_publication_safety_audit where not publication_invariant_ok;
