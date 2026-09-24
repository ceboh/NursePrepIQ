-- NursePrepIQ 0057: production key-consistency quarantine infrastructure
-- Adds a dedicated audit gate. Questions that fail this gate are DEMOTED from
-- active production rather than deleted, preserving attempts and audit history.
begin;

alter table public.question_versions
  add column if not exists key_consistency_status text not null default 'not_checked'
  check (key_consistency_status in ('not_checked','pass','fail','needs_review'));

alter table public.question_versions
  add column if not exists key_consistency_checked_at timestamptz;

alter table public.question_versions
  add column if not exists key_consistency_notes text;

create index if not exists idx_qv_key_consistency
  on public.question_versions(key_consistency_status,validation_status);

create or replace function public.quarantine_key_inconsistent_question(
  p_question_id uuid,
  p_version integer,
  p_notes text
) returns void
language plpgsql security definer set search_path=public
as $$
begin
  update public.questions
     set lifecycle_status='review',updated_at=now()
   where id=p_question_id and current_version=p_version;

  update public.question_versions
     set key_consistency_status='fail',
         key_consistency_checked_at=now(),
         key_consistency_notes=p_notes,
         validation_status='needs_review'
   where question_id=p_question_id and version=p_version;

  insert into public.question_validation_events
    (question_id,question_version,gate,outcome,validator,notes,evidence)
  values
    (p_question_id,p_version,'key_consistency','fail',
     'NursePrepIQ production checksum',
     p_notes,
     jsonb_build_object('human_review',false,'psychometric_validation',false,
       'action','quarantined_from_production','checked_at',now()));
end;
$$;

create or replace function public.pass_key_consistency_question(
  p_question_id uuid,
  p_version integer,
  p_notes text
) returns void
language plpgsql security definer set search_path=public
as $$
begin
  update public.question_versions
     set key_consistency_status='pass',
         key_consistency_checked_at=now(),
         key_consistency_notes=p_notes
   where question_id=p_question_id and version=p_version;

  insert into public.question_validation_events
    (question_id,question_version,gate,outcome,validator,notes,evidence)
  values
    (p_question_id,p_version,'key_consistency','pass',
     'NursePrepIQ production checksum',
     p_notes,
     jsonb_build_object('human_review',false,'psychometric_validation',false,
       'checked_at',now()));
end;
$$;

-- Future production promotion now requires an explicit key-consistency pass.
create or replace function public.question_ready_for_production(p_question_id uuid,p_version integer)
returns boolean language sql stable set search_path=public as $$
  select
    exists(select 1 from public.question_versions qv
      where qv.question_id=p_question_id and qv.version=p_version
        and qv.key_consistency_status='pass')
    and not exists (
      select 1 from (values ('schema'),('clinical'),('nclex_alignment'),('editorial')) req(gate)
      where not exists (
        select 1 from public.question_validation_events e
        where e.question_id=p_question_id and e.question_version=p_version
          and e.gate=req.gate and e.outcome='pass'
      )
    );
$$;

commit;
