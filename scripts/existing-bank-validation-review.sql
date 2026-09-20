-- NursePrepIQ existing-bank validation review queue
-- REVIEW SUPPORT ONLY. This script does not create validation events, change
-- lifecycle state, or publish questions. Human/clinical review decisions must
-- continue through the existing guarded validation workflow.

-- 1) Bank-level state. Keeps lifecycle and validation counts distinct.
select
  total_current_versions,
  pilot,
  validated,
  production_active,
  schema_passed,
  clinical_passed,
  nclex_alignment_passed,
  editorial_passed,
  pilot_passed,
  promotion_ready
from public.question_validation_readiness_counts;

-- 2) Highest-value review queue: structurally sound pilot items that have not
-- yet received genuine clinical review. Review RN and PN coverage together.
select
  question_id,
  slug,
  exam_tracks,
  subject,
  topic,
  item_type,
  difficulty,
  clinical_judgment_step,
  gates_passed,
  next_gate
from public.question_validation_readiness
where lifecycle_status = 'pilot'
  and schema_pass
  and not clinical_pass
order by
  subject,
  topic,
  exam_tracks::text,
  slug;

-- 3) Questions that already have genuine clinical approval but still need the
-- next existing gate. This makes it possible to advance reviewed content
-- without touching items that are not clinically cleared.
select
  question_id,
  slug,
  exam_tracks,
  subject,
  topic,
  item_type,
  difficulty,
  clinical_judgment_step,
  gates_passed,
  next_gate
from public.question_validation_readiness
where lifecycle_status = 'pilot'
  and clinical_pass
  and next_gate <> 'promotion_ready'
order by gates_passed desc, subject, topic, slug;

-- 4) Promotion-ready candidates only. Presence here means all five existing
-- gates have pass evidence for the CURRENT version; it does not itself promote.
select
  question_id,
  slug,
  exam_tracks,
  subject,
  topic,
  item_type,
  difficulty,
  clinical_judgment_step,
  validation_status,
  lifecycle_status
from public.question_validation_readiness
where next_gate = 'promotion_ready'
order by subject, topic, exam_tracks::text, slug;

-- 5) Safety audit: this should return zero rows. Any row means production state
-- and validation state disagree and must be investigated before further release.
select
  question_id,
  slug,
  lifecycle_status,
  validation_status,
  gates_passed,
  next_gate
from public.question_validation_readiness
where lifecycle_status = 'active'
  and (
    validation_status <> 'production_validated'
    or next_gate <> 'promotion_ready'
  );
