-- Verify complete 1,000-item RN master-bank load and native item-type distribution.
begin;
do $$
declare total_count int; c1 int; c2 int; c3 int; mc int; matrix_n int; sata int; cloze int; hi int; bow int;
begin
 select count(*) into total_count
 from public.question_versions
 where source_id like 'RNMaster-Set%-RN-%'
    or source_id like 'Set01-Cardiovascular-RN-%'
    or source_id like 'Set03-RN-%';
 select count(*) into c1 from public.question_versions where source_id like 'RNMaster-Set%-RN-%'; select count(*) into c2 from public.question_versions where source_id like 'Set01-Cardiovascular-RN-%'; select count(*) into c3 from public.question_versions where source_id like 'Set03-RN-%'; if total_count <> 1000 then raise exception 'RN master load incomplete: total %, RNMaster %, Set01 %, Set03 %', total_count,c1,c2,c3; end if;
 select
  count(*) filter(where item_type='single_best_answer'),
  count(*) filter(where item_type='matrix_grid'),
  count(*) filter(where item_type='multiple_response'),
  count(*) filter(where item_type='cloze_dropdown'),
  count(*) filter(where item_type='highlight'),
  count(*) filter(where item_type='bow_tie')
 into mc,matrix_n,sata,cloze,hi,bow
 from public.question_versions
 where source_id like 'RNMaster-Set%-RN-%'
    or source_id like 'Set01-Cardiovascular-RN-%'
    or source_id like 'Set03-RN-%';
 if mc<>758 or matrix_n<>83 or sata<>73 or cloze<>45 or hi<>40 or bow<>1 then
  raise exception 'RN master type-count mismatch: MC %, matrix %, SATA %, cloze %, highlight %, bow-tie %',mc,matrix_n,sata,cloze,hi,bow;
 end if;
end $$;
commit;