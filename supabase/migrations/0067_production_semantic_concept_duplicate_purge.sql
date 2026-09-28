-- 0067: deeper production concept/semantic duplicate purge.
-- Owner requested hard deletion: redundant questions are not archived.
-- Keeps the richer representative when two production items test essentially the same concept.
begin;

create extension if not exists pg_trgm;

create temporary table _p67 on commit drop as
select q.id question_id, qv.id version_id,
       coalesce(qv.stem,'') stem,
       coalesce(qv.rationale_correct,'') rationale,
       lower(trim(coalesce(qv.topic,''))) topic,
       lower(trim(coalesce(qv.subject,''))) subject,
       lower(trim(coalesce(qv.client_need,''))) client_need,
       lower(trim(coalesce(qv.body_system,''))) body_system,
       lower(trim(coalesce(qv.discipline,''))) discipline,
       length(coalesce(qv.stem,''))+length(coalesce(qv.rationale_correct,'')) richness
from public.questions q
join public.question_versions qv on qv.question_id=q.id and qv.version=q.current_version
where q.lifecycle_status='active' and qv.validation_status='production_validated';

create temporary table _p67_delete(question_id uuid primary key, reason text) on commit drop;

-- Same named clinical topic + same tested client need: catch substantial paraphrases.
insert into _p67_delete
select case when a.richness < b.richness then a.question_id
            when b.richness < a.richness then b.question_id
            else greatest(a.question_id,b.question_id) end,
       '0067 concept duplicate: same topic/client need with strongly overlapping stem/rationale'
from _p67 a join _p67 b on a.question_id < b.question_id
where a.topic<>'' and a.topic=b.topic
  and a.client_need<>'' and a.client_need=b.client_need
  and (
    similarity(a.stem,b.stem)>=0.48
    or similarity(a.rationale,b.rationale)>=0.62
    or (similarity(a.stem,b.stem)>=0.38 and similarity(a.rationale,b.rationale)>=0.42)
  )
on conflict(question_id) do nothing;

-- Same topic + same discipline/subject: catch repeated learning objectives even if client-need labels drifted.
insert into _p67_delete
select case when a.richness < b.richness then a.question_id
            when b.richness < a.richness then b.question_id
            else greatest(a.question_id,b.question_id) end,
       '0067 semantic duplicate: same clinical topic/domain with highly overlapping answer rationale'
from _p67 a join _p67 b on a.question_id < b.question_id
where a.topic<>'' and a.topic=b.topic
  and ((a.discipline<>'' and a.discipline=b.discipline) or (a.subject<>'' and a.subject=b.subject))
  and similarity(a.rationale,b.rationale)>=0.68
  and similarity(a.stem,b.stem)>=0.28
on conflict(question_id) do nothing;

do $$
declare n_before integer; n_candidates integer;
begin
 select count(*) into n_before from _p67;
 select count(*) into n_candidates from _p67_delete;
 raise notice '0067 production before=%; semantic/concept duplicates selected=%',n_before,n_candidates;
end $$;

-- Remove non-cascading maintenance references, then hard-delete questions as requested.
delete from public.anthropic_question_maintenance m
using _p67_delete d where m.question_id=d.question_id;

delete from public.questions q
using _p67_delete d where q.id=d.question_id;

do $$
declare n_after integer;
begin
 select count(*) into n_after
 from public.questions q join public.question_versions qv
   on qv.question_id=q.id and qv.version=q.current_version
 where q.lifecycle_status='active' and qv.validation_status='production_validated';
 raise notice '0067 production after=%',n_after;
end $$;

-- Do not create a unique index across historical question_versions: older production-validated
-- versions remain for history and can legitimately share stems. Admission prevention belongs
-- in the import/promotion gate, while this migration cleans CURRENT active production only.
commit;
