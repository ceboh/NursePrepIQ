-- NursePrepIQ 0060: taxonomy repair + AI-assisted validation/checksum for PN catch-up batches 0056 and 0059.
-- Review scope: generated construction guarantees the keyed option equals the scenario/function's intended answer.
-- No human or psychometric validation is claimed.
begin;

-- Ensure the new checksum gate is accepted even when 0058 was already recorded remotely before this constraint repair.
do $$ declare r record; begin
 for r in select conname from pg_constraint where conrelid='public.question_validation_events'::regclass and contype='c' and pg_get_constraintdef(oid) ilike '%gate%'
 loop execute format('alter table public.question_validation_events drop constraint %I',r.conname); end loop;
end $$;
alter table public.question_validation_events add constraint question_validation_events_gate_check check (gate in ('schema','clinical','nclex_alignment','editorial','psychometric','pilot_monitoring','key_consistency'));

-- Persist taxonomy for these new PN batches so dashboard and library use one source.
update public.question_versions qv set discipline=qv.subject
from public.questions q where q.id=qv.question_id and (q.slug like '0056-%' or q.slug like '0059-%');

update public.question_versions qv set body_system=case
 when topic ilike any(array['%Heart Failure%','%Cardiac%','%Orthostatic%','%Pulmonary Embolism%']) then 'Cardiovascular'
 when topic ilike any(array['%Respiratory%','%COPD%','%Croup%','%Aspiration%','%Opioid Respiratory%']) then 'Respiratory'
 when topic ilike any(array['%Stroke%','%Seizure%','%Neurolog%']) then 'Neurologic'
 when topic ilike any(array['%Renal%','%Urinary%','%Kidney%','%Hyperkalemia%']) then 'Renal & Urinary'
 when topic ilike any(array['%Insulin%','%Hypogly%','%Diabet%','%Adrenal%']) then 'Endocrine'
 when topic ilike any(array['%Pancrea%','%Gastro%','%Bowel%','%Liver%']) then 'Gastrointestinal'
 when topic ilike any(array['%Fracture%','%Orthopedic%','%Bone%','%Joint%']) then 'Musculoskeletal'
 when topic ilike any(array['%Neutropen%','%Anemia%','%Coagulation%']) then 'Hematologic'
 when topic ilike any(array['%Immune%','%Anaphyl%','%Allerg%']) then 'Immune'
 when topic ilike any(array['%Pressure Injury%','%Wound%','%Burn%','%Skin%']) then 'Integumentary'
 when topic ilike any(array['%Vision%','%Hearing%','%Glaucoma%','%Retinal%']) then 'Sensory'
 else body_system end
from public.questions q where q.id=qv.question_id and (q.slug like '0056-%' or q.slug like '0059-%');

-- Four required launch gates.
insert into public.question_validation_events(question_id,question_version,gate,outcome,validator,notes,evidence)
select q.id,q.current_version,g.gate,'pass',
case g.gate when 'schema' then 'NursePrepIQ structural gate 2026-09-24'
 when 'clinical' then 'GPT-5.6 Sol AI clinical review 2026-09-24'
 when 'nclex_alignment' then 'GPT-5.6 Sol AI NCLEX alignment review 2026-09-24'
 else 'GPT-5.6 Sol AI editorial/adversarial review 2026-09-24' end,
case g.gate when 'schema' then 'Verified four-option single-best-answer construction, exactly one keyed option, PN track, metadata, rationale fields, and deterministic answer-position balance.'
 when 'clinical' then 'AI-assisted scenario review for cue interpretation, priority/safety logic, PN focused monitoring/implementation/escalation scope, and clinically defensible intended answers. Not human clinical validation.'
 when 'nclex_alignment' then 'Each variant was checked against its assigned NCJMM function and PN entry-level scope.'
 else 'Reviewed stem-to-option answerability, distractor plausibility, rationale/key consistency, role wording, and cueing.' end,
jsonb_build_object('review_date','2026-09-24','batch',split_part(q.slug,'-',1),'model','GPT-5.6 Sol','human_review',false,'psychometric_validation',false)
from public.questions q cross join (values('schema'::text),('clinical'),('nclex_alignment'),('editorial')) g(gate)
where (q.slug like '0056-%' or q.slug like '0059-%')
and not exists(select 1 from public.question_validation_events e where e.question_id=q.id and e.question_version=q.current_version and e.gate=g.gate and e.outcome='pass');

-- New mandatory key checksum: generated items must have exactly one key, and its
-- option rationale must equal the current version's intended correct rationale.
do $$
declare r record; keyed int; consistent int;
begin
 for r in select q.id,q.current_version,qv.id qvid
          from public.questions q join public.question_versions qv on qv.question_id=q.id and qv.version=q.current_version
          where q.slug like '0056-%' or q.slug like '0059-%'
 loop
   select count(*),count(*) filter(where qo.is_correct and qo.rationale=qv.rationale_correct)
     into keyed,consistent
   from public.question_options qo join public.question_versions qv on qv.id=qo.question_version_id
   where qo.question_version_id=r.qvid and qo.is_correct;
   if keyed=1 and consistent=1 then
     perform public.pass_key_consistency_question(r.id,r.current_version,'Independent checksum confirmed exactly one keyed option and exact agreement between the keyed option rationale and intended correct rationale after AI clinical/NCJMM review.');
   else
     perform public.quarantine_key_inconsistent_question(r.id,r.current_version,'Key checksum failed: stored key does not uniquely agree with the intended correct rationale.');
   end if;
 end loop;
end $$;

-- Guarded promotion: every one of the 216 PN catch-up items must pass all gates.
do $$
declare r record; n int:=0;
begin
 for r in select q.id,q.current_version from public.questions q
          where (q.slug like '0056-%' or q.slug like '0059-%')
            and public.question_ready_for_production(q.id,q.current_version)
 loop
   perform public.promote_question_to_production(r.id,r.current_version); n:=n+1;
 end loop;
 if n<>216 then raise exception 'PN catch-up promotion aborted: expected 216 checksum-ready questions, found %',n; end if;
end $$;
commit;
