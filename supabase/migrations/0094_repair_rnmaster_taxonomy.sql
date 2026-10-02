-- 0094: Repair RN Master taxonomy metadata that was not updated by correction imports.
begin;
-- Dedicated system sets in the supplied master bank.
update public.question_versions set body_system='Endocrine' where source_id like 'RNMaster-Set04-RN-%';
update public.question_versions set body_system='Renal & Urinary' where source_id like 'RNMaster-Set05-RN-%';
update public.question_versions set body_system='Gastrointestinal' where source_id like 'RNMaster-Set06-RN-%';
update public.question_versions set body_system='Musculoskeletal' where source_id like 'RNMaster-Set07-RN-%';
update public.question_versions set body_system='Hematologic' where source_id like 'RNMaster-Set08-RN-%';
update public.question_versions set body_system='Immune' where source_id like 'RNMaster-Set09-RN-%';
update public.question_versions set body_system='Integumentary' where source_id like 'RNMaster-Set10-RN-%';

-- Maternal/newborn, pediatric, mental-health, pharmacology, management and safety blocks.
update public.question_versions set discipline='Maternal & Newborn' where source_id like 'RNMaster-Set12-RN-%';
update public.question_versions set discipline='Pediatrics' where source_id like 'RNMaster-Set13-RN-%';
update public.question_versions set discipline='Mental Health' where source_id like 'RNMaster-Set14-RN-%';
update public.question_versions set discipline='Pharmacology' where source_id like 'RNMaster-Set15-RN-%';
update public.question_versions set discipline='Management of Care' where source_id like 'RNMaster-Set16-RN-%';
update public.question_versions set discipline='Safety & Infection Control' where source_id like 'RNMaster-Set17-RN-%';

-- Explicit sensory items in the comprehensive portion of the supplied bank.
update public.question_versions set body_system='Sensory'
where source_id in ('RNMaster-Set18-RN-1','RNMaster-Set18-RN-2','RNMaster-Set18-RN-3','RNMaster-Set18-RN-4');

-- Assertions for the two user-reported taxonomy failures.
do $$
declare maternal_n int; sensory_n int;
begin
 select count(*) into maternal_n from public.question_versions qv join public.questions q on q.id=qv.question_id
 where qv.discipline='Maternal & Newborn' and qv.exam_tracks @> array['rn']::text[] and q.lifecycle_status='active';
 select count(*) into sensory_n from public.question_versions qv join public.questions q on q.id=qv.question_id
 where qv.body_system='Sensory' and qv.exam_tracks @> array['rn']::text[] and q.lifecycle_status='active';
 if maternal_n < 25 then raise exception 'Maternal taxonomy repair incomplete: %',maternal_n; end if;
 if sensory_n < 4 then raise exception 'Sensory taxonomy repair incomplete: %',sensory_n; end if;
end $$;
commit;