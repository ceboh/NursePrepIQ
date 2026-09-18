-- NursePrepIQ 0010: Simulated NCLEX exam foundation
-- Adds version-locked exam sessions/responses and blueprint configuration.
-- No generated/pilot question is promoted by this migration.

create table if not exists public.exam_blueprints (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  exam_track text not null check (exam_track in ('rn','pn')),
  mode text not null default 'simulated' check (mode in ('diagnostic','simulated','adaptive')),
  question_count integer not null check (question_count > 0),
  time_limit_minutes integer,
  blueprint jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  blueprint_id uuid references public.exam_blueprints(id),
  exam_track text not null check (exam_track in ('rn','pn')),
  mode text not null check (mode in ('diagnostic','simulated','adaptive')),
  status text not null default 'in_progress' check (status in ('in_progress','completed','abandoned')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  question_count integer not null,
  correct_count integer not null default 0,
  elapsed_seconds integer not null default 0,
  performance_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.exam_session_items (
  id uuid primary key default gen_random_uuid(),
  exam_session_id uuid not null references public.exam_sessions(id) on delete cascade,
  sequence_number integer not null,
  question_id uuid not null references public.questions(id),
  question_version integer not null,
  item_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(exam_session_id, sequence_number),
  unique(exam_session_id, question_id)
);

create table if not exists public.exam_responses (
  id uuid primary key default gen_random_uuid(),
  exam_session_id uuid not null references public.exam_sessions(id) on delete cascade,
  session_item_id uuid not null references public.exam_session_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  selected_answer jsonb,
  is_correct boolean,
  response_time_ms integer,
  flagged boolean not null default false,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  unique(exam_session_id, session_item_id)
);

create index if not exists idx_exam_sessions_user_started on public.exam_sessions(user_id, started_at desc);
create index if not exists idx_exam_items_session_sequence on public.exam_session_items(exam_session_id, sequence_number);
create index if not exists idx_exam_responses_session on public.exam_responses(exam_session_id);

alter table public.exam_blueprints enable row level security;
alter table public.exam_sessions enable row level security;
alter table public.exam_session_items enable row level security;
alter table public.exam_responses enable row level security;

drop policy if exists "exam_blueprints_read_active" on public.exam_blueprints;
create policy "exam_blueprints_read_active" on public.exam_blueprints for select using (is_active=true);

drop policy if exists "exam_sessions_own_all" on public.exam_sessions;
create policy "exam_sessions_own_all" on public.exam_sessions for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

drop policy if exists "exam_items_own_read" on public.exam_session_items;
create policy "exam_items_own_read" on public.exam_session_items for select using (exists(select 1 from public.exam_sessions s where s.id=exam_session_id and s.user_id=auth.uid()));

drop policy if exists "exam_items_own_insert" on public.exam_session_items;
create policy "exam_items_own_insert" on public.exam_session_items for insert with check (exists(select 1 from public.exam_sessions s where s.id=exam_session_id and s.user_id=auth.uid()));

drop policy if exists "exam_responses_own_all" on public.exam_responses;
create policy "exam_responses_own_all" on public.exam_responses for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- Initial blueprints remain inactive until the simulator selection/scoring engine is validated.
insert into public.exam_blueprints(slug,name,exam_track,mode,question_count,time_limit_minutes,blueprint,is_active) values
('rn-simulated-v1','NCLEX-RN Simulated Prep Exam v1','rn','simulated',85,300,'{"test_plan":"2026-2029","selection":"blueprint_balanced","rationale_during_exam":false,"ads_during_exam":false,"version_lock":true}'::jsonb,false),
('pn-simulated-v1','NCLEX-PN Simulated Prep Exam v1','pn','simulated',85,300,'{"test_plan":"2026-2029","selection":"blueprint_balanced","rationale_during_exam":false,"ads_during_exam":false,"version_lock":true}'::jsonb,false)
on conflict(slug) do nothing;
