-- NursePrepIQ 0049: deterministic body-system taxonomy repair
-- Fixes the 318-GI corruption by resetting taxonomy first, then assigning
-- explicit system membership from established subject/topic metadata only.
-- No stems, options, rationales, validation events, or lifecycle states change.
begin;

update public.question_versions set body_system = null;

-- Explicit legacy Adult Health system banks.
update public.question_versions set body_system='Cardiovascular'
where subject ilike '%Cardiovascular%';
update public.question_versions set body_system='Respiratory'
where subject ilike '%Respiratory%';
update public.question_versions set body_system='Neurologic'
where subject ilike '%Neurologic%';
update public.question_versions set body_system='Renal & Urinary'
where subject ilike '%Renal%' or subject ilike '%Urinary%';

-- Explicit topic taxonomy. Anchored/literal topic labels only; no stem-wide regex.
update public.question_versions set body_system='Cardiovascular'
where body_system is null and (
 topic ilike '%Heart Failure%' or topic ilike '%Acute Coronary%' or topic ilike '%Cardiac%'
 or topic ilike '%Dysrhythm%' or topic ilike '%Arrhythm%' or topic ilike '%Hypertension%'
 or topic ilike '%Orthostatic%' or topic ilike '%Digoxin%' or topic ilike '%Cardiovascular%'
);

update public.question_versions set body_system='Respiratory'
where body_system is null and (
 topic ilike '%Respiratory%' or topic ilike '%COPD%' or topic ilike '%Pneumonia%'
 or topic ilike '%Pneumothorax%' or topic ilike '%Asthma%' or topic ilike '%Croup%'
 or topic ilike '%Airway%' or topic ilike '%Aspiration%' or topic ilike '%Epiglott%'
 or topic ilike '%Opioid Respiratory Depression%'
);

update public.question_versions set body_system='Neurologic'
where body_system is null and (
 topic ilike '%Stroke%' or topic ilike '%Seizure%' or topic ilike '%Neurolog%'
 or topic ilike '%Intracranial%' or topic ilike '%Meningitis%' or topic ilike '%Cerebral Edema%'
);

update public.question_versions set body_system='Renal & Urinary'
where body_system is null and (
 topic ilike '%Kidney%' or topic ilike '%Renal%' or topic ilike '%Urinary%'
 or topic ilike '%Dialysis%' or topic ilike '%Hyperkalemia%' or topic ilike '%Urinary Retention%'
);

update public.question_versions set body_system='Endocrine'
where body_system is null and (
 topic ilike '%Insulin%' or topic ilike '%Hypogly%' or topic ilike '%Hypergly%'
 or topic ilike '%Diabet%' or topic ilike '%DKA%' or topic ilike '%Ketoacidosis%'
 or topic ilike '%Thyroid%' or topic ilike '%Adrenal%'
);

update public.question_versions set body_system='Gastrointestinal'
where body_system is null and (
 topic ilike '%Gastrointestinal%' or topic ilike '%GI Bleed%' or topic ilike '%Gastroenteritis%'
 or topic ilike '%Bowel%' or topic ilike '%Hepatic%' or topic ilike '%Liver%'
 or topic ilike '%Pancrea%' or topic ilike '%C. difficile%'
);

update public.question_versions set body_system='Musculoskeletal'
where body_system is null and (
 topic ilike '%Musculoskeletal%' or topic ilike '%Fracture%' or topic ilike '%Orthopedic%'
 or topic ilike '%Bone%' or topic ilike '%Joint%'
);

update public.question_versions set body_system='Hematologic'
where body_system is null and (
 topic ilike '%Hematologic%' or topic ilike '%Anemia%' or topic ilike '%Coagulation%'
 or topic ilike '%Heparin%' or topic ilike '%Thrombocyt%' or topic ilike '%Neutropen%'
);

update public.question_versions set body_system='Immune'
where body_system is null and (
 topic ilike '%Immune%' or topic ilike '%Anaphyl%' or topic ilike '%Allerg%'
 or topic ilike '%HIV%' or topic ilike '%Autoimmune%'
);

update public.question_versions set body_system='Integumentary'
where body_system is null and (
 topic ilike '%Pressure Injury%' or topic ilike '%Wound%' or topic ilike '%Burn%'
 or topic ilike '%Skin%' or topic ilike '%Integument%'
);

update public.question_versions set body_system='Sensory'
where body_system is null and (
 topic ilike '%Sensory%' or topic ilike '%Vision%' or topic ilike '%Hearing%'
 or topic ilike '%Glaucoma%' or topic ilike '%Cataract%' or topic ilike '%Retinal%'
);

-- Guard against recurrence of the exact corruption observed in production.
do $$
declare total_count integer; gi_count integer;
begin
 select count(*) into total_count from public.question_versions where body_system is not null;
 select count(*) into gi_count from public.question_versions where body_system='Gastrointestinal';
 if total_count > 20 and gi_count = total_count then
   raise exception 'Taxonomy guard failed: every classified question is Gastrointestinal';
 end if;
end $$;

commit;
