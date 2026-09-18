-- NursePrepIQ 0012: content production lifecycle + promotion gates
-- Supports high-volume generation while preventing unvalidated clinical content from auto-publishing.

create table if not exists public.question_validation_events (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  question_version integer not null,
  gate text not null check (gate in ('schema','clinical','nclex_alignment','editorial','pilot')),
  outcome text not null check (outcome in ('pass','fail','needs_review')),
  validator text not null,
  notes text,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_qve_question_version
  on public.question_validation_events(question_id,question_version,gate,outcome);

alter table public.question_validation_events enable row level security;

-- Deliberately no student read policy: validation evidence is internal production metadata.

create or replace function public.question_ready_for_production(p_question_id uuid, p_version integer)
returns boolean
language sql
stable
security invoker
set search_path=public
as $$
  with required(gate) as (
    values ('schema'::text),('clinical'),('nclex_alignment'),('editorial'),('pilot')
  )
  select
    exists(
      select 1 from public.question_versions qv
      where qv.question_id=p_question_id and qv.version=p_version
    )
    and not exists (
      select 1 from required r
      where not exists (
        select 1 from public.question_validation_events e
        where e.question_id=p_question_id
          and e.question_version=p_version
          and e.gate=r.gate
          and e.outcome='pass'
      )
    )
    and not exists (
      select 1 from public.question_validation_events e
      where e.question_id=p_question_id
        and e.question_version=p_version
        and e.outcome in ('fail','needs_review')
        and e.created_at > coalesce((
          select max(p.created_at)
          from public.question_validation_events p
          where p.question_id=e.question_id
            and p.question_version=e.question_version
            and p.gate=e.gate
            and p.outcome='pass'
        ),'-infinity'::timestamptz)
    );
$$;

create or replace function public.promote_question_to_production(p_question_id uuid, p_version integer)
returns void
language plpgsql
security invoker
set search_path=public
as $$
begin
  if not public.question_ready_for_production(p_question_id,p_version) then
    raise exception 'Question version has not passed every production validation gate';
  end if;

  update public.question_versions
    set validation_status='production_validated'
    where question_id=p_question_id and version=p_version;

  if not found then raise exception 'Question version not found'; end if;

  update public.questions
    set current_version=p_version,lifecycle_status='active',updated_at=now()
    where id=p_question_id;
end;
$$;

revoke all on function public.promote_question_to_production(uuid,integer) from public, anon, authenticated;
-- Promotion is intentionally service/admin-only; do not grant it to student clients.

create or replace view public.question_pipeline_counts as
select
  count(*) filter (where q.lifecycle_status in ('draft','validating')) as generated,
  count(*) filter (where q.lifecycle_status='pilot' or qv.validation_status='pilot') as pilot,
  count(*) filter (where qv.validation_status='production_validated') as validated,
  count(*) filter (where q.lifecycle_status='active' and qv.validation_status='production_validated') as production_active,
  count(*) as total_current_versions
from public.questions q
join public.question_versions qv
  on qv.question_id=q.id and qv.version=q.current_version;

comment on function public.promote_question_to_production(uuid,integer) is
'Admin/service promotion gate. Refuses publication until schema, clinical, NCLEX alignment, editorial, and pilot gates all pass.';

comment on view public.question_pipeline_counts is
'Distinct current-version counts for generated, pilot, validated, and production-active content.';
