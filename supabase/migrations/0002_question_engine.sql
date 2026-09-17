-- NursePrepIQ Milestone 2: database-driven, versioned question engine
-- Run this migration in the Supabase SQL Editor.

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  lifecycle_status text not null default 'draft' check (lifecycle_status in ('draft','validating','pilot','active','review','retired')),
  current_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.question_versions (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  version integer not null,
  stem text not null,
  item_type text not null default 'single_best_answer',
  exam_tracks text[] not null default array['rn','pn']::text[],
  subject text not null,
  topic text not null,
  client_need text not null,
  clinical_judgment_step text,
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  rationale_correct text not null,
  rationale_distractors text not null,
  memory_rule text,
  source_note text,
  validation_status text not null default 'pilot' check (validation_status in ('draft','ai_validated','pilot','production_validated')),
  created_at timestamptz not null default now(),
  unique(question_id, version)
);

create table if not exists public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_version_id uuid not null references public.question_versions(id) on delete cascade,
  option_key text not null,
  option_text text not null,
  is_correct boolean not null default false,
  rationale text,
  display_order integer not null,
  unique(question_version_id, option_key),
  unique(question_version_id, display_order)
);

create index if not exists idx_questions_status on public.questions(lifecycle_status);
create index if not exists idx_qv_question_version on public.question_versions(question_id, version desc);
create index if not exists idx_qv_topic on public.question_versions(subject, topic);
create index if not exists idx_qv_tracks on public.question_versions using gin(exam_tracks);
create index if not exists idx_qo_version_order on public.question_options(question_version_id, display_order);

alter table public.questions enable row level security;
alter table public.question_versions enable row level security;
alter table public.question_options enable row level security;

-- Students can read only active questions and the active question's current version.
drop policy if exists "questions_read_active" on public.questions;
create policy "questions_read_active" on public.questions for select using (lifecycle_status='active');

drop policy if exists "question_versions_read_active" on public.question_versions;
create policy "question_versions_read_active" on public.question_versions for select using (
  exists (select 1 from public.questions q where q.id=question_id and q.lifecycle_status='active' and q.current_version=version)
);

drop policy if exists "question_options_read_active" on public.question_options;
create policy "question_options_read_active" on public.question_options for select using (
  exists (
    select 1 from public.question_versions qv join public.questions q on q.id=qv.question_id
    where qv.id=question_version_id and q.lifecycle_status='active' and q.current_version=qv.version
  )
);

-- Seed the first validated teaching set. These are original NursePrepIQ items.
insert into public.questions(id,slug,lifecycle_status,current_version) values
('22222222-2222-4222-8222-222222222222','heart-failure-priority-cue','active',1),
('33333333-3333-4333-8333-333333333333','heart-failure-right-sided','active',1),
('44444444-4444-4444-8444-444444444444','heart-failure-daily-weight','active',1)
on conflict (id) do update set lifecycle_status=excluded.lifecycle_status,current_version=excluded.current_version;

insert into public.question_versions(id,question_id,version,stem,item_type,exam_tracks,subject,topic,client_need,clinical_judgment_step,difficulty,rationale_correct,rationale_distractors,memory_rule,validation_status) values
('52222222-2222-4222-8222-222222222222','22222222-2222-4222-8222-222222222222',1,'The nurse is assessing a patient with chronic heart failure. Which finding requires the most immediate follow-up?','single_best_answer',array['rn','pn'],'Adult Health: Cardiovascular','Heart Failure','Physiological Integrity','Recognize Cues','medium','New dyspnea at rest with crackles suggests worsening pulmonary congestion and a current breathing problem. This requires prompt assessment and intervention.','Orthopnea and edema are important but may reflect an established pattern. Teaching about daily weights matters, but education does not outrank a new breathing problem.','A sudden change beats a chronic finding. Breathing and perfusion beat routine teaching.','pilot'),
('53333333-3333-4333-8333-333333333333','33333333-3333-4333-8333-333333333333',1,'Which assessment finding is most consistent with right-sided heart failure?','single_best_answer',array['rn','pn'],'Adult Health: Cardiovascular','Heart Failure','Physiological Integrity','Analyze Cues','medium','Right-sided failure causes blood to back up in the systemic venous circulation, making dependent edema and jugular venous distention characteristic findings.','Crackles, orthopnea, pink frothy sputum, and worsening dyspnea while supine point more strongly toward pulmonary congestion associated with left-sided failure.','LEFT = LUNGS. RIGHT = REST of the body.','pilot'),
('54444444-4444-4444-8444-444444444444','44444444-4444-4444-8444-444444444444',1,'Which patient statement best demonstrates understanding of home monitoring for heart failure?','single_best_answer',array['rn','pn'],'Adult Health: Cardiovascular','Heart Failure','Physiological Integrity','Evaluate Outcomes','medium','Consistent daily weights allow trends in fluid status to be recognized. Comparing measurements under similar conditions makes the trend more meaningful.','Waiting for visible edema can delay recognition of fluid accumulation. Increasing fluids in response to weight gain may be inappropriate. Symptoms and prescribed monitoring remain important even when the patient feels well.','Think WEIGHT for WATER trends — consistency makes the trend useful.','pilot')
on conflict (question_id,version) do nothing;

insert into public.question_options(question_version_id,option_key,option_text,is_correct,rationale,display_order) values
('52222222-2222-4222-8222-222222222222','a','The patient reports needing two pillows to sleep.',false,'Orthopnea is important but may be chronic.',1),
('52222222-2222-4222-8222-222222222222','b','The patient has 2+ bilateral ankle edema.',false,'Edema indicates congestion but is less immediately threatening than acute respiratory deterioration.',2),
('52222222-2222-4222-8222-222222222222','c','The patient has new dyspnea at rest with crackles.',true,'This is an acute breathing problem requiring prompt follow-up.',3),
('52222222-2222-4222-8222-222222222222','d','The patient asks whether daily weights are necessary.',false,'Teaching is important after immediate physiologic threats are addressed.',4),
('53333333-3333-4333-8333-333333333333','a','Crackles and orthopnea',false,'These point toward pulmonary congestion.',1),
('53333333-3333-4333-8333-333333333333','b','Dependent edema and jugular venous distention',true,'These are systemic venous congestion findings.',2),
('53333333-3333-4333-8333-333333333333','c','Pink frothy sputum',false,'This is associated with severe pulmonary congestion.',3),
('53333333-3333-4333-8333-333333333333','d','Increasing shortness of breath while lying flat',false,'Orthopnea points toward pulmonary congestion.',4),
('54444444-4444-4444-8444-444444444444','a','I will weigh myself only when my ankles swell.',false,'Waiting for edema can delay recognition of fluid accumulation.',1),
('54444444-4444-4444-8444-444444444444','b','I will compare my weight from day to day under similar conditions.',true,'Consistent measurements make fluid trends more useful.',2),
('54444444-4444-4444-8444-444444444444','c','I should drink extra fluid whenever my weight increases.',false,'Fluid changes should follow the individualized care plan, not an automatic response to weight gain.',3),
('54444444-4444-4444-8444-444444444444','d','If I feel well, I can stop tracking my symptoms.',false,'Ongoing monitoring remains important even when symptoms improve.',4)
on conflict (question_version_id,option_key) do nothing;

-- Keep timestamps current.
drop trigger if exists questions_set_updated_at on public.questions;
create trigger questions_set_updated_at before update on public.questions for each row execute procedure public.set_updated_at();
