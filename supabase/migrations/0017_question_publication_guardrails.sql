-- NursePrepIQ 0017: production-publication guardrails.
-- Safety invariant: students may read only the current version of questions
-- that are BOTH lifecycle=active AND validation_status=production_validated.
-- Existing active-but-unvalidated seed content is demoted to pilot.

begin;

-- Correct legacy state before enforcing the invariant. This does not promote
-- any content; it only removes unvalidated content from student publication.
update public.questions q
set lifecycle_status='pilot', updated_at=now()
where q.lifecycle_status='active'
  and not exists (
    select 1
    from public.question_versions qv
    where qv.question_id=q.id
      and qv.version=q.current_version
      and qv.validation_status='production_validated'
  );

-- Students can see a question shell only when its current version has passed
-- production validation.
drop policy if exists "questions_read_active" on public.questions;
create policy "questions_read_active" on public.questions
for select using (
  lifecycle_status='active'
  and exists (
    select 1 from public.question_versions qv
    where qv.question_id=id
      and qv.version=current_version
      and qv.validation_status='production_validated'
  )
);

-- Student-facing versions must be current, active, and production validated.
drop policy if exists "question_versions_read_active" on public.question_versions;
create policy "question_versions_read_active" on public.question_versions
for select using (
  validation_status='production_validated'
  and exists (
    select 1 from public.questions q
    where q.id=question_id
      and q.lifecycle_status='active'
      and q.current_version=version
  )
);

-- Options inherit the same publication invariant through their version.
drop policy if exists "question_options_read_active" on public.question_options;
create policy "question_options_read_active" on public.question_options
for select using (
  exists (
    select 1
    from public.question_versions qv
    join public.questions q on q.id=qv.question_id
    where qv.id=question_version_id
      and qv.validation_status='production_validated'
      and q.lifecycle_status='active'
      and q.current_version=qv.version
  )
);

-- Defense in depth: even privileged application code cannot accidentally mark
-- a question active unless its current version is production validated.
create or replace function public.enforce_question_production_publication()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.lifecycle_status='active' then
    if not exists (
      select 1 from public.question_versions qv
      where qv.question_id=new.id
        and qv.version=new.current_version
        and qv.validation_status='production_validated'
    ) then
      raise exception 'Cannot activate question % version %: current version is not production_validated',new.id,new.current_version;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists questions_require_production_validation on public.questions;
create trigger questions_require_production_validation
before insert or update of lifecycle_status,current_version on public.questions
for each row execute function public.enforce_question_production_publication();

-- Prevent a currently published version from being downgraded behind the
-- question lifecycle flag. Demote the question first when clinical review is
-- reopened.
create or replace function public.protect_published_question_validation()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if old.validation_status='production_validated'
     and new.validation_status<>'production_validated'
     and exists (
       select 1 from public.questions q
       where q.id=new.question_id
         and q.current_version=new.version
         and q.lifecycle_status='active'
     ) then
    raise exception 'Demote question % from active before downgrading production validation',new.question_id;
  end if;
  return new;
end;
$$;

drop trigger if exists question_versions_protect_published_validation on public.question_versions;
create trigger question_versions_protect_published_validation
before update of validation_status on public.question_versions
for each row execute function public.protect_published_question_validation();

comment on function public.enforce_question_production_publication() is
'Prevents active publication unless the current question version is production_validated.';
comment on function public.protect_published_question_validation() is
'Prevents validation downgrade while the corresponding current question remains active.';

commit;
