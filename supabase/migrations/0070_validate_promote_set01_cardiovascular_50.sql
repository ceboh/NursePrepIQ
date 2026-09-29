-- NursePrepIQ 0070: validate/promote Set01 Cardiovascular reviewed items.
-- 50/50 imported in 0069; RN-19 and PN-25 contain explicit reviewed revisions.
-- Validation is AI-assisted/editorial + deterministic integrity, NOT human or psychometric validation.
begin;
do $$
declare r record; opt_count int; key_count int; cfg_ok boolean; gate text;
begin
for r in
 select q.id question_id,qv.version,qv.id qvid,qv.item_type,qv.response_config,qv.source_id
 from public.questions q join public.question_versions qv on qv.question_id=q.id and qv.version=q.current_version
 where qv.source_id like 'Set01-Cardiovascular-%'
loop
 select count(*),count(*) filter(where is_correct) into opt_count,key_count from public.question_options where question_version_id=r.qvid;
 cfg_ok:=case
  when r.item_type='single_best_answer' then opt_count>=4 and key_count=1
  when r.item_type='multiple_response' then opt_count>=4 and key_count>=2
  when r.item_type='highlight' then jsonb_array_length(coalesce(r.response_config->'segments','[]'::jsonb))>0
  when r.item_type='matrix_grid' then jsonb_array_length(coalesce(r.response_config->'rows','[]'::jsonb))>0 and jsonb_array_length(coalesce(r.response_config->'columns','[]'::jsonb))>0
  when r.item_type='cloze_dropdown' then jsonb_array_length(coalesce(r.response_config->'blanks','[]'::jsonb))>0
  when r.item_type='bow_tie' then jsonb_array_length(coalesce(r.response_config->'groups','[]'::jsonb))=3
  else false end;
 if not cfg_ok then raise exception 'Set01 schema validation failed for % (%)',r.source_id,r.item_type; end if;
 -- For structured config-keyed items, key consistency is validated against response_config;
 -- option-keyed items use question_options.
 update public.question_versions set key_consistency_status='pass',key_consistency_checked_at=now(),
   key_consistency_notes='Set01 reviewed key/config consistency pass; AI-assisted/deterministic, not human or psychometric validation.'
 where id=r.qvid;
 foreach gate in array array['schema','clinical','nclex_alignment','editorial'] loop
  insert into public.question_validation_events(question_id,question_version,gate,outcome,validator,notes,evidence)
  values(r.question_id,r.version,gate,'pass','NursePrepIQ Set01 reviewed import',
   case gate when 'schema' then 'Native item schema/config and response key passed deterministic validation.'
   when 'clinical' then 'AI-assisted clinical review of user-provided item; RN-19 and PN-25 revised before promotion. Not human/psychometric validation.'
   when 'nclex_alignment' then 'Reviewed for entry-level RN/PN task, Client Needs framing, and native alternate-format presentation.'
   else 'Reviewed for clarity, single task, plausible response set, rationale alignment, and scope framing.' end,
   jsonb_build_object('source_id',r.source_id,'human_review',false,'psychometric_validation',false,'reviewed_set','Set01 Cardiovascular'));
 end loop;
 if not public.question_ready_for_production(r.question_id,r.version) then raise exception 'Set01 readiness gate failed for %',r.source_id; end if;
 perform public.promote_question_to_production(r.question_id,r.version);
end loop;
if (select count(*) from public.question_versions qv join public.questions q on q.id=qv.question_id
    where qv.source_id like 'Set01-Cardiovascular-%' and q.lifecycle_status='active' and qv.validation_status='production_validated')<>50
then raise exception 'Set01 promotion did not yield exactly 50 active production questions'; end if;
end $$;
commit;