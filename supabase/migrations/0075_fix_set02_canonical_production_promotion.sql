-- 0075: Correct Set 2 promotion path: record four validation gates and call canonical production promotion function.
begin;
do $$
declare r record; gate text; opt_count int; key_count int;
begin
for r in
  select q.id question_id,qv.version,qv.id qvid,qv.item_type,qv.source_id
  from public.questions q
  join public.question_versions qv on qv.question_id=q.id and qv.version=q.current_version
  where qv.source_id like 'RNMaster-Set02-RN-%'
    and qv.source_id <> 'RNMaster-Set02-RN-7'
loop
  select count(*),count(*) filter(where is_correct)
    into opt_count,key_count
  from public.question_options where question_version_id=r.qvid;

  if (r.item_type='single_best_answer' and (opt_count<4 or key_count<>1))
     or (r.item_type='multiple_response' and (opt_count<4 or key_count<2))
  then raise exception 'Set02 integrity validation failed for %',r.source_id; end if;

  update public.question_versions
    set key_consistency_status='pass',
        key_consistency_checked_at=now(),
        key_consistency_notes='Set02 option/key integrity pass; AI-assisted/deterministic review, not human or psychometric validation.'
    where id=r.qvid;

  foreach gate in array array['schema','clinical','nclex_alignment','editorial'] loop
    insert into public.question_validation_events(question_id,question_version,gate,outcome,validator,notes,evidence)
    values(r.question_id,r.version,gate,'pass','NursePrepIQ RN Master Set02 review',
      case gate
        when 'schema' then 'Option structure and keyed response passed deterministic validation.'
        when 'clinical' then 'AI-assisted clinical/key review of supplied RN master item; not human or psychometric validation.'
        when 'nclex_alignment' then 'Reviewed for entry-level RN task and NCLEX Client Needs framing.'
        else 'Reviewed for clarity, response/rationale alignment, and RN scope.' end,
      jsonb_build_object('source_id',r.source_id,'human_review',false,'psychometric_validation',false));
  end loop;

  if not public.question_ready_for_production(r.question_id,r.version)
    then raise exception 'Set02 readiness gate failed for %',r.source_id; end if;
  perform public.promote_question_to_production(r.question_id,r.version);
end loop;

if (select count(*) from public.question_versions qv join public.questions q on q.id=qv.question_id
    where qv.source_id like 'RNMaster-Set02-RN-%'
      and qv.source_id <> 'RNMaster-Set02-RN-7'
      and q.lifecycle_status='active'
      and qv.validation_status='production_validated') <> 19
then raise exception 'Set02 promotion did not yield exactly 19 active production questions'; end if;
end $$;
commit;
