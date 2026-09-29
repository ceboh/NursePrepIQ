-- 0071: first-class unfolding NGN case studies.
begin;
create table if not exists public.question_case_studies(
 id text primary key,
 title text not null,
 case_stem text not null,
 initial_data jsonb not null default '{}'::jsonb,
 source_note text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.question_versions add column if not exists case_study_id text references public.question_case_studies(id);
alter table public.question_versions add column if not exists case_sequence int;
create index if not exists idx_qv_case_study_sequence on public.question_versions(case_study_id,case_sequence);

insert into public.question_case_studies(id,title,case_stem,initial_data,source_note) values(
'Set01-Cardiovascular-RN-HFrEF-Case',
'Unfolding Case Study — HFrEF and Atrial Fibrillation',
'A 72-year-old client with heart failure with reduced ejection fraction (EF 25%) and atrial fibrillation is admitted from the emergency department with increasing shortness of breath over 4 days.',
jsonb_build_object(
'nurses_notes','0800: Client is sitting upright, anxious, and speaking in short phrases. Reports sleeping in a recliner for 3 nights. States, "I stopped my water pill last week because I was always running to the bathroom," and ate ham and potato chips at a family party on the weekend. Crackles auscultated in bilateral lung fields from the bases to mid-scapula. Jugular venous distention present with the head of the bed at 45°. +3 pitting edema in both ankles. Weight 3 kg above the client''s reported dry weight.',
'vital_signs','T 98.4°F (36.9°C), HR 112/min irregularly irregular, RR 28/min, BP 158/94 mm Hg, SpO2 88% on room air.',
'laboratory_results','BNP 1,450 pg/mL (reference: less than 100), potassium 3.4 mEq/L (3.5–5.0), sodium 134 mEq/L (135–145), creatinine 1.1 mg/dL (0.6–1.2).'
),
'User-provided Set 1 Cardiovascular case study for RN questions 20–25.'
)
on conflict(id) do update set title=excluded.title,case_stem=excluded.case_stem,initial_data=excluded.initial_data,updated_at=now();

update public.question_versions
set case_study_id='Set01-Cardiovascular-RN-HFrEF-Case',
    case_sequence=(regexp_match(source_id,'RN-(2[0-5])$'))[1]::int-19
where source_id in ('Set01-Cardiovascular-RN-20','Set01-Cardiovascular-RN-21','Set01-Cardiovascular-RN-22','Set01-Cardiovascular-RN-23','Set01-Cardiovascular-RN-24','Set01-Cardiovascular-RN-25');

do $$ begin
 if (select count(*) from public.question_versions where case_study_id='Set01-Cardiovascular-RN-HFrEF-Case')<>6 then
  raise exception 'Expected six RN HFrEF case questions';
 end if;
end $$;
commit;