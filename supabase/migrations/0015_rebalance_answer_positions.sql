-- NursePrepIQ: rebalance existing single-best-answer option positions.
-- This migration changes presentation order/letter only. It does not change
-- stems, option text, correctness, rationales, validation status, or lifecycle.
--
-- Correct positions are assigned deterministically A/B/C/D in a rotating
-- sequence across the existing SBA bank. Distractors retain their relative
-- order around the correct answer. Future imports are checked separately by
-- the repository quality gate.

do $$
begin
  if exists (
    select 1
    from public.question_versions qv
    join public.question_options qo on qo.question_version_id = qv.id
    where qv.item_type = 'single_best_answer'
    group by qv.id
    having count(*) <> 4 or count(*) filter (where qo.is_correct) <> 1
  ) then
    raise exception 'Cannot rebalance: every single_best_answer version must have exactly 4 options and exactly 1 correct option.';
  end if;
end $$;

create temporary table _npiq_option_rebalance on commit drop as
with eligible as (
  select
    qv.id as question_version_id,
    row_number() over (order by qv.question_id, qv.version) as question_number
  from public.question_versions qv
  where qv.item_type = 'single_best_answer'
),
current_positions as (
  select
    e.question_version_id,
    e.question_number,
    max(qo.display_order) filter (where qo.is_correct) as correct_order
  from eligible e
  join public.question_options qo
    on qo.question_version_id = e.question_version_id
  group by e.question_version_id, e.question_number
),
mapped as (
  select
    qo.id as option_id,
    cp.question_version_id,
    qo.display_order as old_order,
    ((cp.question_number - 1) % 4) + 1 as target_correct_order,
    (((qo.display_order - cp.correct_order + (((cp.question_number - 1) % 4) + 1) - 1) % 4) + 4) % 4 + 1 as new_order
  from current_positions cp
  join public.question_options qo
    on qo.question_version_id = cp.question_version_id
)
select * from mapped;

-- Move keys to temporary values first so the unique
-- (question_version_id, option_key) constraint cannot collide during updates.
update public.question_options qo
set option_key = 'tmp_' || qo.id::text
from _npiq_option_rebalance m
where qo.id = m.option_id;

update public.question_options qo
set
  display_order = m.new_order,
  option_key = case m.new_order
    when 1 then 'a'
    when 2 then 'b'
    when 3 then 'c'
    when 4 then 'd'
  end
from _npiq_option_rebalance m
where qo.id = m.option_id;

-- Safety assertion: the resulting correct-answer positions must be balanced
-- to within one item across A/B/C/D for the SBA bank.
do $$
declare
  min_count integer;
  max_count integer;
begin
  with counts as (
    select qo.option_key, count(*)::integer as n
    from public.question_versions qv
    join public.question_options qo on qo.question_version_id = qv.id
    where qv.item_type = 'single_best_answer'
      and qo.is_correct
    group by qo.option_key
  ),
  all_positions as (
    select p.option_key, coalesce(c.n, 0) as n
    from (values ('a'),('b'),('c'),('d')) p(option_key)
    left join counts c using (option_key)
  )
  select min(n), max(n) into min_count, max_count from all_positions;

  if max_count - min_count > 1 then
    raise exception 'Answer-position rebalance failed: distribution differs by more than one item.';
  end if;
end $$;
