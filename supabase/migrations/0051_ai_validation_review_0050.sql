-- NursePrepIQ 0051: AI-assisted validation review for 0050 factory batch.
-- No human review or psychometric validation is claimed. No publication/promotion occurs here.
begin;
insert into public.question_validation_events(question_id,question_version,gate,outcome,validator,notes,evidence)
select q.id,q.current_version,g.gate,'pass',
case g.gate when 'schema' then 'NursePrepIQ structural/editorial gate 2026-09-24'
 when 'clinical' then 'GPT-5.6 Sol AI clinical review 2026-09-24'
 when 'nclex_alignment' then 'GPT-5.6 Sol AI NCLEX alignment review 2026-09-24'
 else 'GPT-5.6 Sol AI editorial/adversarial review 2026-09-24' end,
case g.gate when 'schema' then 'Verified required metadata, one-best-answer structure, four complete options, one keyed response, RN/PN track marker, rationale fields, and balanced answer-position construction.'
 when 'clinical' then 'AI-assisted review of 18 new clinical scenarios and their six function-specific variants for cue/key consistency, immediate safety and priority logic, scope framing, and clinically defensible outcome language. Reviewed topics include acute limb ischemia, hip-fracture neurovascular compromise, retinal detachment, acute angle-closure glaucoma, traction alignment, hearing-impaired communication, warfarin bleeding, lithium toxicity, neuroleptic malignant syndrome, panic attack care, shoulder dystocia, neonatal respiratory distress, meningococcal meningitis, intussusception, postoperative deterioration, chemical eye exposure, spinal cord compression, and anaphylaxis. This is not human clinical validation.'
 when 'nclex_alignment' then 'AI-assisted review confirms each response set answers its assigned NCJMM function: Recognize Cues, Analyze Cues, Prioritize Hypotheses, Generate Solutions, Take Action, or Evaluate Outcomes, with RN/PN role framing preserved.'
 else 'AI-assisted editorial/adversarial review for clarity, answerability, keyed-answer consistency, distractor plausibility, rationale consistency, role wording, and answer-position cueing.' end,
jsonb_build_object('review_date','2026-09-24','batch','0050','model','GPT-5.6 Sol','human_review',false,'psychometric_validation',false,'publication_authorized',false)
from public.questions q
cross join (values('schema'::text),('clinical'),('nclex_alignment'),('editorial')) g(gate)
where q.slug like '0050-%'
and not exists(select 1 from public.question_validation_events e where e.question_id=q.id and e.question_version=q.current_version and e.gate=g.gate and e.outcome='pass');
commit;
