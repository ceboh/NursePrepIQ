-- NursePrepIQ 0011: simulator-safe question selection
-- Only production-validated, active current versions are eligible for simulated exams.
-- This deliberately excludes generated, validating, pilot, review, and retired content.

create or replace function public.start_simulated_exam(p_blueprint_slug text)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_bp public.exam_blueprints%rowtype;
  v_session_id uuid;
  v_available integer;
begin
  select * into v_bp
  from public.exam_blueprints
  where slug=p_blueprint_slug and is_active=true and mode='simulated';

  if not found then
    raise exception 'Exam blueprint is unavailable';
  end if;

  select count(*) into v_available
  from public.questions q
  join public.question_versions qv
    on qv.question_id=q.id and qv.version=q.current_version
  where q.lifecycle_status='active'
    and qv.validation_status='production_validated'
    and v_bp.exam_track = any(qv.exam_tracks);

  if v_available < v_bp.question_count then
    raise exception 'Insufficient production-validated items for this exam: need %, have %',
      v_bp.question_count, v_available;
  end if;

  insert into public.exam_sessions(user_id,blueprint_id,exam_track,mode,question_count)
  values(auth.uid(),v_bp.id,v_bp.exam_track,v_bp.mode,v_bp.question_count)
  returning id into v_session_id;

  insert into public.exam_session_items(
    exam_session_id,sequence_number,question_id,question_version,item_snapshot
  )
  select
    v_session_id,
    row_number() over ()::integer,
    q.id,
    qv.version,
    jsonb_build_object(
      'stem',qv.stem,
      'item_type',qv.item_type,
      'subject',qv.subject,
      'topic',qv.topic,
      'client_need',qv.client_need,
      'clinical_judgment_step',qv.clinical_judgment_step,
      'difficulty',qv.difficulty,
      'options',(
        select coalesce(jsonb_agg(
          jsonb_build_object(
            'key',qo.option_key,
            'text',qo.option_text,
            'display_order',qo.display_order
          ) order by qo.display_order
        ),'[]'::jsonb)
        from public.question_options qo
        where qo.question_version_id=qv.id
      )
    )
  from (
    select q.id
    from public.questions q
    join public.question_versions qv0
      on qv0.question_id=q.id and qv0.version=q.current_version
    where q.lifecycle_status='active'
      and qv0.validation_status='production_validated'
      and v_bp.exam_track = any(qv0.exam_tracks)
    order by random()
    limit v_bp.question_count
  ) picked
  join public.questions q on q.id=picked.id
  join public.question_versions qv
    on qv.question_id=q.id and qv.version=q.current_version;

  return v_session_id;
end;
$$;

revoke all on function public.start_simulated_exam(text) from public;
grant execute on function public.start_simulated_exam(text) to authenticated;

-- Operational inventory: stages stay mutually visible instead of being collapsed into
-- a misleading single "question count".
create or replace view public.question_inventory_counts as
select
  count(*) filter (where q.lifecycle_status in ('draft','validating')) as generated_or_in_validation,
  count(*) filter (where q.lifecycle_status='pilot') as pilot,
  count(*) filter (
    where q.lifecycle_status='active' and qv.validation_status='production_validated'
  ) as production_validated_active,
  count(*) filter (
    where q.lifecycle_status='active' and qv.validation_status<>'production_validated'
  ) as active_not_production_validated,
  count(*) as total
from public.questions q
join public.question_versions qv
  on qv.question_id=q.id and qv.version=q.current_version;

comment on function public.start_simulated_exam(text) is
'Creates a version-locked simulated exam using only active current question versions explicitly marked production_validated.';

comment on view public.question_inventory_counts is
'Operational inventory. Generated/in-validation, pilot, production-validated active, and active-but-not-production-validated counts remain distinct.';
