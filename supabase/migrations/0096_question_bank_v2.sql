-- Question bank v2: replaces the PDF-derived question tables with one structured model.
-- Content is loaded by scripts/bank/load.mjs from data/bank/*.json, never by migration.
--
-- Prerequisite: backup_20261002 (scripts/backup/backup_20261002.sql) holds a full copy of
-- every legacy question table and every student table that referenced them.
-- Student data (profiles, question_attempts, question_feedback, question_ai_chat,
-- lesson_progress, exam_*) is kept; rows keep their legacy question_id as history.

do $$
begin
  if to_regclass('backup_20261002.questions') is null
     or (select count(*) from backup_20261002.questions) <> (select count(*) from public.questions)
     or (select count(*) from backup_20261002.question_attempts) <> (select count(*) from public.question_attempts)
     or (select count(*) from backup_20261002.question_feedback) <> (select count(*) from public.question_feedback)
     or (select count(*) from backup_20261002.question_ai_chat) <> (select count(*) from public.question_ai_chat) then
    raise exception 'backup_20261002 is missing or out of date; run scripts/backup/backup_20261002.sql first';
  end if;
end $$;

-- 1. Detach student and audit tables from legacy questions so nothing cascades.
alter table public.question_feedback drop constraint if exists question_feedback_question_id_fkey;
alter table public.question_ai_chat drop constraint if exists question_ai_chat_question_id_fkey;
alter table public.exam_session_items drop constraint if exists exam_session_items_question_id_fkey;
alter table public.anthropic_question_maintenance drop constraint if exists anthropic_question_maintenance_question_id_fkey;

-- 2. Remove the legacy question pipeline (views, functions, tables). Definitions are in
--    backup_20261002.legacy_definitions.
drop view if exists public.question_item_health, public.student_valid_question_attempts, public.question_inventory_counts,
  public.question_pipeline_counts, public.simulator_blueprint_readiness, public.question_production_progress,
  public.ngn_item_type_inventory, public.question_validation_readiness_counts, public.question_validation_readiness,
  public.question_review_queue, public.question_publication_safety_audit cascade;

drop table if exists public.question_options, public.question_versions, public.question_case_studies,
  public.question_validation_events, public.question_integrity_audit, public.question_content_cleanup_audit,
  public.questions cascade;

drop function if exists public.enforce_question_production_publication() cascade;
drop function if exists public.protect_published_question_validation() cascade;
do $$
declare f regprocedure;
begin
  for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('is_question_published', 'is_question_version_published',
             'pass_key_consistency_question', 'promote_all_ready_questions', 'promote_question_to_production',
             'quarantine_key_inconsistent_question', 'question_ready_for_production', 'start_simulated_exam') loop
    execute 'drop function ' || f || ' cascade';
  end loop;
end $$;

-- 3. Schema v2.
create table public.case_studies (
  id text primary key,                      -- e.g. RN-S01-CASE
  track text not null check (track in ('rn', 'pn')),
  set_number int not null,
  title text not null,
  scenario text not null,
  exhibits jsonb not null check (jsonb_typeof(exhibits) = 'array'),   -- [{label, content}] revealed step by step
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  source_id text not null unique,           -- stable bank id, e.g. RN-S12-07
  track text not null check (track in ('rn', 'pn')),
  set_number int not null,
  set_title text not null,
  source_item_number int not null,
  client_need text not null,
  topic text not null,
  system text not null,
  discipline text not null,
  item_type text not null check (item_type in ('single_best_answer', 'multiple_response', 'matrix_grid', 'drop_down_cloze', 'highlight', 'bow_tie')),
  stem text not null,
  response jsonb not null,                  -- native structure per item type, answer key included
  rationale text not null,
  answer_summary text,
  scoring text not null,
  case_id text references public.case_studies(id),
  case_sequence int,
  clinical_judgment_step text,
  status text not null default 'pilot' check (status in ('draft', 'pilot', 'review', 'production', 'retired')),
  content_hash text not null,
  source_content_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((case_id is null) = (case_sequence is null)),
  unique (case_id, case_sequence)
);
create index questions_track_status_idx on public.questions (track, status);
create index questions_track_system_idx on public.questions (track, system);
create index questions_track_discipline_idx on public.questions (track, discipline);

create trigger questions_set_updated_at before update on public.questions for each row execute function public.set_updated_at();
create trigger case_studies_set_updated_at before update on public.case_studies for each row execute function public.set_updated_at();

alter table public.questions enable row level security;
alter table public.case_studies enable row level security;
create policy questions_read_visible on public.questions for select to authenticated using (status in ('pilot', 'production'));
create policy case_studies_read on public.case_studies for select to authenticated using (true);
-- Writes happen only through the service role (loader), which bypasses RLS.

-- 4. Student tables: v2 questions are not versioned, and new rows record the stable source_id.
alter table public.question_feedback alter column question_version drop not null;
alter table public.question_ai_chat alter column question_version drop not null;
alter table public.exam_session_items alter column question_version drop not null;
alter table public.question_attempts add column if not exists source_id text;
alter table public.question_feedback add column if not exists source_id text;
alter table public.question_ai_chat add column if not exists source_id text;

-- New rows must point at v2 questions; legacy rows keep their old ids (NOT VALID skips them).
-- NO ACTION means deleting a question can never silently remove student data.
alter table public.question_feedback add constraint question_feedback_question_id_fkey foreign key (question_id) references public.questions(id) not valid;
alter table public.question_ai_chat add constraint question_ai_chat_question_id_fkey foreign key (question_id) references public.questions(id) not valid;
alter table public.exam_session_items add constraint exam_session_items_question_id_fkey foreign key (question_id) references public.questions(id) not valid;
