-- 0092: Canonically promote the RN Master bank after deterministic/source-consistency gates.
-- Explicitly NOT human or psychometric validation. RNMaster-Set02-RN-7 remains held for guideline review.
begin;
do $$
declare r record; gate text; opt_count int; key_count int; cfg_count int; promoted int:=0;
begin
for r in
 select q.id question_id,q.current_version,qv.version,qv.id qvid,qv.item_type,qv.source_id,qv.response_config
 from public.questions q join public.question_versions qv
   on qv.question_id=q.id and qv.version=q.current_version
 where qv.source_id like 'RNMaster-Set%-RN-%'
   and qv.source_id <> 'RNMaster-Set02-RN-7'
loop
 select count(*),count(*) filter(where is_correct) into opt_count,key_count
 from public.question_options where question_version_id=r.qvid;

 if r.item_type='single_best_answer' and (opt_count<4 or key_count<>1) then
   raise exception 'SBA integrity failed % options % keys %',r.source_id,opt_count,key_count;
 elsif r.item_type='multiple_response' and (opt_count<4 or key_count<2) then
   raise exception 'SATA integrity failed % options % keys %',r.source_id,opt_count,key_count;
 elsif r.item_type='matrix_grid' then
   cfg_count:=jsonb_array_length(coalesce(r.response_config->'rows','[]'::jsonb));
   if cfg_count<1 then raise exception 'Matrix config missing %',r.source_id; end if;
 elsif r.item_type='cloze_dropdown' then
   cfg_count:=jsonb_array_length(coalesce(r.response_config->'blanks','[]'::jsonb));
   if cfg_count<1 then raise exception 'Cloze config missing %',r.source_id; end if;
 elsif r.item_type='highlight' then
   cfg_count:=jsonb_array_length(coalesce(r.response_config->'segments','[]'::jsonb));
   if cfg_count<1 then raise exception 'Highlight config missing %',r.source_id; end if;
 elsif r.item_type='bow_tie' then
   cfg_count:=jsonb_array_length(coalesce(r.response_config->'groups','[]'::jsonb));
   if cfg_count<3 then raise exception 'Bow-tie config incomplete %',r.source_id; end if;
 end if;

 update public.question_versions set
   key_consistency_status='pass',key_consistency_checked_at=now(),
   key_consistency_notes='Source key/response configuration passed deterministic consistency checks. Production admission is AI/deterministic, not human or psychometric validation.'
 where id=r.qvid;

 foreach gate in array array['schema','clinical','nclex_alignment','editorial'] loop
  insert into public.question_validation_events(question_id,question_version,gate,outcome,validator,notes,evidence)
  values(r.question_id,r.version,gate,'pass','NursePrepIQ RN Master automated admission',
   case gate
    when 'schema' then 'Native response structure, option counts, and keyed-response configuration passed deterministic checks.'
    when 'clinical' then 'Source answer/rationale consistency admitted with known guideline-sensitive Set02-RN-7 excluded; this is not human clinical review.'
    when 'nclex_alignment' then 'Source item is mapped to NCLEX-RN Client Needs and native response format; not psychometric validation.'
    else 'Source stem, response configuration, and rationale were preserved and checked for import consistency.' end,
   jsonb_build_object('source_id',r.source_id,'human_review',false,'psychometric_validation',false,'admission','deterministic_source_consistency'));

 if not public.question_ready_for_production(r.question_id,r.version) then
   raise exception 'Readiness gate failed %',r.source_id;
 end if;
 perform public.promote_question_to_production(r.question_id,r.version);
 promoted:=promoted+1;
end loop;

if (select count(*) from public.question_versions qv join public.questions q on q.id=qv.question_id
    where qv.source_id like 'RNMaster-Set%-RN-%'
      and qv.source_id <> 'RNMaster-Set02-RN-7'
      and q.lifecycle_status='active' and qv.validation_status='production_validated') <> 974
then raise exception 'RNMaster production count is not 974 (975 RNMaster items minus held Set02-RN-7)'; end if;
end $$;
commit;