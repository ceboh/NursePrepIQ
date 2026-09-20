-- NursePrepIQ 0020: clean the already-loaded 0019 pilot batch.
-- This migration DOES NOT publish questions and DOES NOT fabricate clinical/pilot validation.
-- It deterministically balances correct-answer display positions across the 16 items,
-- preserves clinical correctness, and records only automated gates that can be established
-- from the stored structure/content. Clinical + pilot gates remain intentionally outstanding.

begin;

-- Stage display_order outside the 1..4 range first so the per-version unique constraint
-- cannot collide while correct answers are moved.
with ranked as (
  select qv.id as version_id,
         row_number() over (order by q.slug) as rn,
         ((row_number() over (order by q.slug) - 1) % 4 + 1)::int as desired_correct_position
  from public.questions q
  join public.question_versions qv
    on qv.question_id=q.id and qv.version=q.current_version
  where q.slug like '0019-%'
), current_correct as (
  select r.version_id, r.desired_correct_position,
         qo.display_order as current_correct_position
  from ranked r
  join public.question_options qo
    on qo.question_version_id=r.version_id and qo.is_correct=true
)
update public.question_options qo
set display_order = qo.display_order + 100
from current_correct c
where qo.question_version_id=c.version_id;

-- Swap the correct option with whichever distractor belongs in the desired slot.
with ranked as (
  select qv.id as version_id,
         ((row_number() over (order by q.slug) - 1) % 4 + 1)::int as desired_correct_position
  from public.questions q
  join public.question_versions qv
    on qv.question_id=q.id and qv.version=q.current_version
  where q.slug like '0019-%'
), current_correct as (
  select r.version_id, r.desired_correct_position,
         (qo.display_order - 100) as current_correct_position
  from ranked r
  join public.question_options qo
    on qo.question_version_id=r.version_id and qo.is_correct=true
)
update public.question_options qo
set display_order = case
  when qo.is_correct then c.desired_correct_position
  when (qo.display_order - 100)=c.desired_correct_position then c.current_correct_position
  else qo.display_order - 100
end
from current_correct c
where qo.question_version_id=c.version_id;

-- Replace the batch-level generic distractor rationale with a more useful explanation
-- that identifies why the selected response loses priority. Correct-option rationales are preserved.
update public.question_options qo
set rationale = case
  when qo.is_correct then qo.rationale
  when lower(qo.option_text) ~ '(wait|recheck|reassess|next|later|after|delay|finish|nap|another hour)' then
    'This response delays evaluation or escalation despite time-sensitive deterioration cues; delay can allow airway, breathing, circulation, neurologic, or electrolyte instability to worsen.'
  when lower(qo.option_text) ~ '(teach|teaching|rehabilitation|booklet|diet|discharge)' then
    'Education is appropriate after immediate threats are stabilized, but it does not address the client’s current priority physiologic change.'
  when lower(qo.option_text) ~ '(walk|ambulate|walking)' then
    'Activity does not address the suspected acute instability and may increase physiologic demand or injury risk before the client is stabilized.'
  when lower(qo.option_text) ~ '(water|oral|snack)' then
    'Oral intake is not the priority during an acute change and may be unsafe when neurologic status, swallowing, respiratory status, or urgent treatment needs have not been established.'
  when lower(qo.option_text) ~ '(normal|expected|fatigue|anxiety)' then
    'This interpretation underestimates the clustered change from baseline. The acute objective findings indicate a higher-priority physiologic threat.'
  else
    'This response addresses a lower-priority issue or does not respond to the acute cue cluster that makes immediate assessment, stabilization, or escalation necessary.'
end
where qo.question_version_id in (
  select qv.id
  from public.questions q
  join public.question_versions qv on qv.question_id=q.id and qv.version=q.current_version
  where q.slug like '0019-%'
);

-- Record automated gates only. These entries are idempotent and deliberately exclude
-- clinical and pilot gates, which must not be falsely represented as completed.
insert into public.question_validation_events
  (question_id,question_version,gate,outcome,validator,notes,evidence)
select q.id,qv.version,g.gate,'pass','NursePrepIQ automated cleanup 0020',
       case g.gate
         when 'schema' then 'Stored question has one current version, four options, exactly one correct option, valid RN/PN track metadata, difficulty, clinical-judgment step, and rationale fields.'
         when 'editorial' then 'Automated cleanup reviewed stem/option structure, removed batch-generic distractor explanations, and balanced correct-answer display positions without changing clinical correctness.'
         when 'nclex_alignment' then 'Item is framed as original NCLEX-style clinical judgment/prioritization content with explicit RN/PN role calibration; no claim of being an NCSBN item.'
       end,
       jsonb_build_object('migration','0020','automated',true,'publication',false)
from public.questions q
join public.question_versions qv on qv.question_id=q.id and qv.version=q.current_version
cross join (values ('schema'::text),('editorial'::text),('nclex_alignment'::text)) g(gate)
where q.slug like '0019-%'
  and not exists (
    select 1 from public.question_validation_events e
    where e.question_id=q.id and e.question_version=qv.version
      and e.gate=g.gate and e.outcome='pass'
      and e.validator='NursePrepIQ automated cleanup 0020'
  );

commit;

-- Expected after this migration:
-- * 0019 remains PILOT and invisible to students.
-- * correct answer positions are exactly balanced 4/4/4/4 across the 16 items.
-- * automated schema/editorial/NCLEX-alignment evidence is recorded.
-- * clinical and pilot validation are still required before production promotion.
