-- NursePrepIQ 0041: AI-assisted validation review for cleaned 0040 factory batch.
-- No human review or psychometric validation is claimed. No publication/promotion occurs here.
begin;
insert into public.question_validation_events(question_id,question_version,gate,outcome,validator,notes,evidence)
select q.id,q.current_version,g.gate,'pass',
case g.gate when 'schema' then 'NursePrepIQ structural/editorial gate 2026-09-23'
 when 'clinical' then 'GPT-5.6 Sol AI clinical review 2026-09-23'
 when 'nclex_alignment' then 'GPT-5.6 Sol AI NCLEX alignment review 2026-09-23'
 else 'GPT-5.6 Sol AI editorial/adversarial review 2026-09-23' end,
case g.gate when 'schema' then 'Verified required metadata, one-best-answer structure, four complete options, one keyed response, RN/PN track marker, rationale fields, and balanced answer-position construction.'
 when 'clinical' then 'AI-assisted review of 18 clinical scenarios and their six function-specific variants for cue/key consistency, immediate safety and priority logic, scope framing, and clinically defensible outcome language. This is not human clinical validation.'
 when 'nclex_alignment' then 'AI-assisted review confirms each response set answers its assigned NCJMM function: Recognize Cues, Analyze Cues, Prioritize Hypotheses, Generate Solutions, Take Action, or Evaluate Outcomes.'
 else 'AI-assisted editorial/adversarial review for clarity, answerability, keyed-answer consistency, plausible competing distractors, rationale consistency, role wording, and answer-position cueing.' end,
jsonb_build_object('review_date','2026-09-23','batch','0040','model','GPT-5.6 Sol','human_review',false,'psychometric_validation',false,'publication_authorized',false)
from public.questions q
cross join (values('schema'::text),('clinical'),('nclex_alignment'),('editorial')) g(gate)
where q.slug like '0040-%'
and not exists(select 1 from public.question_validation_events e where e.question_id=q.id and e.question_version=q.current_version and e.gate=g.gate and e.outcome='pass');
commit;
-- Expected after deployment: 108 current 0040 questions remain lifecycle_status=pilot and validation_status=pilot.
-- Validation events: 108 pass records for each of schema, clinical, nclex_alignment, editorial.
