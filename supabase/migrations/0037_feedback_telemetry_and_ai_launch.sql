-- NursePrepIQ 0037: learner feedback telemetry + AI-reviewed launch
-- Date: 2026-09-23
-- Practice-mode feedback and AI chat are optional; exam mode must not prompt during testing.
-- AI-reviewed publication requires schema, clinical, NCLEX-alignment, and editorial passes.

begin;

create table if not exists public.question_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  question_version integer not null,
  attempt_id uuid references public.question_attempts(id) on delete set null,
  feedback_code text not null check (feedback_code in (
    'clear','unsure_between_two','rationale_helpful','confusing',
    'multiple_answers_possible','disagree_with_key','needs_more_detail','possibly_inaccurate'
  )),
  comment_text text,
  created_at timestamptz not null default now()
);
create index if not exists idx_question_feedback_item on public.question_feedback(question_id,question_version,created_at);
alter table public.question_feedback enable row level security;
drop policy if exists "feedback_insert_own" on public.question_feedback;
create policy "feedback_insert_own" on public.question_feedback for insert to authenticated with check (auth.uid()=user_id);
drop policy if exists "feedback_read_own" on public.question_feedback;
create policy "feedback_read_own" on public.question_feedback for select to authenticated using (auth.uid()=user_id);

create table if not exists public.question_ai_chat (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  question_version integer not null,
  attempt_id uuid references public.question_attempts(id) on delete set null,
  user_message text not null,
  assistant_message text,
  created_at timestamptz not null default now()
);
create index if not exists idx_question_ai_chat_item on public.question_ai_chat(question_id,question_version,created_at);
alter table public.question_ai_chat enable row level security;
drop policy if exists "question_chat_insert_own" on public.question_ai_chat;
create policy "question_chat_insert_own" on public.question_ai_chat for insert to authenticated with check (auth.uid()=user_id);
drop policy if exists "question_chat_read_own" on public.question_ai_chat;
create policy "question_chat_read_own" on public.question_ai_chat for select to authenticated using (auth.uid()=user_id);

-- Aggregate item-health telemetry for internal review. SECURITY DEFINER prevents
-- exposing individual student records while allowing service/admin analytics.
create or replace view public.question_item_health as
select
 q.id as question_id,q.slug,q.current_version,q.lifecycle_status,
 count(a.id) as attempts,
 avg(case when a.is_correct then 1.0 else 0.0 end) as proportion_correct,
 avg(a.response_time_ms) as avg_response_time_ms,
 percentile_cont(0.5) within group(order by a.response_time_ms) as median_response_time_ms,
 count(f.id) filter(where f.feedback_code='confusing') as confusing_reports,
 count(f.id) filter(where f.feedback_code='multiple_answers_possible') as multiple_answer_reports,
 count(f.id) filter(where f.feedback_code='disagree_with_key') as key_disagreement_reports,
 count(f.id) filter(where f.feedback_code='possibly_inaccurate') as accuracy_reports
from public.questions q
left join public.question_attempts a on a.question_id=q.id and a.question_version=q.current_version
left join public.question_feedback f on f.question_id=q.id and f.question_version=q.current_version
group by q.id,q.slug,q.current_version,q.lifecycle_status;

-- Publish every current AI-reviewed version satisfying the owner-authorized launch gate.
do $$
declare candidate record;
begin
 for candidate in
   select q.id,q.current_version
   from public.questions q
   where q.lifecycle_status in ('pilot','validating','review')
     and public.question_ready_for_production(q.id,q.current_version)
 loop
   perform public.promote_question_to_production(candidate.id,candidate.current_version);
 end loop;
end $$;

commit;
