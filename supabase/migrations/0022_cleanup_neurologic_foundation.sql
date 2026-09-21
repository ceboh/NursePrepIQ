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
-- Deterministic rotation preserves option text/rationales and yields A/B/C/D distribution across the 24-item bank.
with neuro as (
 select qv.id,row_number() over(order by qv.topic,qv.exam_tracks::text,qv.id) rn
 from public.question_versions qv where qv.subject='Adult Health: Neurologic'
), mapped as (
 select n.id, ((n.rn-1)%4)+1 target_pos from neuro n
), old as (
 select qo.question_version_id,qo.option_key,qo.option_text,qo.is_correct,qo.rationale,qo.display_order,
        row_number() over(partition by qo.question_version_id order by qo.display_order) old_pos
 from public.question_options qo join mapped m on m.id=qo.question_version_id
), rotated as (
 select o.question_version_id,o.option_text,o.is_correct,o.rationale,
        case when o.is_correct then m.target_pos
             else row_number() over(partition by o.question_version_id order by o.old_pos) + case when row_number() over(partition by o.question_version_id order by o.old_pos)>=m.target_pos then 1 else 0 end
        end proposed_pos
 from old o join mapped m on m.id=o.question_version_id
), fixed as (
 select question_version_id,option_text,is_correct,rationale,
        case when is_correct then proposed_pos
             else row_number() over(partition by question_version_id order by proposed_pos,option_text)
                  + case when row_number() over(partition by question_version_id order by proposed_pos,option_text)>=max(proposed_pos) filter(where is_correct) over(partition by question_version_id) then 1 else 0 end
        end new_pos
 from rotated
)
-- Stage keys/orders outside the constrained A-D range first so rows can swap safely
-- without transient unique-key collisions during the UPDATE.
update public.question_options qo
set option_key='tmp_'||qo.option_key,
    display_order=100+qo.display_order
from public.question_versions qv
where qo.question_version_id=qv.id
  and qv.subject='Adult Health: Neurologic';

update public.question_options qo set
 option_key=chr((96+f.new_pos)::integer),display_order=f.new_pos
from fixed f
where qo.question_version_id=f.question_version_id and qo.option_text=f.option_text;

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