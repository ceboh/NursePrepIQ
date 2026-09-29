-- NursePrepIQ 0068: native alternate/NGN response model.
-- Non-destructive: adds response configuration and stable import/case identities.
begin;
alter table public.question_versions add column if not exists source_id text;
alter table public.question_versions add column if not exists case_set_id text;
alter table public.question_versions add column if not exists response_config jsonb not null default '{}'::jsonb;
alter table public.question_versions add column if not exists scoring_method text not null default 'zero_one'
  check (scoring_method in ('zero_one','plus_minus','rationale'));
create unique index if not exists uq_qv_source_id on public.question_versions(source_id) where source_id is not null;
create index if not exists idx_qv_case_set_id on public.question_versions(case_set_id) where case_set_id is not null;
comment on column public.question_versions.source_id is 'Stable source identity for idempotent imports.';
comment on column public.question_versions.case_set_id is 'Intentional unfolding case identity; scenario similarity inside a case is expected.';
comment on column public.question_versions.response_config is 'Renderer/scoring configuration for alternate NCLEX item formats.';
commit;