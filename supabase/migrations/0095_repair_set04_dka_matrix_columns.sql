-- 0095: Repair Set 4 DKA matrix configs truncated during PDF import.
begin;
update public.question_versions set
 stem='For each finding, indicate whether it is primarily caused by osmotic diuresis or by ketoacidosis.',
 response_config='{"columns":[{"id":"c1","label":"Osmotic diuresis"},{"id":"c2","label":"Ketoacidosis"}],"rows":[{"id":"r1","label":"Deep, rapid respirations","correct":"c2"},{"id":"r2","label":"Fruity breath odor","correct":"c2"},{"id":"r3","label":"Dry mucous membranes and poor skin turgor","correct":"c1"},{"id":"r4","label":"Hypotension and tachycardia","correct":"c1"},{"id":"r5","label":"Polyuria and extreme thirst","correct":"c1"},{"id":"r6","label":"HCO3 of 10 mEq/L","correct":"c2"}]}'::jsonb
where source_id='RNMaster-Set04-RN-21';

update public.question_versions set
 stem='Ten hours after admission, the nurse reviews the client''s status. For each finding, indicate whether it shows the client is improving or requires further intervention.',
 response_config='{"columns":[{"id":"c1","label":"Improving"},{"id":"c2","label":"Requires further intervention"}],"rows":[{"id":"r1","label":"Anion gap 11","correct":"c1"},{"id":"r2","label":"Arterial pH 7.34","correct":"c1"},{"id":"r3","label":"Potassium 3.2 mEq/L","correct":"c2"},{"id":"r4","label":"HR 94/min, BP 118/72 mm Hg","correct":"c1"},{"id":"r5","label":"Alert and asking for something to eat","correct":"c1"},{"id":"r6","label":"Urine output 60 mL/hr","correct":"c1"}]}'::jsonb
where source_id='RNMaster-Set04-RN-25';

do $$ declare n int; begin
 select count(*) into n from public.question_versions
 where source_id in ('RNMaster-Set04-RN-21','RNMaster-Set04-RN-25')
 and jsonb_array_length(response_config->'columns')=2;
 if n<>2 then raise exception 'Set 4 matrix repair failed: %',n; end if;
end $$;
commit;