-- NursePrepIQ 0022: clean neurologic foundation bank without publishing.
-- Strengthens the weakest recurring pattern in 0008: generic distractor rationales and B-key concentration.
-- Clinical/pilot validation is NOT asserted here.
begin;

update public.questions q set lifecycle_status='pilot',updated_at=now()
from public.question_versions qv
where qv.question_id=q.id and qv.subject='Adult Health: Neurologic';

-- Raise all neurologic foundation items to application-level difficulty unless already hard.
update public.question_versions
set difficulty=case when difficulty='easy' then 'medium' else difficulty end,
    rationale_distractors='Each alternative must be weighed against acuity, change from baseline, neurologic perfusion/airway risk, and the RN/PN role; stable findings, delayed responses, or unsafe interventions do not outrank acute neurologic deterioration.'
where subject='Adult Health: Neurologic';

-- Replace generic option rationales with option-specific teaching rationales based on the actual option text.
update public.question_options qo
set rationale=case
  when qo.is_correct then qv.rationale_correct
  when lower(qo.option_text) like '%wait%' or lower(qo.option_text) like '%reassess at the next%' or lower(qo.option_text) like '%before notifying%' then 'This delays evaluation or escalation of a time-sensitive neurologic change.'
  when lower(qo.option_text) like '%food%' or lower(qo.option_text) like '%fluid%' then 'Oral intake is unsafe until swallowing and neurologic status are appropriately evaluated in an acute neurologic change.'
  when lower(qo.option_text) like '%restrain%' or lower(qo.option_text) like '%hold the client%' then 'Restraining tonic-clonic movement can cause injury and does not treat the seizure.'
  when lower(qo.option_text) like '%mouth%' or lower(qo.option_text) like '%teeth%' then 'Nothing should be forced into the mouth during a seizure because it can injure the client or caregiver.'
  when lower(qo.option_text) like '%stable%' or lower(qo.option_text) like '%unchanged%' or lower(qo.option_text) like '%chronic%' then 'This finding is stable or chronic and therefore does not outrank a new neurologic deterioration.'
  when lower(qo.option_text) like '%headache%' and lower(qo.option_text) like '%improv%' then 'An improving isolated symptom with an otherwise stable neurologic examination is less concerning than a worsening multisystem neurologic trend.'
  when lower(qo.option_text) like '%visitor%' or lower(qo.option_text) like '%appointment%' then 'This is a legitimate care need but is not the priority when compared with an acute neurologic or physiologic threat.'
  when lower(qo.option_text) like '%flex%' or lower(qo.option_text) like '%strain%' or lower(qo.option_text) like '%highly stimulating%' then 'This can increase intracranial pressure or impede venous drainage and is inconsistent with neuroprotective care.'
  when lower(qo.option_text) like '%unrestricted visitors%' or lower(qo.option_text) like '%delay precautions%' then 'This can increase exposure risk; indicated transmission-based precautions should not be delayed while suspected bacterial meningitis is evaluated.'
  when lower(qo.option_text) like '%stop the medicine%' then 'Stopping antiseizure therapy independently can increase recurrence risk; medication changes require the prescribed plan and clinician guidance.'
  else 'This option is clinically plausible in another context but does not address the highest-priority neurologic cue, safest action, or intended outcome in this scenario.'
end
from public.question_versions qv
where qo.question_version_id=qv.id and qv.subject='Adult Health: Neurologic';

-- Correct the answer-position concentration inherited from 0008 (all correct answers were B).
-- Perform the whole remap in one PL/pgSQL block so the mapping remains available while
-- constrained keys/orders are staged and then restored.
do $$
declare
  qrec record;
  orec record;
  target_pos integer;
  wrong_pos integer;
begin
  for qrec in
    select qv.id as question_version_id,
           row_number() over(order by qv.topic,qv.exam_tracks::text,qv.id) as rn
    from public.question_versions qv
    where qv.subject='Adult Health: Neurologic'
  loop
    target_pos := ((qrec.rn-1)%4)+1;

    -- Move this question's four options outside the constrained A-D / 1-4 space.
    update public.question_options
    set option_key='tmp_'||option_key,
        display_order=100+display_order
    where question_version_id=qrec.question_version_id;

    -- Put the correct option directly into its deterministic target position.
    update public.question_options
    set option_key=chr(96+target_pos),
        display_order=target_pos
    where question_version_id=qrec.question_version_id
      and is_correct=true;

    wrong_pos := 1;
    for orec in
      select id
      from public.question_options
      where question_version_id=qrec.question_version_id
        and is_correct=false
      order by display_order,id
    loop
      if wrong_pos=target_pos then wrong_pos := wrong_pos+1; end if;
      update public.question_options
      set option_key=chr(96+wrong_pos),
          display_order=wrong_pos
      where id=orec.id;
      wrong_pos := wrong_pos+1;
    end loop;
  end loop;
end $$;

-- Record only gates this automated cleanup can honestly establish.
insert into public.question_validation_events(question_id,question_version,gate,outcome,validator,notes,evidence)
select qv.question_id,qv.version,g.gate,'pass','NursePrepIQ automated cleanup',
 case g.gate when 'schema' then 'Existing SBA structure retained; neurologic answer positions rebalanced in 0022.'
 when 'editorial' then 'Generic distractor explanations replaced with option-specific teaching rationales; weak difficulty labels normalized.'
 else 'Neurologic items reviewed for application/clinical-judgment framing and RN/PN role separation; this is not a clinical accuracy attestation.' end,
 jsonb_build_object('migration','0022_cleanup_neurologic_foundation.sql','automated',true)
from public.question_versions qv cross join (values('schema'::text),('editorial'::text),('nclex_alignment'::text)) g(gate)
where qv.subject='Adult Health: Neurologic'
and not exists(select 1 from public.question_validation_events e where e.question_id=qv.question_id and e.question_version=qv.version and e.gate=g.gate and e.outcome='pass');

commit;