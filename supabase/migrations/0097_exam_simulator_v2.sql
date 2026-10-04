-- 0097: Exam simulator data model on question bank v2.
--
-- The v1 simulator tables (0010) were never used on bank v2 and are empty. They are renamed to
-- *_v1, not dropped, so this migration changes no data and can be reversed:
--   drop table public.exam_session_items, public.exam_sessions;
--   alter table public.exam_sessions_v1 rename to exam_sessions;   (same for the other two,
--   and rename each *_v1 index back by removing the suffix)
--
-- Security model:
-- * Exams are assembled, delivered and scored only by server routes using the service role,
--   which bypasses RLS. Answer keys live in public.questions and are never copied here.
-- * Students can read their own sessions at any time, but can read their own items only after
--   the exam is submitted or expired, so question ids are not exposed during an exam.
-- * Students may insert their own sessions and items, but only unscored rows on sessions the
--   server has not assembled (assembly is null). The server never operates on such sessions,
--   and there are no student update or delete policies, so scores cannot be written by students.

do $$
begin
  if (select count(*) from public.exam_sessions) > 0
     or (select count(*) from public.exam_session_items) > 0
     or (select count(*) from public.exam_responses) > 0 then
    raise exception 'v1 exam tables contain data; this migration only renames empty v1 tables';
  end if;
end $$;

-- 1. Move the empty v1 tables (and their index-backed constraint names) out of the way.
alter table public.exam_responses rename to exam_responses_v1;
alter table public.exam_session_items rename to exam_session_items_v1;
alter table public.exam_sessions rename to exam_sessions_v1;

do $$
declare i record;
begin
  for i in select c.relname from pg_index x join pg_class c on c.oid = x.indexrelid
           where x.indrelid in ('public.exam_responses_v1'::regclass, 'public.exam_session_items_v1'::regclass,
                                'public.exam_sessions_v1'::regclass) loop
    execute format('alter index public.%I rename to %I', i.relname, left(i.relname, 60) || '_v1');
  end loop;
end $$;

-- 2. Exam sessions: one row per practice exam.
create table public.exam_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  track text not null check (track in ('rn', 'pn')),
  form text not null check (form in ('full', 'short')),
  status text not null default 'in_progress' check (status in ('in_progress', 'paused', 'submitted', 'expired')),
  started_at timestamptz not null default now(),
  time_limit_seconds int not null check (time_limit_seconds > 0),
  elapsed_seconds int not null default 0 check (elapsed_seconds >= 0),   -- time used up to last_resumed_at
  last_resumed_at timestamptz,                                           -- set while the clock is running
  submitted_at timestamptz,
  seed text not null,                                                    -- reproducible assembly and shuffling
  item_count int not null check (item_count > 0),
  current_position int not null default 1 check (current_position >= 1),
  assembly jsonb,                                                        -- blueprint targets and assembled counts; null = not server-assembled
  score_summary jsonb,                                                   -- written by the server at submission
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index exam_sessions_user_started_idx on public.exam_sessions (user_id, started_at desc);
-- At most one open (in progress or paused) exam per student.
create unique index exam_sessions_one_open_per_user on public.exam_sessions (user_id) where status in ('in_progress', 'paused');
create trigger exam_sessions_set_updated_at before update on public.exam_sessions for each row execute function public.set_updated_at();

-- 3. Exam items: the assembled exam in delivery order, with detailed attempt data
--    (response, time, points) for later item analysis (difficulty and discrimination).
create table public.exam_session_items (
  session_id uuid not null references public.exam_sessions(id) on delete cascade,
  position int not null check (position >= 1),
  question_id uuid not null references public.questions(id),
  case_id text references public.case_studies(id),
  presented_at timestamptz,                                              -- first delivery to the student
  presented_elapsed_seconds int,                                         -- session clock at first delivery
  response jsonb,                                                        -- student response, by stable ids
  answered_at timestamptz,
  time_spent_seconds int check (time_spent_seconds >= 0),
  points_earned numeric(6,2) check (points_earned >= 0),
  max_score numeric(6,2) check (max_score > 0),
  score numeric(5,4) check (score between 0 and 1),                      -- points_earned / max_score
  is_correct boolean,                                                    -- full credit
  primary key (session_id, position),
  unique (session_id, question_id)
);
create index exam_session_items_question_idx on public.exam_session_items (question_id);

-- 4. Row-level security.
alter table public.exam_sessions enable row level security;
alter table public.exam_session_items enable row level security;

create policy exam_sessions_select_own on public.exam_sessions
  for select to authenticated using (user_id = auth.uid());

create policy exam_sessions_insert_own on public.exam_sessions
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'in_progress' and elapsed_seconds = 0 and submitted_at is null
              and assembly is null and score_summary is null);

create policy exam_session_items_select_own_after_exam on public.exam_session_items
  for select to authenticated
  using (exists (select 1 from public.exam_sessions s
                 where s.id = session_id and s.user_id = auth.uid() and s.status in ('submitted', 'expired')));

create policy exam_session_items_insert_own on public.exam_session_items
  for insert to authenticated
  with check (exists (select 1 from public.exam_sessions s
                      where s.id = session_id and s.user_id = auth.uid() and s.status = 'in_progress' and s.assembly is null)
              and points_earned is null and max_score is null and score is null and is_correct is null);

comment on table public.exam_sessions is 'Practice exam sessions (bank v2). Server routes assemble, deliver and score; students read their own rows.';
comment on table public.exam_session_items is 'Assembled exam items with per-item response, time and score. Readable by the student only after the exam ends.';
