-- NursePrepIQ 0039: AI validation and owner-authorized launch for batch 0038
-- Date: 2026-09-23. No human or psychometric validation claim.
begin;
insert into public.question_validation_events(question_id,question_version,gate,outcome,validator,notes,evidence)
select q.id,q.current_version,g.gate,'pass',
case g.gate when 'schema' then 'NursePrepIQ structural gate 2026-09-23'
when 'clinical' then 'GPT-5.6 Sol clinical review 2026-09-23'
when 'nclex_alignment' then 'GPT-5.6 Sol NCLEX alignment review 2026-09-23'
else 'GPT-5.6 Sol editorial review 2026-09-23' end,
case g.gate when 'schema' then 'Reviewed required metadata, four-option SBA structure, one keyed response, and balanced answer-position construction.'
when 'clinical' then 'AI-assisted review of cue pattern, keyed response, distractor safety, priority logic, and RN/PN role framing. No human-review claim.'
when 'nclex_alignment' then 'AI-assisted review confirms response task is congruent with the assigned NCJMM clinical-judgment function and entry-level RN/PN framing.'
else 'AI-assisted editorial/adversarial review for clarity, one-best-answer defensibility, distractor plausibility, rationale consistency, and absence of answer-position cueing.' end,
jsonb_build_object('review_date','2026-09-23','human_review',false,'psychometric_validation',false,'model','GPT-5.6 Sol','batch','0038')
from public.questions q
cross join (values('schema'::text),('clinical'),('nclex_alignment'),('editorial')) g(gate)
where q.slug like '0038-%'
and not exists(select 1 from public.question_validation_events e where e.question_id=q.id and e.question_version=q.current_version and e.gate=g.gate and e.outcome='pass');

do $$
declare r record;
begin
 for r in select id,current_version from public.questions where slug like '0038-%' and public.question_ready_for_production(id,current_version)
 loop perform public.promote_question_to_production(r.id,r.current_version); end loop;
end $$;
commit;
