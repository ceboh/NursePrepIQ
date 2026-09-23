-- NursePrepIQ 0034: AI-assisted validation events for pilot batches 0032/0033
-- Date: 2026-09-23
-- SAFETY: records review outcomes only. Does not promote, publish, or claim human/psychometric validation.
-- Review report: docs/VALIDATION_REVIEW_0032_0033.md

begin;

-- Clinical review: pass all reviewed variants except the 0032 C. difficile set,
-- which needs revision to match current CDC healthcare hand-hygiene guidance.
insert into public.question_validation_events
(question_id,question_version,gate,outcome,validator,notes,evidence)
select q.id,q.current_version,'clinical',
  case when q.slug like '0032-%-c-difficile-%' then 'needs_review' else 'pass' end,
  'GPT-5.6 Sol AI-assisted validation review 2026-09-23',
  case when q.slug like '0032-%-c-difficile-%'
    then 'Needs revision: keyed hand-hygiene wording overstates soap-and-water as a universal post-care requirement for C. difficile. Current CDC healthcare guidance prefers ABHS in most routine clinical situations when hands are not visibly soiled; soap-and-water is emphasized for visibly soiled hands and during C. difficile outbreaks.'
    else 'AI-assisted clinical review of scenario, keyed action, safety priority, distractors, rationale, and RN/PN framing. This is not human review and is not psychometric validation.'
  end,
  jsonb_build_object('review_date','2026-09-23','review_type','AI-assisted clinical validation','human_review',false,'psychometric_validation',false,'model','GPT-5.6 Sol','report','docs/VALIDATION_REVIEW_0032_0033.md')
from public.questions q
where (q.slug like '0032-%' or q.slug like '0033-%')
and not exists (
  select 1 from public.question_validation_events e
  where e.question_id=q.id and e.question_version=q.current_version and e.gate='clinical'
    and e.validator='GPT-5.6 Sol AI-assisted validation review 2026-09-23'
);

-- NCLEX alignment: only Generate Solutions and Take Action variants currently have
-- answer choices that match the assigned clinical-judgment function. Other rotated
-- functions use action choices and therefore need construct remediation.
insert into public.question_validation_events
(question_id,question_version,gate,outcome,validator,notes,evidence)
select q.id,q.current_version,'nclex_alignment',
  case when qv.clinical_judgment_step in ('Generate Solutions','Take Action') then 'pass' else 'needs_review' end,
  'GPT-5.6 Sol AI-assisted validation review 2026-09-23',
  case when qv.clinical_judgment_step in ('Generate Solutions','Take Action')
    then 'AI-assisted alignment review: action-oriented choices are congruent with the assigned clinical-judgment function and entry-level role framing. Not human or psychometric validation.'
    else 'Construct mismatch: the stem is labeled as '||qv.clinical_judgment_step||' but the retained choices are interventions/actions. Rewrite choices to measure the assigned NCJMM function before alignment can pass.'
  end,
  jsonb_build_object('review_date','2026-09-23','review_type','AI-assisted NCLEX/NCJMM alignment review','human_review',false,'psychometric_validation',false,'model','GPT-5.6 Sol','clinical_judgment_step',qv.clinical_judgment_step,'report','docs/VALIDATION_REVIEW_0032_0033.md')
from public.questions q
join public.question_versions qv on qv.question_id=q.id and qv.version=q.current_version
where (q.slug like '0032-%' or q.slug like '0033-%')
and not exists (
  select 1 from public.question_validation_events e
  where e.question_id=q.id and e.question_version=q.current_version and e.gate='nclex_alignment'
    and e.validator='GPT-5.6 Sol AI-assisted validation review 2026-09-23'
);

-- Editorial/adversarial review mirrors the construct finding. Pass only variants
-- whose stem/choice task is coherent; mark the rest needs_review.
insert into public.question_validation_events
(question_id,question_version,gate,outcome,validator,notes,evidence)
select q.id,q.current_version,'editorial',
  case when qv.clinical_judgment_step in ('Generate Solutions','Take Action') then 'pass' else 'needs_review' end,
  'GPT-5.6 Sol AI-assisted validation review 2026-09-23',
  case when qv.clinical_judgment_step in ('Generate Solutions','Take Action')
    then 'AI-assisted editorial/adversarial review: stem and answer-choice task are coherent; keyed response and distractors are answerable as written. Not human or psychometric validation.'
    else 'Editorial/adversarial review found a stem-choice task mismatch: cue/analysis/hypothesis/outcome wording is paired with intervention choices. Revision required before pass.'
  end,
  jsonb_build_object('review_date','2026-09-23','review_type','AI-assisted editorial/adversarial review','human_review',false,'psychometric_validation',false,'model','GPT-5.6 Sol','report','docs/VALIDATION_REVIEW_0032_0033.md')
from public.questions q
join public.question_versions qv on qv.question_id=q.id and qv.version=q.current_version
where (q.slug like '0032-%' or q.slug like '0033-%')
and not exists (
  select 1 from public.question_validation_events e
  where e.question_id=q.id and e.question_version=q.current_version and e.gate='editorial'
    and e.validator='GPT-5.6 Sol AI-assisted validation review 2026-09-23'
);

commit;

-- Verification (read-only):
-- select gate,outcome,count(*) from public.question_validation_events
-- where validator='GPT-5.6 Sol AI-assisted validation review 2026-09-23'
-- group by gate,outcome order by gate,outcome;
-- Expected: clinical pass 196 / needs_review 4;
--           nclex_alignment pass 66 / needs_review 134;
--           editorial pass 66 / needs_review 134.
-- All 200 questions remain pilot; this migration contains no promotion call.
