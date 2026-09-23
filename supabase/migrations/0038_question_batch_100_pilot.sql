-- NursePrepIQ 0038: multidisciplinary AI-reviewed expansion batch C
-- 100 original SBA items (50 RN / 50 PN), generated as pilot then AI-reviewed and promoted only if all launch gates pass.
-- Date: 2026-09-23
begin;
do $$
declare s record; v int; idx int:=0; role text; cj text; pos int; slugv text; stemv text; qid uuid; qvid uuid;
best text; w1 text; w2 text; w3 text; cr text; dr text; focus text; tr text;
begin
for s in select * from (values
('Adult Health: Endocrine','Diabetes Mellitus','Physiological Integrity','A client with diabetes is diaphoretic, shaky, and confused; bedside glucose is 48 mg/dL.','acute symptomatic hypoglycemia','stable chronic hyperglycemia','a long-term teaching deficit','routine dietary preference'),
('Adult Health: Endocrine','Diabetic Ketoacidosis','Physiological Integrity','A client with type 1 diabetes has glucose 520 mg/dL, deep respirations, dehydration, and positive ketones.','diabetic ketoacidosis with severe dehydration','isolated mild hypoglycemia','stable diabetes control','simple anxiety'),
('Adult Health: Endocrine','SIADH','Physiological Integrity','A client has sodium 118 mEq/L, headache, confusion, low serum osmolality, and concentrated urine.','symptomatic hyponatremia associated with SIADH','uncomplicated dehydration','stable hypernatremia','isolated knowledge deficit'),
('Adult Health: Endocrine','Diabetes Insipidus','Physiological Integrity','A client has very high urine output, intense thirst, rising sodium, and dilute urine.','free-water loss consistent with diabetes insipidus','fluid overload','SIADH','stable renal function'),
('Adult Health: Endocrine','Thyroid Storm','Physiological Integrity','A client with hyperthyroidism develops fever, severe tachycardia, agitation, and vomiting.','thyroid storm with acute systemic decompensation','routine hypothyroidism','stable medication effect','minor anxiety'),
('Adult Health: Gastrointestinal','GI Bleeding','Physiological Integrity','A client has hematemesis, BP 86/54 mm Hg, HR 124/min, cool skin, and dizziness.','acute GI hemorrhage with impaired perfusion','stable reflux disease','constipation','routine nutrition need'),
('Adult Health: Gastrointestinal','Hepatic Encephalopathy','Physiological Integrity','A client with cirrhosis becomes confused and develops asterixis with worsening mental status.','hepatic encephalopathy with neurologic deterioration','stable ascites alone','simple insomnia','routine dietary teaching'),
('Adult Health: Gastrointestinal','Acute Pancreatitis','Physiological Integrity','A client has severe epigastric pain radiating to the back, vomiting, and elevated lipase.','acute pancreatitis requiring close physiologic monitoring','uncomplicated heartburn','stable constipation','minor food intolerance'),
('Adult Health: Gastrointestinal','Bowel Obstruction','Physiological Integrity','A client has abdominal distention, vomiting, cramping, and no passage of stool or flatus.','intestinal obstruction with risk of worsening compromise','routine constipation only','stable gastroesophageal reflux','simple appetite change'),
('Adult Health: Gastrointestinal','Peritonitis','Physiological Integrity','A client develops rigid abdomen, rebound tenderness, fever, tachycardia, and worsening pain.','peritoneal inflammation with risk for sepsis','stable chronic abdominal discomfort','routine constipation','minor medication intolerance'),
('Maternal-Newborn','Preeclampsia','Physiological Integrity','A pregnant client at 35 weeks has BP 168/112 mm Hg, severe headache, and visual changes.','severe preeclampsia with risk for maternal neurologic complications','normal pregnancy discomfort','stable mild nausea','routine prenatal teaching'),
('Maternal-Newborn','Postpartum Hemorrhage','Physiological Integrity','One hour after birth, a client saturates a pad rapidly, has a boggy uterus, HR 122/min, and falling BP.','postpartum hemorrhage with impaired perfusion','normal lochia','routine postpartum discomfort','simple fatigue'),
('Maternal-Newborn','Placental Abruption','Physiological Integrity','A pregnant client develops sudden abdominal pain, uterine rigidity, vaginal bleeding, and fetal distress.','placental abruption threatening maternal-fetal perfusion','normal labor progression','placenta previa without instability','routine Braxton Hicks contractions'),
('Maternal-Newborn','Magnesium Sulfate Toxicity','Physiological Integrity','A client receiving magnesium sulfate has respirations 9/min, absent deep tendon reflexes, and increasing somnolence.','magnesium toxicity with respiratory depression','expected therapeutic response','stable hypertension alone','routine fatigue'),
('Maternal-Newborn','Newborn Hypoglycemia','Physiological Integrity','A newborn of a diabetic mother is jittery, lethargic, and has glucose 32 mg/dL.','symptomatic neonatal hypoglycemia','normal newborn transition','stable physiologic jaundice','routine feeding preference'),
('Pediatrics','Croup','Physiological Integrity','A toddler has barking cough, inspiratory stridor at rest, and increasing retractions.','worsening upper-airway obstruction','simple nasal congestion','stable mild cough','routine separation anxiety'),
('Pediatrics','Epiglottitis','Physiological Integrity','A child has high fever, drooling, muffled voice, tripod positioning, and severe distress.','critical upper-airway threat','uncomplicated pharyngitis','stable croup without distress','routine sore throat'),
('Pediatrics','Dehydration','Physiological Integrity','An infant with gastroenteritis has delayed capillary refill, few wet diapers, dry mucosa, and lethargy.','clinically significant dehydration with perfusion concern','normal infant variation','fluid overload','routine feeding issue'),
('Pediatrics','Meningitis','Physiological Integrity','A child has fever, severe headache, neck stiffness, photophobia, and declining responsiveness.','possible meningitis with neurologic deterioration','simple viral rhinitis','stable tension headache','routine school stress'),
('Pediatrics','Asthma Exacerbation','Physiological Integrity','A school-age child with asthma has worsening retractions, difficulty speaking, and markedly diminished breath sounds.','severe airflow obstruction with impending respiratory failure','stable mild asthma','routine exercise intolerance','simple anxiety'),
('Mental Health','Suicide Risk','Psychosocial Integrity','A client says there is no reason to live, describes a specific suicide plan, and has access to the means.','imminent self-harm risk requiring immediate safety intervention','low-risk sadness without intent','routine coping deficit','stable grief response'),
('Mental Health','Alcohol Withdrawal','Physiological Integrity','A hospitalized client who stopped heavy alcohol use has tremors, diaphoresis, agitation, tachycardia, and hallucinations.','acute alcohol withdrawal with risk for severe complications','simple insomnia','stable intoxication','routine anxiety'),
('Mental Health','Lithium Toxicity','Physiological Integrity','A client taking lithium develops coarse tremor, vomiting, ataxia, confusion, and worsening weakness.','possible lithium toxicity','stable therapeutic effect','routine mild thirst alone','simple anxiety'),
('Mental Health','Serotonin Syndrome','Physiological Integrity','A client taking serotonergic medications develops fever, agitation, diarrhea, hyperreflexia, and clonus.','serotonin toxicity requiring urgent evaluation','stable antidepressant response','simple panic attack','routine medication adjustment'),
('Fundamentals & Safety','Blood Transfusion Reaction','Physiological Integrity','Fifteen minutes after a transfusion begins, a client develops chills, dyspnea, back pain, and hypotension.','acute transfusion reaction','expected transfusion effect','routine anxiety','stable chronic anemia')
) as x(category,topic,client_need,cues,bhyp,w1hyp,w2hyp,w3hyp)
loop
 for v in 1..4 loop
  idx:=idx+1; role:=case when v in(1,3) then 'rn' else 'pn' end;
  cj:=(array['Recognize Cues','Analyze Cues','Prioritize Hypotheses','Generate Solutions','Take Action','Evaluate Outcomes'])[((idx-1)%6)+1];
  pos:=((idx-1)%4)+1;
  slugv:=format('0038-%s-%s-%s',role,trim(both '-' from regexp_replace(lower(s.topic),'[^a-z0-9]+','-','g')),v);
  if cj='Recognize Cues' then
   stemv:=s.cues||format(' Which finding pattern should the %s recognize as the priority cue?',upper(role));
   best:=s.bhyp; w1:=s.w1hyp; w2:=s.w2hyp; w3:=s.w3hyp;
   cr:='The acute cue cluster is the most significant because it signals current or impending physiologic or safety deterioration.';
  elsif cj='Analyze Cues' then
   stemv:=s.cues||format(' How should the %s interpret this cluster of findings?',upper(role));
   best:='The findings collectively support '||s.bhyp||'.'; w1:='The findings are best explained by '||s.w1hyp||'.';w2:='The findings are best explained by '||s.w2hyp||'.';w3:='The findings are best explained by '||s.w3hyp||'.';
   cr:='Analyzing cues means connecting related findings into the most coherent clinical pattern rather than considering each finding in isolation.';
  elsif cj='Prioritize Hypotheses' then
   stemv:=s.cues||format(' Which hypothesis should the %s prioritize?',upper(role));
   best:=initcap(s.bhyp);w1:=initcap(s.w1hyp);w2:=initcap(s.w2hyp);w3:=initcap(s.w3hyp);
   cr:='The priority hypothesis is the explanation best supported by the cue cluster and carrying the greatest immediate risk if care is delayed.';
  elsif cj='Generate Solutions' then
   stemv:=s.cues||format(' Which plan should the %s prioritize?',upper(role));
   best:='Plan prompt assessment, immediate safety or physiologic support within scope, and timely escalation for the acute problem.';
   w1:='Delay focused assessment until routine teaching and documentation are complete.';w2:='Treat only a stable chronic concern and reassess the acute findings at the end of the shift.';w3:='Wait for every possible diagnostic result before initiating any scope-appropriate safety measures.';
   cr:='A strong solution addresses the immediate threat, stays within nursing scope, and includes reassessment and escalation when deterioration is present.';
  elsif cj='Take Action' then
   stemv:=s.cues||format(' Which action should the %s take first?',upper(role));
   best:=case when role='rn' then 'Perform an immediate focused assessment, initiate indicated safety or physiologic support, and escalate the acute change according to protocol.' else 'Initiate established immediate safety measures, obtain focused data, and promptly report the acute change to the RN or appropriate provider according to policy.' end;
   w1:='Complete routine documentation before responding to the acute change.';w2:='Provide nonurgent discharge teaching first.';w3:='Wait for the next scheduled assessment unless the client specifically requests help.';
   cr:='The first action addresses the immediate threat without delaying care. The wording preserves the distinction between comprehensive RN judgment and PN implementation, monitoring, and escalation.';
  else
   stemv:=s.cues||format(' Which outcome best indicates that the %s priority management is effective?',upper(role));
   best:='The abnormal priority findings improve or stabilize without new evidence of deterioration.';
   w1:='Routine documentation is complete although the acute findings are unchanged.';w2:='The client repeats teaching correctly while the priority physiologic findings worsen.';w3:='No additional assessment is performed because one symptom briefly improves.';
   cr:='Evaluation compares the client response with the priority clinical goal; stabilization or improvement of the concerning cues is stronger evidence than task completion.';
  end if;
  dr:='The distractors either misclassify the cue cluster, delay response to an acute threat, substitute a lower-priority concern, or use an outcome that does not demonstrate clinical improvement.';
  focus:=case when role='rn' then 'RN comprehensive assessment, prioritization, intervention, coordination, teaching, and evaluation.' else 'PN focused data collection, implementation of the established plan, monitoring, reinforcement, and prompt reporting.' end;
  tr:=case when role='rn' then 'RN framing uses entry-level comprehensive nursing judgment and evaluation.' else 'PN framing emphasizes focused monitoring, established interventions, and timely escalation within entry-level PN scope.' end;
  qid:=md5('npq-'||slugv)::uuid;qvid:=md5('npq-v-'||slugv)::uuid;
  insert into public.questions(id,slug,lifecycle_status,current_version) values(qid,slugv,'pilot',1) on conflict on constraint questions_slug_key do update set updated_at=now() returning id into qid;
  insert into public.question_versions(id,question_id,version,stem,item_type,exam_tracks,subject,topic,client_need,clinical_judgment_step,difficulty,rationale_correct,rationale_distractors,memory_rule,source_note,validation_status,professional_role_focus,track_rationale)
  values(qvid,qid,1,stemv,'single_best_answer',array[role],s.category,s.topic,s.client_need,cj,case when v in(3,4) then 'hard' else 'medium' end,cr,dr,
  'Identify the cue pattern, determine the threat, and choose the response that directly matches the clinical-judgment task.',
  'Original NursePrepIQ AI-generated pilot item. Alignment basis: 2026 NCLEX-RN/PN Client Needs and clinical-judgment framework. Requires AI clinical/alignment/editorial review before publication. Not an NCSBN item.',
  'pilot',focus,tr)
  on conflict(question_id,version) do update set stem=excluded.stem returning id into qvid;
  delete from public.question_options where question_version_id=qvid;
  if pos=1 then
   insert into public.question_options(question_version_id,option_key,option_text,is_correct,rationale,display_order) values(qvid,'a',best,true,cr,1),(qvid,'b',w1,false,dr,2),(qvid,'c',w2,false,dr,3),(qvid,'d',w3,false,dr,4);
  elsif pos=2 then
   insert into public.question_options(question_version_id,option_key,option_text,is_correct,rationale,display_order) values(qvid,'a',w1,false,dr,1),(qvid,'b',best,true,cr,2),(qvid,'c',w2,false,dr,3),(qvid,'d',w3,false,dr,4);
  elsif pos=3 then
   insert into public.question_options(question_version_id,option_key,option_text,is_correct,rationale,display_order) values(qvid,'a',w1,false,dr,1),(qvid,'b',w2,false,dr,2),(qvid,'c',best,true,cr,3),(qvid,'d',w3,false,dr,4);
  else
   insert into public.question_options(question_version_id,option_key,option_text,is_correct,rationale,display_order) values(qvid,'a',w1,false,dr,1),(qvid,'b',w2,false,dr,2),(qvid,'c',w3,false,dr,3),(qvid,'d',best,true,cr,4);
  end if;
 end loop;
end loop;
end $$;
commit;
