-- NursePrepIQ 0031: automated deployment pipeline smoke test
-- Safe, idempotent metadata only. No question content or serving state changes.
begin;

create table if not exists public.deployment_pipeline_checks (
  check_name text primary key,
  checked_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb
);

insert into public.deployment_pipeline_checks (check_name, checked_at, details)
values (
  'github_actions_supabase_db_push',
  now(),
  jsonb_build_object(
    'migration','0031',
    'purpose','Verify automated GitHub Actions to Supabase migration deployment',
    'question_content_changed',false
  )
)
on conflict (check_name) do update
set checked_at=excluded.checked_at,
    details=excluded.details;

commit;
