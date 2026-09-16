-- NursePrepIQ Milestone 1: secure student data foundation
-- Run in Supabase SQL Editor before merging the student-flow PR.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  exam_track text check (exam_track in ('rn','pn')),
  exam_date date,
  test_timing text,
  confidence_level text,
  daily_goal integer not null default 20 check (daily_goal between 5 and 200),
  onboarding_complete boolean not null default false,
  subscription_status text not null default 'free' check (subscription_status in ('free','pro')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.question_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid,
  question_version integer,
  selected_answer jsonb,
  is_correct boolean,
  confidence text,
  response_time_ms integer check (response_time_ms is null or response_time_ms >= 0),
  client_need text,
  clinical_judgment_step text,
  subject text,
  difficulty text,
  created_at timestamptz not null default now()
);

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null,
  lesson_version integer not null default 1,
  status text not null default 'started' check (status in ('started','completed')),
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  last_viewed_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(user_id, lesson_id)
);

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_type text not null check (content_type in ('question','lesson','case')),
  content_id uuid not null,
  created_at timestamptz not null default now(),
  unique(user_id, content_type, content_id)
);

create table if not exists public.content_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  content_type text not null check (content_type in ('question','rationale','lesson','case','tutor')),
  content_id uuid,
  content_version integer,
  rating text not null check (rating in ('helpful','still_confused','report_problem')),
  reason text,
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists idx_question_attempts_user_created on public.question_attempts(user_id, created_at desc);
create index if not exists idx_lesson_progress_user on public.lesson_progress(user_id);
create index if not exists idx_feedback_content on public.content_feedback(content_type, content_id);

alter table public.profiles enable row level security;
alter table public.question_attempts enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.bookmarks enable row level security;
alter table public.content_feedback enable row level security;

-- Profiles: students can only access their own row.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Student-owned activity tables.
drop policy if exists "attempts_select_own" on public.question_attempts;
create policy "attempts_select_own" on public.question_attempts for select using (auth.uid() = user_id);
drop policy if exists "attempts_insert_own" on public.question_attempts;
create policy "attempts_insert_own" on public.question_attempts for insert with check (auth.uid() = user_id);

drop policy if exists "lesson_progress_select_own" on public.lesson_progress;
create policy "lesson_progress_select_own" on public.lesson_progress for select using (auth.uid() = user_id);
drop policy if exists "lesson_progress_insert_own" on public.lesson_progress;
create policy "lesson_progress_insert_own" on public.lesson_progress for insert with check (auth.uid() = user_id);
drop policy if exists "lesson_progress_update_own" on public.lesson_progress;
create policy "lesson_progress_update_own" on public.lesson_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "bookmarks_select_own" on public.bookmarks;
create policy "bookmarks_select_own" on public.bookmarks for select using (auth.uid() = user_id);
drop policy if exists "bookmarks_insert_own" on public.bookmarks;
create policy "bookmarks_insert_own" on public.bookmarks for insert with check (auth.uid() = user_id);
drop policy if exists "bookmarks_delete_own" on public.bookmarks;
create policy "bookmarks_delete_own" on public.bookmarks for delete using (auth.uid() = user_id);

drop policy if exists "feedback_select_own" on public.content_feedback;
create policy "feedback_select_own" on public.content_feedback for select using (auth.uid() = user_id);
drop policy if exists "feedback_insert_own" on public.content_feedback;
create policy "feedback_insert_own" on public.content_feedback for insert with check (auth.uid() = user_id or user_id is null);

-- Create a profile automatically when a Supabase Auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, exam_track)
  values (
    new.id,
    new.email,
    case when lower(coalesce(new.raw_user_meta_data->>'track','rn')) = 'pn' then 'pn' else 'rn' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute procedure public.set_updated_at();
