-- NursePrepIQ 0013: high-volume production planning and NGN diversity controls
-- Planning metadata does not publish questions; validation/promotion remains governed by 0012.

create table if not exists public.question_production_targets (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  exam_track text not null check (exam_track in ('rn','pn','both')),
  target_count integer not null check (target_count > 0),
  window_days integer not null check (window_days > 0),
  daily_target integer generated always as ((target_count + window_days - 1) / window_days) stored,
  starts_on date not null default current_date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.question_production_targets(name,exam_track,target_count,window_days,is_active) values
('10-day floor','both',1000,10,true),
('10-day stretch','both',2000,10,true),
('30-day scale','both',5000,30,true)
on conflict(name) do update set
  exam_track=excluded.exam_track,target_count=excluded.target_count,
  window_days=excluded.window_days,is_active=excluded.is_active;

create table if not exists public.ngn_item_type_targets (
  item_type text primary key,
  minimum_share numeric(5,4) not null default 0 check (minimum_share >= 0 and minimum_share <= 1),
  enabled boolean not null default true,
  requires_case_context boolean not null default false,
  notes text
);

insert into public.ngn_item_type_targets(item_type,minimum_share,enabled,requires_case_context,notes) values
('single_best_answer',0,true,false,'Traditional item; retain for broad NCLEX coverage.'),
('multiple_response',0,true,false,'Select multiple applicable responses.'),
('matrix_grid',0,true,true,'NGN matrix/grid response format.'),
('cloze_dropdown',0,true,true,'NGN cloze/drop-down response format.'),
('ordered_response',0,true,false,'Ordered response/sequencing format.'),
('bow_tie',0,true,true,'NGN bow-tie clinical judgment format.')
on conflict(item_type) do nothing;

create or replace view public.question_production_progress as
with counts as (
  select
    count(*) filter (where q.lifecycle_status in ('draft','validating')) as generated,
    count(*) filter (where q.lifecycle_status='pilot' or qv.validation_status='pilot') as pilot,
    count(*) filter (where qv.validation_status='production_validated') as validated,
    count(*) filter (where q.lifecycle_status='active' and qv.validation_status='production_validated') as production_active
  from public.questions q
  join public.question_versions qv on qv.question_id=q.id and qv.version=q.current_version
)
select
  t.name,t.exam_track,t.target_count,t.window_days,t.daily_target,t.starts_on,
  greatest(0,(current_date-t.starts_on))::integer as elapsed_days,
  c.generated,c.pilot,c.validated,c.production_active,
  greatest(t.target_count-c.production_active,0) as remaining_to_target,
  case when t.target_count <= c.production_active then 0
       else ceil((t.target_count-c.production_active)::numeric /
                 greatest(t.window_days-greatest(0,(current_date-t.starts_on)),1))::integer
  end as required_active_per_remaining_day
from public.question_production_targets t cross join counts c
where t.is_active;

create or replace view public.ngn_item_type_inventory as
select
  qv.item_type,
  count(*) as current_versions,
  count(*) filter (where q.lifecycle_status='active' and qv.validation_status='production_validated') as production_active,
  count(*) filter (where q.lifecycle_status='pilot' or qv.validation_status='pilot') as pilot
from public.questions q
join public.question_versions qv on qv.question_id=q.id and qv.version=q.current_version
group by qv.item_type;

comment on view public.question_production_progress is
'Tracks the 1k/2k 10-day and 5k 30-day goals against production-active content without conflating generated, pilot, validated, and active counts.';

comment on table public.ngn_item_type_targets is
'NGN diversity configuration. Shares default to zero until editorial/clinical leadership sets evidence-based distribution targets; formats are enabled without inventing quotas.';
