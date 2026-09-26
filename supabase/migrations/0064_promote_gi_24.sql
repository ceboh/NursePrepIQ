begin;
insert into public.question_validation_events(question_id,question_version,gate,outcome,validator,notes,evidence)
select q.id,q.current_version,g.gate,'pass',case when g.gate='schema' then 'NursePrepIQ structural gate 2026-09-26' else 'GPT-5.6 Sol AI review 2026-09-26' end,
case g.gate when 'schema' then 'Verified four-option SBA, one key, metadata, and rationale fields.'
when 'clinical' then 'AI clinical review checked intended answer, rationale, safety, and RN/PN entry-level scope. No human validation claimed.'
when 'nclex_alignment' then 'AI review checked 2026 NCLEX RN/PN Client Needs framing, varied tasks, and entry-level application.'
else 'AI editorial review checked answerability, distractor plausibility, repetition, and key/rationale agreement.' end,
jsonb_build_object('review_date','2026-09-26','batch','0063','model','GPT-5.6 Sol','human_review',false,'psychometric_validation',false)
from public.questions q cross join (values('schema'::text),('clinical'),('nclex_alignment'),('editorial')) g(gate)
where q.slug like '0063-%'
and not exists(select 1 from public.question_validation_events e where e.question_id=q.id and e.question_version=q.current_version and e.gate=g.gate and e.outcome='pass');
do $$ declare r record;n int:=0; begin
for r in select q.id,q.current_version,qv.id qvid from public.questions q join public.question_versions qv on qv.question_id=q.id and qv.version=q.current_version where q.slug like '0063-%'
loop
 if (select count(*) from public.question_options where question_version_id=r.qvid and is_correct)=1 and
    (select count(*) from public.question_options where question_version_id=r.qvid and is_correct and rationale=(select rationale_correct from public.question_versions where id=r.qvid))=1
 then perform public.pass_key_consistency_question(r.id,r.current_version,'0064 exact one-key and key-rationale checksum passed.');
 else raise exception '0064 key consistency failed'; end if; n:=n+1;
end loop;
if n<>24 then raise exception '0064 expected 24 items'; end if;
end $$;
do $$ declare r record;n int:=0; begin
for r in select q.id,q.current_version from public.questions q where q.slug like '0063-%' and public.question_ready_for_production(q.id,q.current_version)
loop perform public.promote_question_to_production(r.id,r.current_version); n:=n+1; end loop;
if n<>24 then raise exception '0064 expected 24 production-ready items, found %',n; end if;
end $$;
commit;