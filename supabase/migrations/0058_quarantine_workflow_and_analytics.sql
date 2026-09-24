-- NursePrepIQ 0058: quarantine workflow + analytics protection.
begin;

alter table public.question_versions add column if not exists quarantine_reason text;
alter table public.question_versions add column if not exists quarantined_at timestamptz;

create or replace function public.quarantine_key_inconsistent_question(
  p_question_id uuid,p_version integer,p_notes text
) returns void language plpgsql security definer set search_path=public as $$
begin
  update public.questions set lifecycle_status='review',updated_at=now()
   where id=p_question_id and current_version=p_version;
  update public.question_versions
     set key_consistency_status='fail',key_consistency_checked_at=now(),
         key_consistency_notes=p_notes,quarantine_reason='KEY_MISMATCH',
         quarantined_at=now(),validation_status='needs_review'
   where question_id=p_question_id and version=p_version;
  insert into public.question_validation_events
    (question_id,question_version,gate,outcome,validator,notes,evidence)
  values(p_question_id,p_version,'key_consistency','fail','NursePrepIQ production checksum',p_notes,
    jsonb_build_object('human_review',false,'psychometric_validation',false,'action','quarantined_from_production','reason','KEY_MISMATCH','checked_at',now()));
end $$;

create or replace view public.question_item_health as
with a as (
 select question_id,question_version,count(*) attempts,
 avg(case when is_correct then 1.0 else 0.0 end) proportion_correct,
 avg(response_time_ms) avg_response_time_ms,
 percentile_cont(0.5) within group(order by response_time_ms) median_response_time_ms
 from public.question_attempts group by question_id,question_version
), f as (
 select question_id,question_version,
 count(*) filter(where feedback_code='confusing') confusing_reports,
 count(*) filter(where feedback_code='multiple_answers_possible') multiple_answer_reports,
 count(*) filter(where feedback_code='disagree_with_key') key_disagreement_reports,
 count(*) filter(where feedback_code='possibly_inaccurate') accuracy_reports
 from public.question_feedback group by question_id,question_version
)
select q.id question_id,q.slug,q.current_version,q.lifecycle_status,
 qv.key_consistency_status,qv.quarantine_reason,qv.quarantined_at,
 coalesce(a.attempts,0) attempts,a.proportion_correct,a.avg_response_time_ms,a.median_response_time_ms,
 coalesce(f.confusing_reports,0) confusing_reports,coalesce(f.multiple_answer_reports,0) multiple_answer_reports,
 coalesce(f.key_disagreement_reports,0) key_disagreement_reports,coalesce(f.accuracy_reports,0) accuracy_reports,
 (qv.key_consistency_status='fail' or qv.validation_status<>'production_validated') analytics_excluded
from public.questions q
join public.question_versions qv on qv.question_id=q.id and qv.version=q.current_version
left join a on a.question_id=q.id and a.question_version=q.current_version
left join f on f.question_id=q.id and f.question_version=q.current_version;

create or replace view public.student_valid_question_attempts as
select a.* from public.question_attempts a
join public.question_versions qv on qv.question_id=a.question_id and qv.version=a.question_version
where qv.key_consistency_status<>'fail';

commit;
