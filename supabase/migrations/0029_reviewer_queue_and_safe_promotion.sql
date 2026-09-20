-- NursePrepIQ 0029: actionable reviewer queue + safe promotion helper.
-- Does NOT create clinical/human validation events and does NOT auto-publish.
-- Purpose: make the cleaned pilot bank easy to review, and make publication a
-- single guarded admin action once genuine validation events already exist.

begin;

create or replace view public.question_review_queue as
select
  r.question_id,
  r.slug,
  r.current_version,
  r.exam_tracks,
  r.subject,
  r.topic,
  r.item_type,
  r.difficulty,
  r.clinical_judgment_step,
  r.lifecycle_status,
  r.validation_status,
  r.schema_pass,
  r.clinical_pass,
  r.nclex_alignment_pass,
  r.editorial_pass,
  r.pilot_pass,
  r.gates_passed,
  r.next_gate,
  case r.next_gate
    when 'needs_schema' then 10
    when 'needs_clinical' then 20
    when 'needs_nclex_alignment' then 30
    when 'needs_editorial' then 40
    when 'needs_pilot' then 50
    when 'promotion_ready' then 60
    else 99
  end as queue_order
from public.question_validation_readiness r
where r.lifecycle_status <> 'retired';

comment on view public.question_review_queue is
'Current cleaned-bank review queue. Read-only reporting; no validation outcome is inferred or created.';

create or replace view public.question_publication_safety_audit as
select
  r.question_id,
  r.slug,
  r.current_version,
  r.lifecycle_status,
  r.validation_status,
  r.gates_passed,
  r.next_gate,
  (r.lifecycle_status='active' and r.validation_status='production_validated' and r.next_gate='promotion_ready') as publication_invariant_ok
from public.question_validation_readiness r
where r.lifecycle_status='active'
   or r.validation_status='production_validated';

comment on view public.question_publication_safety_audit is
'Audits active/validated current versions against the full five-gate publication invariant.';

create or replace function public.promote_all_ready_questions()
returns table(question_id uuid, question_version integer)
language plpgsql
security invoker
set search_path=public
as $$
declare
  candidate record;
begin
  for candidate in
    select r.question_id, r.current_version
    from public.question_validation_readiness r
    where r.next_gate='promotion_ready'
      and (r.lifecycle_status <> 'active' or r.validation_status <> 'production_validated')
    order by r.slug
  loop
    -- Reuse the canonical guarded function. It re-checks every required gate
    -- and refuses promotion if a later fail/needs_review supersedes a pass.
    perform public.promote_question_to_production(candidate.question_id,candidate.current_version);
    question_id := candidate.question_id;
    question_version := candidate.current_version;
    return next;
  end loop;
end;
$$;

revoke all on function public.promote_all_ready_questions() from public, anon, authenticated;

comment on function public.promote_all_ready_questions() is
'Admin/service helper that promotes only versions already passing all five genuine validation gates. Creates no validation events.';

commit;

-- Operator queries after applying this migration:
-- select * from public.question_pipeline_counts;
-- select next_gate,count(*) from public.question_review_queue group by next_gate order by next_gate;
-- select * from public.question_publication_safety_audit where not publication_invariant_ok;
-- When genuine review events make items promotion_ready, an admin/service session may run:
-- select * from public.promote_all_ready_questions();
