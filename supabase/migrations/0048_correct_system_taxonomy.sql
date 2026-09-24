-- NursePrepIQ 0048: correct over-broad gastrointestinal system classification
-- Root cause: PostgreSQL regex \m / \M boundaries were escaped incorrectly in 0047,
-- causing the GI alternative to match broadly. Recompute deterministically.
-- Classification only; no clinical content or lifecycle/validation changes.
begin;

update public.question_versions qv
set body_system = case
  -- Prefer explicit legacy system subjects first.
  when qv.subject ilike '%Cardiovascular%' then 'Cardiovascular'
  when qv.subject ilike '%Respiratory%' then 'Respiratory'
  when qv.subject ilike '%Neurologic%' then 'Neurologic'
  when qv.subject ilike '%Renal%' or qv.subject ilike '%Urinary%' then 'Renal & Urinary'

  -- Then classify by specific clinical concepts. Avoid ambiguous short tokens such as GI.
  when lower(concat_ws(' ',qv.topic,qv.stem)) ~ '(heart failure|coronary|cardiac|dysrhythm|arrhythm|hypertension|vascular|digoxin|orthostatic|cardiogenic)' then 'Cardiovascular'
  when lower(concat_ws(' ',qv.topic,qv.stem)) ~ '(respiratory|pulmonary|pneumonia|pneumothorax|asthma|copd|croup|airway|aspiration|epiglott|ventilat)' then 'Respiratory'
  when lower(concat_ws(' ',qv.topic,qv.stem)) ~ '(neurolog|stroke|seizure|intracranial|meningitis|cerebral edema|spinal cord)' then 'Neurologic'
  when lower(concat_ws(' ',qv.topic,qv.stem)) ~ '(renal|kidney|urinary|dialysis|hyperkal|bladder|urinary retention)' then 'Renal & Urinary'
  when lower(concat_ws(' ',qv.topic,qv.stem)) ~ '(endocrine|diabet|insulin|glucose|hypogly|hypergly|thyroid|adrenal|ketoacidosis)' then 'Endocrine'
  when lower(concat_ws(' ',qv.topic,qv.stem)) ~ '(gastrointestinal|upper gi bleed|lower gi bleed|melena|bowel|liver|hepatic|pancrea|gastroenter|c\. difficile|diarrhea|constipation)' then 'Gastrointestinal'
  when lower(concat_ws(' ',qv.topic,qv.stem)) ~ '(musculoskeletal|fracture|bone|joint|orthopedic|skeletal traction)' then 'Musculoskeletal'
  when lower(concat_ws(' ',qv.topic,qv.stem)) ~ '(hematologic|anemia|hemoglobin|coagulat|heparin|neutropenia|thrombocyt)' then 'Hematologic'
  when lower(concat_ws(' ',qv.topic,qv.stem)) ~ '(immune|anaphyl|allerg|hiv|autoimmune|immunosuppress)' then 'Immune'
  when lower(concat_ws(' ',qv.topic,qv.stem)) ~ '(integument|pressure injury|pressure ulcer|burn injury|wound care|skin integrity)' then 'Integumentary'
  when lower(concat_ws(' ',qv.topic,qv.stem)) ~ '(sensory|glaucoma|cataract|retinal|hearing loss|vision loss)' then 'Sensory'
  else null
end;

commit;
