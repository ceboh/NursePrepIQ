-- NursePrepIQ 0046: dual taxonomy for system + discipline discovery
-- Adds non-destructive classification metadata. Existing question content/status is unchanged.
begin;
alter table public.question_versions add column if not exists body_system text;
alter table public.question_versions add column if not exists discipline text;

-- Normalize discipline from the established subject/category labels.
update public.question_versions set discipline =
 case
  when subject ilike 'Adult Health%' then 'Adult Health'
  when subject ilike 'Fundamentals%' then 'Fundamentals'
  when subject ilike 'Pharmacology%' then 'Pharmacology'
  when subject ilike 'Mental Health%' then 'Mental Health'
  when subject ilike 'Maternal%Newborn%' or subject ilike 'Maternal%' then 'Maternal & Newborn'
  when subject ilike 'Pediatrics%' then 'Pediatrics'
  when subject ilike 'Management of Care%' then 'Management of Care'
  when subject ilike 'Safety%Infection%' then 'Safety & Infection Control'
  when subject ilike 'NGN%' then 'NGN Clinical Judgment'
  else coalesce(nullif(split_part(subject,':',1),''),'Adult Health')
 end
where discipline is null;

-- Body-system taxonomy is independent of discipline. A question can therefore
-- be found under e.g. Cardiovascular AND Adult Health.
update public.question_versions set body_system =
 case
  when subject ilike '%cardiovascular%' or topic ~* '(heart|cardiac|coronary|dysrhythm|hypertension|vascular|shock|perfusion)' then 'Cardiovascular'
  when subject ilike '%respiratory%' or topic ~* '(respirat|pulmonary|pneum|asthma|copd|croup|airway|aspiration|epiglott)' then 'Respiratory'
  when subject ilike '%neurolog%' or topic ~* '(stroke|seizure|intracranial|mening|cerebral|neuro)' then 'Neurologic'
  when subject ilike '%renal%' or topic ~* '(renal|kidney|urinary|dialysis|hyperkal|urine|bladder)' then 'Renal & Urinary'
  when topic ~* '(diabet|insulin|glucose|thyroid|adrenal|endocr|hypogly)' then 'Endocrine'
  when topic ~* '(gastro|gi |bleed|bowel|liver|hepatic|pancrea)' then 'Gastrointestinal'
  when topic ~* '(fracture|bone|joint|musculo|mobility|orthopedic)' then 'Musculoskeletal'
  when topic ~* '(anemia|blood|bleed|heparin|coag|hemat)' then 'Hematologic'
  when topic ~* '(immune|allerg|anaphyl|hiv|autoimmune)' then 'Immune'
  when topic ~* '(skin|wound|pressure injury|burn|integument)' then 'Integumentary'
  when topic ~* '(vision|hearing|eye|ear|sensory)' then 'Sensory'
  else null
 end
where body_system is null;

create index if not exists idx_qv_discipline on public.question_versions(discipline);
create index if not exists idx_qv_body_system on public.question_versions(body_system);
commit;
