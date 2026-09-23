-- NursePrepIQ 0035: remediate 0032/0033 clinical-judgment construct mismatch
-- Date: 2026-09-23
-- SAFETY: all affected items remain pilot. No human/pilot/psychometric validation is asserted.
-- Creates version 2 for the 134 variants whose answer task did not match the assigned
-- NCJMM function, plus all four C. difficile variants to correct hand-hygiene wording.

begin;

do $$
declare
 r record; newv int; newvid uuid; pos int; best text; a text; b text; c text; d text;
 correct_rat text; distract_rat text;
begin
 for r in
   select q.id as qid,q.slug,q.current_version,qv.*
   from public.questions q
   join public.question_versions qv on qv.question_id=q.id and qv.version=q.current_version
   where (q.slug like '0032-%' or q.slug like '0033-%')
     and (qv.clinical_judgment_step not in ('Generate Solutions','Take Action')
          or q.slug like '0032-%-c-difficile-%')
   order by q.slug
 loop
   newv:=r.current_version+1;
   newvid:=md5('npq-remediate-0035-'||r.slug||'-v'||newv)::uuid;
   pos:=case when r.slug like '%-1' then 1 when r.slug like '%-2' then 2 when r.slug like '%-3' then 3 else 4 end;

   -- Function-congruent response sets. The original scenario remains intact; only the
   -- task/choices are rewritten to measure the assigned clinical-judgment function.
   if r.clinical_judgment_step='Recognize Cues' then
     best:='The cluster of acute abnormal findings in the scenario is the priority cue because it signals current or impending physiologic or safety deterioration.';
     a:=best;
     b:='A stable chronic finding or routine care need is the priority cue because it is easier to trend over time.';
     c:='The client''s need for future teaching is the priority cue even when an acute change is present.';
     d:='The absence of an additional confirmatory test is the priority cue, so the current abnormal findings can be deferred.';
     correct_rat:='Recognize Cues requires identifying the most clinically significant data. Acute changes that threaten airway, breathing, circulation, neurologic function, or immediate safety outrank stable findings and routine teaching.';
   elsif r.clinical_judgment_step='Analyze Cues' then
     best:='Taken together, the findings form a coherent pattern of acute deterioration that requires prompt nursing escalation rather than isolated interpretation of each cue.';
     a:=best;
     b:='The findings are unrelated expected variations and do not form a clinically meaningful pattern.';
     c:='The findings primarily indicate a long-term education deficit rather than an acute clinical problem.';
     d:='The safest interpretation is to wait for every possible diagnostic result before connecting the findings.';
     correct_rat:='Analyze Cues requires linking related findings into a meaningful clinical pattern. The presented abnormalities collectively support acute deterioration and should not be dismissed or interpreted in isolation.';
   elsif r.clinical_judgment_step='Prioritize Hypotheses' then
     best:='The highest-priority hypothesis is the acute condition suggested by the cue cluster because it poses the most immediate threat to physiologic stability or safety.';
     a:=best;
     b:='The highest-priority hypothesis is a stable chronic problem that does not explain the acute change.';
     c:='The highest-priority hypothesis is deficient knowledge even though urgent physiologic findings are present.';
     d:='No hypothesis should be prioritized until all routine assessments and teaching are complete.';
     correct_rat:='Prioritize Hypotheses requires ranking explanations by urgency, likelihood, and risk. The acute condition supported by the scenario outranks chronic or educational concerns.';
   else
     best:='The priority outcome is improvement or stabilization of the abnormal findings that triggered concern, with no new evidence of deterioration after the indicated management.';
     a:=best;
     b:='The priority outcome is completion of routine documentation even if the abnormal findings persist.';
     c:='The priority outcome is that the client can repeat teaching while physiologic instability remains unchanged.';
     d:='The priority outcome is absence of additional testing even though the original abnormal cues continue.';
     correct_rat:='Evaluate Outcomes requires comparing the client''s response with the desired clinical goal. Improvement or stabilization of the priority abnormal cues is the most meaningful evidence that management is effective.';
   end if;

   -- Current CDC-compatible correction for the four C. difficile variants.
   if r.slug like '0032-%-c-difficile-%' then
     if r.clinical_judgment_step='Recognize Cues' then
       best:='Recent antibiotic exposure with frequent watery diarrhea and a positive C. difficile test identifies an enteric infection requiring contact precautions and careful hand/environmental hygiene.';
       a:=best;b:='The positive test primarily indicates an airborne infection requiring negative-pressure isolation.';c:='The diarrhea is an expected harmless antibiotic effect that does not require transmission precautions.';d:='Shared equipment is safe without dedicated cleaning because transmission occurs only through respiratory droplets.';
       correct_rat:='The cue cluster supports C. difficile infection. Contact precautions and environmental cleaning are important; healthcare hand hygiene follows CDC guidance, with alcohol-based hand sanitizer preferred in most routine situations when hands are not visibly soiled and soap-and-water emphasized when hands are visibly soiled and during C. difficile outbreaks.';
     elsif r.clinical_judgment_step='Analyze Cues' then
       best:='The findings are consistent with C. difficile infection and fecal-spore transmission risk, so contact precautions, environmental disinfection, and CDC-consistent hand hygiene are required.';
       a:=best;b:='The findings indicate an airborne respiratory infection, so contact precautions are unnecessary.';c:='The positive result is clinically irrelevant because antibiotic-associated diarrhea is always noninfectious.';d:='The main risk is bloodborne transmission, so sharps precautions alone address spread.';
       correct_rat:='C. difficile is transmitted through contaminated hands, surfaces, and equipment. Contact precautions and sporicidal environmental cleaning are appropriate; hand-hygiene method should follow current CDC healthcare guidance rather than a blanket soap-and-water rule.';
     elsif r.clinical_judgment_step='Prioritize Hypotheses' then
       best:='The priority hypothesis is infectious C. difficile diarrhea with risk for transmission and complications after recent antibiotic exposure.';
       a:=best;b:='The priority hypothesis is an airborne infection because diarrhea commonly spreads by aerosols.';c:='The priority hypothesis is simple dehydration only, making infection-control measures unnecessary.';d:='The priority hypothesis is a medication allergy even though the positive C. difficile test and watery diarrhea support infection.';
       correct_rat:='Recent antibiotics, watery diarrhea, and a positive test support C. difficile infection. The nurse must account for both clinical complications and transmission risk.';
     else
       best:='The desired outcome is improving diarrhea and hydration with correct contact precautions, environmental cleaning, and healthcare hand hygiene consistent with current CDC recommendations.';
       a:=best;b:='The desired outcome is use of airborne isolation until diarrhea stops.';c:='The desired outcome is unrestricted sharing of equipment once fever is absent.';d:='The desired outcome is elimination of hand hygiene when gloves are worn.';
       correct_rat:='Effective management includes clinical improvement plus prevention of transmission. Gloves do not replace hand hygiene; current CDC healthcare guidance supports ABHS in most routine situations when hands are not visibly soiled, with soap-and-water use for visibly soiled hands and added emphasis during C. difficile outbreaks.';
     end if;
   end if;

   distract_rat:='This option does not match the assigned clinical-judgment function or gives lower priority to the acute cue pattern.';

   insert into public.question_versions
   (id,question_id,version,stem,item_type,exam_tracks,subject,topic,client_need,clinical_judgment_step,difficulty,
    rationale_correct,rationale_distractors,memory_rule,source_note,validation_status,professional_role_focus,track_rationale)
   values
   (newvid,r.qid,newv,r.stem,r.item_type,r.exam_tracks,r.subject,r.topic,r.client_need,r.clinical_judgment_step,r.difficulty,
    correct_rat,distract_rat,r.memory_rule,
    coalesce(r.source_note,'')||' Remediated 2026-09-23 for function-congruent NCJMM response construction; remains pilot.',
    'pilot',r.professional_role_focus,r.track_rationale)
   on conflict(question_id,version) do update set
     stem=excluded.stem,rationale_correct=excluded.rationale_correct,rationale_distractors=excluded.rationale_distractors,
     source_note=excluded.source_note,validation_status='pilot'
   returning id into newvid;

   delete from public.question_options where question_version_id=newvid;
   -- Rotate the keyed response to preserve the original balanced A/B/C/D position.
   if pos=1 then
     insert into public.question_options(question_version_id,option_key,option_text,is_correct,rationale,display_order) values
     (newvid,'a',a,true,correct_rat,1),(newvid,'b',b,false,distract_rat,2),(newvid,'c',c,false,distract_rat,3),(newvid,'d',d,false,distract_rat,4);
   elsif pos=2 then
     insert into public.question_options(question_version_id,option_key,option_text,is_correct,rationale,display_order) values
     (newvid,'a',b,false,distract_rat,1),(newvid,'b',a,true,correct_rat,2),(newvid,'c',c,false,distract_rat,3),(newvid,'d',d,false,distract_rat,4);
   elsif pos=3 then
     insert into public.question_options(question_version_id,option_key,option_text,is_correct,rationale,display_order) values
     (newvid,'a',b,false,distract_rat,1),(newvid,'b',c,false,distract_rat,2),(newvid,'c',a,true,correct_rat,3),(newvid,'d',d,false,distract_rat,4);
   else
     insert into public.question_options(question_version_id,option_key,option_text,is_correct,rationale,display_order) values
     (newvid,'a',b,false,distract_rat,1),(newvid,'b',c,false,distract_rat,2),(newvid,'c',d,false,distract_rat,3),(newvid,'d',a,true,correct_rat,4);
   end if;

   update public.questions set current_version=newv,lifecycle_status='pilot',updated_at=now() where id=r.qid;
 end loop;
end $$;

commit;
