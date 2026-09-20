-- NursePrepIQ 0018: eliminate recursive student-read RLS policies.
-- 0017 correctly tightened publication eligibility, but its questions and
-- question_versions SELECT policies reference each other. PostgreSQL RLS then
-- recursively re-enters the policies. These SECURITY DEFINER predicates read
-- the publication state without recursively invoking student SELECT policies.
-- They do not promote or validate any question.

begin;

create or replace function public.is_question_published(p_question_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists (
    select 1
    from public.questions q
    join public.question_versions qv
      on qv.question_id=q.id
     and qv.version=q.current_version
    where q.id=p_question_id
      and q.lifecycle_status='active'
      and qv.validation_status='production_validated'
  );
$$;

create or replace function public.is_question_version_published(p_question_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists (
    select 1
    from public.question_versions qv
    join public.questions q
      on q.id=qv.question_id
     and q.current_version=qv.version
    where qv.id=p_question_version_id
      and q.lifecycle_status='active'
      and qv.validation_status='production_validated'
  );
$$;

revoke all on function public.is_question_published(uuid) from public;
revoke all on function public.is_question_version_published(uuid) from public;
grant execute on function public.is_question_published(uuid) to authenticated;
grant execute on function public.is_question_version_published(uuid) to authenticated;

drop policy if exists "questions_read_active" on public.questions;
create policy "questions_read_active" on public.questions
for select to authenticated
using (public.is_question_published(id));

drop policy if exists "question_versions_read_active" on public.question_versions;
create policy "question_versions_read_active" on public.question_versions
for select to authenticated
using (public.is_question_version_published(id));

drop policy if exists "question_options_read_active" on public.question_options;
create policy "question_options_read_active" on public.question_options
for select to authenticated
using (public.is_question_version_published(question_version_id));

comment on function public.is_question_published(uuid) is
'Non-recursive RLS predicate: true only for active questions whose current version is production_validated.';
comment on function public.is_question_version_published(uuid) is
'Non-recursive RLS predicate: true only for the current production_validated version of an active question.';

commit;
