-- 0066: production-wide duplicate purge requested by owner.
-- Hard-deletes active production questions whose current stems are exact or strongly near-duplicate.
-- Keeps one representative (lowest question id) per duplicate cluster. No archive/audit copy is retained.

create extension if not exists pg_trgm;

create temporary table _production_current on commit drop as
select q.id as question_id,
       qv.version,
       qv.stem,
       lower(regexp_replace(trim(qv.stem), '[^a-zA-Z0-9]+', ' ', 'g')) as norm_stem,
       lower(coalesce(qv.body_system,'')) as body_system,
       lower(coalesce(qv.topic,'')) as topic,
       lower(coalesce(qv.discipline,'')) as discipline,
       q.exam_tracks
from public.questions q
join public.question_versions qv
  on qv.question_id=q.id and qv.version=q.current_version
where q.lifecycle_status='active'
  and qv.validation_status='production_validated';

create index on _production_current using gin (stem gin_trgm_ops);

create temporary table _duplicate_delete(question_id uuid primary key) on commit drop;

-- Exact/verbatim duplicates after punctuation/spacing normalization.
insert into _duplicate_delete(question_id)
select question_id
from (
  select question_id,
         row_number() over(partition by norm_stem order by question_id) rn
  from _production_current
  where length(norm_stem) > 0
) x
where rn > 1
on conflict do nothing;

-- Strong near-verbatim duplicates. Require shared taxonomy signal to reduce false positives.
-- 0.72 pg_trgm is intentionally conservative; this catches paraphrases and minor demographic/value swaps.
insert into _duplicate_delete(question_id)
select b.question_id
from _production_current a
join _production_current b on a.question_id < b.question_id
where b.question_id not in (select question_id from _duplicate_delete)
  and (
    (a.body_system<>'' and a.body_system=b.body_system) or
    (a.topic<>'' and a.topic=b.topic) or
    (a.discipline<>'' and a.discipline=b.discipline)
  )
  and similarity(a.stem,b.stem) >= 0.72
on conflict do nothing;

-- Hard delete requested: remove dependent maintenance audit rows first where FK is not cascading.
delete from public.anthropic_question_maintenance m
using _duplicate_delete d
where m.question_id=d.question_id;

-- Remove duplicate questions. Schema-owned ON DELETE CASCADE relationships remove versions/options.
delete from public.questions q
using _duplicate_delete d
where q.id=d.question_id;

-- Guard: no exact normalized production duplicates may remain.
do $$
begin
  if exists (
    select 1
    from public.questions q
    join public.question_versions qv on qv.question_id=q.id and qv.version=q.current_version
    where q.lifecycle_status='active' and qv.validation_status='production_validated'
    group by lower(regexp_replace(trim(qv.stem), '[^a-zA-Z0-9]+', ' ', 'g'))
    having count(*)>1
  ) then
    raise exception '0066 exact duplicate purge incomplete';
  end if;
end $$;

-- deployment retry marker: 2026-09-28
