-- NursePrepIQ 0062: retire repetitive GI factory clusters from production.
-- Keeps history/attempts; removes redundant scenario x NCJMM rehearsals from student-facing bank.
-- Replacement items must be curriculum-gap driven and independently original.
begin;

create table if not exists public.question_content_cleanup_audit(
 id bigserial primary key, question_id uuid not null, question_version integer not null,
 action text not null, reason text not null, created_at timestamptz not null default now()
);

-- The old factory expanded one clinical scenario across all six NCJMM functions.
-- For GI, retain only one representative per scenario/track; retire the other
-- function variants so students do not repeatedly rehearse the same cue cluster.
with ranked as (
 select q.id,q.current_version,q.slug,qv.exam_tracks,qv.topic,qv.stem,qv.clinical_judgment_step,
 row_number() over(
   partition by lower(trim(qv.topic)),array_to_string(qv.exam_tracks,',')
   order by case qv.clinical_judgment_step
     when 'Analyze Cues' then 1 when 'Take Action' then 2
     when 'Prioritize Hypotheses' then 3 when 'Evaluate Outcomes' then 4
     when 'Recognize Cues' then 5 else 6 end,q.slug
 ) rn
 from public.questions q join public.question_versions qv on qv.question_id=q.id and qv.version=q.current_version
 where q.lifecycle_status='active' and qv.validation_status='production_validated'
 and qv.body_system='Gastrointestinal'
), retire as (select * from ranked where rn>1)
insert into public.question_content_cleanup_audit(question_id,question_version,action,reason)
select id,current_version,'retire','0062 GI diversity cleanup: redundant scenario/topic variant from legacy scenario-by-six-NCJMM factory; history preserved.'
from retire;

update public.questions q set lifecycle_status='retired',updated_at=now()
where exists(
 select 1 from public.question_content_cleanup_audit a
 where a.question_id=q.id and a.question_version=q.current_version
 and a.action='retire' and a.reason like '0062 GI diversity cleanup:%'
);

commit;
