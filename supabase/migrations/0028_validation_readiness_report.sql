-- NursePrepIQ 0028: validation-readiness reporting for the cleaned bank.
-- Reporting only. Does not create validation passes and does not publish questions.

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
    when schema_pass and clinical_pass and nclex_alignment_pass and editorial_pass and pilot_pass then 'promotion_ready'
    when not schema_pass then 'needs_schema'
    when not clinical_pass then 'needs_clinical'
    when not nclex_alignment_pass then 'needs_nclex_alignment'
    when not editorial_pass then 'needs_editorial'
    when not pilot_pass then 'needs_pilot'
    else 'needs_review'
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
'Current-version validation state by question. Reporting only; no gate is inferred or fabricated.';
comment on view public.question_validation_readiness_counts is
'Keeps pilot, validated, production-active, individual gate passes, and promotion-ready counts distinct.';
