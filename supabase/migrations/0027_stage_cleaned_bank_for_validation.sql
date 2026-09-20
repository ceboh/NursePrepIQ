-- NursePrepIQ 0027: stage the cleaned legacy bank for real validation.
-- No clinical or pilot pass is recorded here. Nothing is promoted to production.
-- This migration only (1) keeps the cleaned current bank in pilot and
-- (2) records a schema pass when the database itself proves the item is structurally valid.

begin;

-- The pre-expansion bank contains 117 current items across the original question migrations.
-- Keep every non-retired item out of production until the remaining human/clinical gates pass.
update public.questions q
set lifecycle_status = 'pilot', updated_at = now()
where q.lifecycle_status <> 'retired'
  and exists (
    select 1
    from public.question_versions qv
    where qv.question_id = q.id
      and qv.version = q.current_version
      and qv.validation_status <> 'production_validated'
  );

update public.question_versions qv
set validation_status = 'pilot'
from public.questions q
where q.id = qv.question_id
  and qv.version = q.current_version
  and q.lifecycle_status = 'pilot'
  and qv.validation_status <> 'production_validated';

-- Record only a machine-verifiable schema pass. This is intentionally conservative:
-- exactly four ordered options, exactly one correct answer, nonblank stem/rationales,
-- recognized RN/PN track, difficulty, subject/topic, and clinical-judgment metadata.
insert into public.question_validation_events(
  question_id, question_version, gate, outcome, validator, notes, evidence
)
select
  q.id,
  q.current_version,
  'schema',
  'pass',
  'nurseprepiq-structural-audit-0027',
  'Machine-verifiable structural audit only; does not imply clinical, NCLEX-alignment, editorial, or pilot approval.',
  jsonb_build_object(
    'option_count', count(qo.id),
    'correct_option_count', count(qo.id) filter (where qo.is_correct),
    'track', qv.exam_tracks,
    'difficulty', qv.difficulty,
    'item_type', qv.item_type
  )
from public.questions q
join public.question_versions qv
  on qv.question_id = q.id and qv.version = q.current_version
join public.question_options qo
  on qo.question_version_id = qv.id
where q.lifecycle_status = 'pilot'
  and btrim(qv.stem) <> ''
  and btrim(qv.rationale_correct) <> ''
  and btrim(qv.rationale_distractors) <> ''
  and btrim(qv.subject) <> ''
  and btrim(qv.topic) <> ''
  and qv.clinical_judgment_step is not null
  and qv.difficulty in ('easy','medium','hard')
  and qv.exam_tracks && array['rn','pn']::text[]
group by q.id, q.current_version, qv.exam_tracks, qv.difficulty, qv.item_type
having count(qo.id) = 4
   and count(qo.id) filter (where qo.is_correct) = 1
   and count(distinct qo.display_order) = 4
   and min(qo.display_order) = 1
   and max(qo.display_order) = 4
on conflict do nothing;

-- Remove any stale schema failure/review event that predates the latest successful structural audit.
-- Historical events are retained; readiness logic already uses the latest pass/fail chronology.

commit;

-- Manual review remains required before production promotion:
--   clinical -> pass
--   nclex_alignment -> pass
--   editorial -> pass
--   pilot -> pass
-- Then use public.promote_question_to_production(question_id,current_version).
