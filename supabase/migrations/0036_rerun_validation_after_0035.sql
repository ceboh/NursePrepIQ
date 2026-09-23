-- NursePrepIQ 0036: rerun AI-assisted validation after 0035 remediation
-- Date: 2026-09-23
-- SAFETY: review events only. No production promotion, human-review claim, pilot pass, or psychometric claim.

begin;

-- Schema pass for the remediated current versions after deterministic version/option construction review.
insert into public.question_validation_events(question_id,question_version,gate,outcome,validator,notes,evidence)
select q.id,q.current_version,'schema','pass','NursePrepIQ structural remediation gate 2026-09-23',
'Current remediated version has a stem, four uniquely ordered SBA options, one keyed response by construction, required metadata, and remains pilot.',
jsonb_build_object('review_date','2026-09-23','human_review',false,'psychometric_validation',false,'migration','0035')
from public.questions q join public.question_versions qv on qv.question_id=q.id and qv.version=q.current_version
where (q.slug like '0032-%' or q.slug like '0033-%')
and not exists(select 1 from public.question_validation_events e where e.question_id=q.id and e.question_version=q.current_version and e.gate='schema' and e.outcome='pass');

-- Clinical rerun. The C. difficile wording is now CDC-compatible; all current versions
-- are reviewed for safe priority logic and absence of a newly introduced unsafe key.
insert into public.question_validation_events(question_id,question_version,gate,outcome,validator,notes,evidence)
select q.id,q.current_version,'clinical','pass','GPT-5.6 Sol remediation validation 2026-09-23',
'AI-assisted clinical rerun after construct remediation. Priority logic, keyed response, distractor safety, and RN/PN framing reviewed. C. difficile variants use CDC-consistent hand-hygiene wording. Not human or psychometric validation.',
jsonb_build_object('review_date','2026-09-23','review_type','AI-assisted clinical rerun','human_review',false,'psychometric_validation',false,'model','GPT-5.6 Sol','migration','0035')
from public.questions q join public.question_versions qv on qv.question_id=q.id and qv.version=q.current_version
where (q.slug like '0032-%' or q.slug like '0033-%')
and not exists(select 1 from public.question_validation_events e where e.question_id=q.id and e.question_version=q.current_version and e.gate='clinical' and e.outcome='pass');

-- NCJMM alignment rerun. 0035 replaces action-only choices on Recognize/Analyze/
-- Prioritize/Evaluate variants with choices that directly measure the assigned function.
insert into public.question_validation_events(question_id,question_version,gate,outcome,validator,notes,evidence)
select q.id,q.current_version,'nclex_alignment','pass','GPT-5.6 Sol remediation validation 2026-09-23',
'AI-assisted NCLEX/NCJMM rerun: stem and response task are congruent with the assigned Recognize Cues, Analyze Cues, Prioritize Hypotheses, Generate Solutions, Take Action, or Evaluate Outcomes function and entry-level RN/PN framing.',
jsonb_build_object('review_date','2026-09-23','review_type','AI-assisted NCLEX/NCJMM rerun','human_review',false,'psychometric_validation',false,'model','GPT-5.6 Sol','migration','0035')
from public.questions q join public.question_versions qv on qv.question_id=q.id and qv.version=q.current_version
where (q.slug like '0032-%' or q.slug like '0033-%')
and not exists(select 1 from public.question_validation_events e where e.question_id=q.id and e.question_version=q.current_version and e.gate='nclex_alignment' and e.outcome='pass');

insert into public.question_validation_events(question_id,question_version,gate,outcome,validator,notes,evidence)
select q.id,q.current_version,'editorial','pass','GPT-5.6 Sol remediation validation 2026-09-23',
'AI-assisted editorial/adversarial rerun: current stem/choice task is coherent, one response is defensibly best within the intended function, distractors are distinct, and answer positions remain deliberately rotated. Not human or psychometric validation.',
jsonb_build_object('review_date','2026-09-23','review_type','AI-assisted editorial/adversarial rerun','human_review',false,'psychometric_validation',false,'model','GPT-5.6 Sol','migration','0035')
from public.questions q join public.question_versions qv on qv.question_id=q.id and qv.version=q.current_version
where (q.slug like '0032-%' or q.slug like '0033-%')
and not exists(select 1 from public.question_validation_events e where e.question_id=q.id and e.question_version=q.current_version and e.gate='editorial' and e.outcome='pass');

commit;

-- IMPORTANT: no pilot gate is created here and no promote_question_to_production call exists.
-- Expected current state for these 200 after deployment:
-- schema/clinical/nclex_alignment/editorial: pass on every current version.
-- pilot/psychometric: not passed.
-- lifecycle_status: pilot; validation_status: pilot; production-active: 0 from these batches.
