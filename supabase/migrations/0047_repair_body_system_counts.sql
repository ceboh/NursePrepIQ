-- NursePrepIQ 0047: repair body-system taxonomy for existing production inventory
-- Classification only: does not change stems, options, rationales, validation, or lifecycle status.
begin;

-- Recompute body_system from clinical topic + subject for all existing versions.
update public.question_versions qv
set body_system = case
  when concat_ws(' ',qv.subject,qv.topic,qv.stem) ~* '(cardiovascular|heart failure|coronary|cardiac|dysrhythm|arrhythm|hypertension|vascular|digoxin|perfusion|orthostatic|shock)' then 'Cardiovascular'
  when concat_ws(' ',qv.subject,qv.topic,qv.stem) ~* '(respiratory|pulmonary|pneumonia|pneumothorax|asthma|copd|croup|airway|aspiration|epiglott|oxygen|ventilat)' then 'Respiratory'
  when concat_ws(' ',qv.subject,qv.topic,qv.stem) ~* '(neurolog|stroke|seizure|intracranial|meningitis|cerebral|level of consciousness|spinal)' then 'Neurologic'
  when concat_ws(' ',qv.subject,qv.topic,qv.stem) ~* '(renal|kidney|urinary|dialysis|hyperkal|bladder|urine|urinary retention)' then 'Renal & Urinary'
  when concat_ws(' ',qv.subject,qv.topic,qv.stem) ~* '(endocrine|diabet|insulin|glucose|hypogly|hypergly|thyroid|adrenal|dka|ketoacidosis)' then 'Endocrine'
  when concat_ws(' ',qv.subject,qv.topic,qv.stem) ~* '(gastrointestinal|\mgi\M|melena|bowel|liver|hepatic|pancrea|gastroenter|c\. difficile|diarrhea)' then 'Gastrointestinal'
  when concat_ws(' ',qv.subject,qv.topic,qv.stem) ~* '(musculoskeletal|fracture|bone|joint|orthopedic|mobility|ambulat)' then 'Musculoskeletal'
  when concat_ws(' ',qv.subject,qv.topic,qv.stem) ~* '(hematologic|anemia|hemoglobin|coagulat|heparin|hemorrhage|bleeding|blood loss)' then 'Hematologic'
  when concat_ws(' ',qv.subject,qv.topic,qv.stem) ~* '(immune|anaphyl|allerg|hiv|autoimmune|immunosuppress)' then 'Immune'
  when concat_ws(' ',qv.subject,qv.topic,qv.stem) ~* '(integument|skin|wound|pressure injury|burn|sacral|ulcer)' then 'Integumentary'
  when concat_ws(' ',qv.subject,qv.topic,qv.stem) ~* '(sensory|vision|visual|hearing|\meye\M|\mear\M)' then 'Sensory'
  else qv.body_system
end;

-- Ensure legacy Adult Health system-prefixed subjects classify even if topic wording is narrow.
update public.question_versions
set body_system='Cardiovascular'
where body_system is null and subject ilike '%Cardiovascular%';
update public.question_versions
set body_system='Respiratory'
where body_system is null and subject ilike '%Respiratory%';
update public.question_versions
set body_system='Neurologic'
where body_system is null and subject ilike '%Neurologic%';
update public.question_versions
set body_system='Renal & Urinary'
where body_system is null and (subject ilike '%Renal%' or subject ilike '%Urinary%');

commit;
