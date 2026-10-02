-- Final verification: all 1,000 RN master questions loaded with expected native item-type distribution.
begin;
do $$
declare total_count int; mc int; matrix_n int; sata int; cloze int; hi int; bow int;
begin
 select count(*) into total_count from public.question_versions
 where source_id like 'RNMaster-Set%-RN-%' or source_id like 'Set01-Cardiovascular-RN-%';
 if total_count <> 1000 then raise exception 'RN master load incomplete: expected 1000, found %',total_count; end if;
 select count(*) filter(where item_type='single_best_answer'),
 count(*) filter(where item_type='matrix_grid'),
 count(*) filter(where item_type='multiple_response'),
 count(*) filter(where item_type='cloze_dropdown'),
 count(*) filter(where item_type='highlight'),
 count(*) filter(where item_type='bow_tie')
 into mc,matrix_n,sata,cloze,hi,bow
 from public.question_versions
 where source_id like 'RNMaster-Set%-RN-%' or source_id like 'Set01-Cardiovascular-RN-%';
 if mc<>758 or matrix_n<>83 or sata<>73 or cloze<>45 or hi<>40 or bow<>1 then
  raise exception 'RN master type mismatch: MC %, matrix %, SATA %, cloze %, highlight %, bow-tie %',mc,matrix_n,sata,cloze,hi,bow;
 end if;
end $$;
commit;