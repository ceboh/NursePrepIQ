-- NursePrepIQ 0024: cleanup respiratory expansion bank (0007)
-- Improves the 24 existing RN/PN respiratory pilot items without promoting them.
-- Correct-answer positions are rebalanced deterministically; generic distractor rationales
-- are replaced with option-specific teaching explanations. No clinical/pilot gate is fabricated.

begin;

do $$
declare
  rec record;
  correct_text text;
  correct_rationale text;
  wrong_texts text[];
  wrong_rats text[];
  desired_pos int;
  ordered_text text[];
  ordered_rat text[];
  i int;
begin
  for rec in
    select q.id qid, qv.id vid, q.slug,
           row_number() over(order by q.slug)::int rn
    from public.questions q
    join public.question_versions qv on qv.question_id=q.id and qv.version=q.current_version
    where q.slug like 'rn-resp-%-bank-%' or q.slug like 'pn-resp-%-bank-%'
  loop
    select qo.option_text, qo.rationale
      into correct_text, correct_rationale
    from public.question_options qo
    where qo.question_version_id=rec.vid and qo.is_correct
    limit 1;

    select array_agg(x.option_text order by x.display_order),
           array_agg(x.rationale order by x.display_order)
      into wrong_texts, wrong_rats
    from (
      select qo.option_text,
        case
          when qo.option_text ilike '%wait%' or qo.option_text ilike '%delay%' or qo.option_text ilike '%routine documentation%'
            then 'This delays assessment or escalation of a potentially important respiratory change and can allow deterioration to progress.'
          when qo.option_text ilike '%flat%' or qo.option_text ilike '%supine%'
            then 'A flat or continuously supine position can worsen ventilation in a dyspneic client and does not address the respiratory priority.'
          when qo.option_text ilike '%walk%' or qo.option_text ilike '%ambulat%' or qo.option_text ilike '%activity%'
            then 'Increasing exertion during acute or worsening respiratory symptoms can increase oxygen demand and is not the safest priority response.'
          when qo.option_text ilike '%teaching%' or qo.option_text ilike '%review%'
            then 'Teaching is appropriate after physiologic stability is established; it should not take priority over assessment of a changing respiratory condition.'
          when qo.option_text ilike '%unchanged%' or qo.option_text ilike '%chronic%'
            then 'This describes a stable or chronic finding rather than the new deterioration or treatment response the question is asking the nurse to identify.'
          when qo.option_text ilike '%drows%' or qo.option_text ilike '%confus%' or qo.option_text ilike '%difficult to arouse%'
            then 'Worsening mentation during respiratory illness can indicate inadequate oxygenation or ventilation, so this finding does not demonstrate improvement.'
          when qo.option_text ilike '%blood pressure falls%' or qo.option_text ilike '%hypotens%'
            then 'Falling blood pressure suggests impaired perfusion or instability rather than an adequate response to treatment.'
          when qo.option_text ilike '%withhold all oral fluids%'
            then 'Blanket fluid restriction is not appropriate for every client with pneumonia; hydration decisions must follow the individualized clinical plan.'
          else 'This choice addresses a less urgent, isolated, or nonprogressive finding and does not best match the priority respiratory cue pattern in the stem.'
        end as rationale,
        qo.display_order
      from public.question_options qo
      where qo.question_version_id=rec.vid and not qo.is_correct
    ) x;

    -- Cycle correct positions A/B/C/D across the 24-item bank.
    desired_pos := ((rec.rn - 1) % 4) + 1;
    ordered_text := array[]::text[];
    ordered_rat := array[]::text[];

    for i in 1..4 loop
      if i=desired_pos then
        ordered_text := array_append(ordered_text,correct_text);
        ordered_rat := array_append(ordered_rat,correct_rationale);
      else
        ordered_text := array_append(ordered_text,wrong_texts[case when i<desired_pos then i else i-1 end]);
        ordered_rat := array_append(ordered_rat,wrong_rats[case when i<desired_pos then i else i-1 end]);
      end if;
    end loop;

    delete from public.question_options where question_version_id=rec.vid;
    for i in 1..4 loop
      insert into public.question_options(question_version_id,option_key,option_text,is_correct,rationale,display_order)
      values(rec.vid,chr(96+i),ordered_text[i],i=desired_pos,ordered_rat[i],i);
    end loop;

    update public.question_versions
      set difficulty=case when clinical_judgment_step in ('Analyze Cues','Take Action') then 'hard' else difficulty end,
          rationale_distractors='Each distractor is evaluated against the specific respiratory cue pattern, urgency, physiologic trend, and RN/PN role rather than dismissed by a generic rule.',
          source_note='Original NursePrepIQ pilot item; editorial cleanup completed for distractor specificity, answer-position balance, difficulty calibration, and RN/PN role framing. Clinical and pilot validation remain required before production.'
    where id=rec.vid;

    update public.questions set lifecycle_status='pilot' where id=rec.qid;
  end loop;
end $$;

commit;
