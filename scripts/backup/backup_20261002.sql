-- Pre-rebuild backup (2026-10-02). Additive only: copies every question-related table,
-- and every student table that references questions, into backup_20261002.
create schema if not exists backup_20261002;
revoke all on schema backup_20261002 from anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'questions','question_versions','question_options','question_case_studies',
    'question_validation_events','question_integrity_audit','question_content_cleanup_audit',
    'anthropic_question_maintenance','question_production_targets','ngn_item_type_targets',
    'question_attempts','question_feedback','question_ai_chat',
    'exam_blueprints','exam_sessions','exam_session_items','exam_responses',
    'bookmarks','content_feedback','profiles','lesson_progress'
  ] loop
    execute format('create table if not exists backup_20261002.%I as table public.%I', t, t);
  end loop;
end $$;

-- Definitions of legacy views, functions, triggers, policies and constraints, for reference/restore.
create table if not exists backup_20261002.legacy_definitions as
  select 'view' as kind, table_name::text as name, view_definition::text as definition
    from information_schema.views where table_schema = 'public'
  union all
  select 'function', p.proname::text, pg_get_functiondef(p.oid)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prokind = 'f' and pg_get_functiondef(p.oid) ~ 'question'
  union all
  select 'trigger', tgname::text || ' on ' || tgrelid::regclass::text, pg_get_triggerdef(t.oid)
    from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and not t.tgisinternal
  union all
  select 'policy', tablename || '.' || policyname, coalesce(qual, '') || ' | ' || coalesce(with_check, '')
    from pg_policies where schemaname = 'public'
  union all
  select 'constraint', conrelid::regclass::text || '.' || conname, pg_get_constraintdef(oid)
    from pg_constraint where connamespace = 'public'::regnamespace;

do $$
declare t text;
begin
  for t in select table_name from information_schema.tables where table_schema = 'backup_20261002' loop
    execute format('alter table backup_20261002.%I enable row level security', t);
  end loop;
end $$;
