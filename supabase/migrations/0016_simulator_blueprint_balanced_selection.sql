-- NursePrepIQ 0016: blueprint-balanced simulated exam selection.
-- Replaces purely random selection with deterministic per-client-need quotas,
-- while preserving random sampling inside each quota.
-- Only active + production_validated current versions remain eligible.
-- This does NOT activate either simulated-exam blueprint.

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
  v_selected integer;
  v_need record;
  v_quota integer;
  v_need_available integer;
  v_remaining integer;
begin
  select * into v_bp
  from public.exam_blueprints
  where slug=p_blueprint_slug and is_active=true and mode='simulated';

  if not found then raise exception 'Exam blueprint is unavailable'; end if;
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if v_bp.client_need_targets='{}'::jsonb then raise exception 'Blueprint client-need targets are not configured'; end if;

  select count(*) into v_available
  from public.questions q
  join public.question_versions qv on qv.question_id=q.id and qv.version=q.current_version
  where q.lifecycle_status='active'
    and qv.validation_status='production_validated'
    and v_bp.exam_track=any(qv.exam_tracks)
    and v_bp.client_need_targets ? qv.client_need;

  if v_available < v_bp.question_count then
    raise exception 'Insufficient production-validated blueprint-eligible items: need %, have %',v_bp.question_count,v_available;
  end if;

  create temporary table _npiq_exam_pick(question_id uuid primary key) on commit drop;

  -- First satisfy every configured minimum share. CEIL intentionally protects
  -- the lower bound; the remaining slots are filled only without exceeding max.
  for v_need in
    select key as client_need,value as bounds
    from jsonb_each(v_bp.client_need_targets)
    order by key
  loop
    v_quota:=ceil(v_bp.question_count*((v_need.bounds->>'min')::numeric));
    select count(*) into v_need_available
    from public.questions q
    join public.question_versions qv on qv.question_id=q.id and qv.version=q.current_version
    where q.lifecycle_status='active' and qv.validation_status='production_validated'
      and v_bp.exam_track=any(qv.exam_tracks) and qv.client_need=v_need.client_need;
    if v_need_available<v_quota then
      raise exception 'Blueprint not ready for %: need at least %, have % production-validated items',v_need.client_need,v_quota,v_need_available;
    end if;
    insert into _npiq_exam_pick(question_id)
    select q.id
    from public.questions q
    join public.question_versions qv on qv.question_id=q.id and qv.version=q.current_version
    where q.lifecycle_status='active' and qv.validation_status='production_validated'
      and v_bp.exam_track=any(qv.exam_tracks) and qv.client_need=v_need.client_need
    order by random() limit v_quota;
  end loop;

  select count(*) into v_selected from _npiq_exam_pick;
  if v_selected>v_bp.question_count then
    raise exception 'Blueprint minimum quotas exceed exam length: selected %, exam length %',v_selected,v_bp.question_count;
  end if;

  -- Fill remaining slots across needs that are still below their configured max.
  v_remaining:=v_bp.question_count-v_selected;
  if v_remaining>0 then
    insert into _npiq_exam_pick(question_id)
    select candidate.question_id
    from (
      select q.id as question_id,random() as r
      from public.questions q
      join public.question_versions qv on qv.question_id=q.id and qv.version=q.current_version
      join lateral (
        select (v_bp.client_need_targets->qv.client_need->>'max')::numeric max_share
      ) lim on true
      where q.lifecycle_status='active' and qv.validation_status='production_validated'
        and v_bp.exam_track=any(qv.exam_tracks)
        and v_bp.client_need_targets ? qv.client_need
        and not exists(select 1 from _npiq_exam_pick p where p.question_id=q.id)
        and (select count(*) from _npiq_exam_pick p join public.questions pq on pq.id=p.question_id
             join public.question_versions pv on pv.question_id=pq.id and pv.version=pq.current_version
             where pv.client_need=qv.client_need) < floor(v_bp.question_count*lim.max_share)
      order by r
    ) candidate
    limit v_remaining;
  end if;

  select count(*) into v_selected from _npiq_exam_pick;
  if v_selected<>v_bp.question_count then
    raise exception 'Could not satisfy blueprint ranges for full exam: selected %, need %',v_selected,v_bp.question_count;
  end if;

  insert into public.exam_sessions(user_id,blueprint_id,exam_track,mode,question_count)
  values(auth.uid(),v_bp.id,v_bp.exam_track,v_bp.mode,v_bp.question_count)
  returning id into v_session_id;

  insert into public.exam_session_items(exam_session_id,sequence_number,question_id,question_version,item_snapshot)
  select v_session_id,row_number() over(order by random())::integer,q.id,qv.version,
    jsonb_build_object('stem',qv.stem,'item_type',qv.item_type,'subject',qv.subject,'topic',qv.topic,
      'client_need',qv.client_need,'clinical_judgment_step',qv.clinical_judgment_step,'difficulty',qv.difficulty,
      'options',(select coalesce(jsonb_agg(jsonb_build_object('key',qo.option_key,'text',qo.option_text,'display_order',qo.display_order) order by qo.display_order),'[]'::jsonb)
                 from public.question_options qo where qo.question_version_id=qv.id))
  from _npiq_exam_pick p
  join public.questions q on q.id=p.question_id
  join public.question_versions qv on qv.question_id=q.id and qv.version=q.current_version;

  return v_session_id;
end;
$$;

revoke all on function public.start_simulated_exam(text) from public;
grant execute on function public.start_simulated_exam(text) to authenticated;

comment on function public.start_simulated_exam(text) is
'Creates a version-locked simulated exam using only active production-validated items and enforces configured NCLEX client-need minimum/maximum ranges. This is blueprint-balanced simulation, not CAT equivalence and not an NCLEX outcome predictor.';
