-- NursePrepIQ Milestone 7: Respiratory question-bank expansion.
-- Adds 24 original pilot items: 3 additional RN + 3 additional PN items per topic.
-- Run after 0006_respiratory_foundation.sql. Clinical editorial validation required before production certification.

do $$
declare
  topics text[] := array['COPD','Pneumonia','Asthma','Pulmonary Embolism'];
  slugs text[] := array['copd','pneumonia','asthma','pulmonary-embolism'];
  t text; slug text; ti int; role text; ri int; n int;
  qid uuid; vid uuid; stem text; correct_text text; wrong1 text; wrong2 text; wrong3 text; cj text; diff text; rationale text; memory text; focus text; trationale text;
begin
 for ti in 1..4 loop
  t:=topics[ti]; slug:=slugs[ti];
  for ri in 1..2 loop
   role:=case when ri=1 then 'rn' else 'pn' end;
   for n in 1..3 loop
    qid := md5('npq-0007-'||role||'-'||slug||'-'||n)::uuid;
    vid := md5('npq-0007-version-'||role||'-'||slug||'-'||n)::uuid;
    diff:=case when n=3 then 'hard' else 'medium' end;
    if role='rn' then
      focus:='RN comprehensive assessment, synthesis, prioritization, planning, intervention, and evaluation appropriate to the clinical situation.';
      trationale:='RN-specific because the learner must integrate whole-client findings and make or evaluate the broader nursing-care decision.';
    else
      focus:='PN focused data collection, monitoring, reinforcement of established care, safety, and prompt communication of significant change.';
      trationale:='PN-specific because the learner must recognize and monitor changes, provide appropriate assigned care, and communicate significant findings within the established plan.';
    end if;

    if t='COPD' and n=1 then
      cj:='Analyze Cues'; memory:='COPD: compare with baseline; worsening ventilation often appears as increased work of breathing plus mental-status change.';
      if role='rn' then stem:='The RN reviews findings for a client with COPD. Which cluster most strongly suggests acute deterioration rather than the client''s chronic baseline?'; correct_text:='Increasing work of breathing, new confusion, and declining activity tolerance over several hours.'; else stem:='The LPN/VN compares current findings with the documented baseline for a client with COPD. Which cluster should be reported promptly?'; correct_text:='Breathing is more labored than usual and the client is newly confused.'; end if;
      wrong1:='A chronic morning cough with no change in sputum or breathing.';wrong2:='Longstanding exertional dyspnea that resolves with usual rest.';wrong3:='A request to review energy-conservation teaching.';rationale:='The correct cluster represents a new change in ventilation and neurologic status rather than stable chronic COPD findings.';
    elsif t='COPD' and n=2 then
      cj:='Generate Solutions'; memory:='COPD care: position, assess, support prescribed respiratory care, and evaluate the response.';
      if role='rn' then stem:='The RN is planning care for a client with COPD who has increased dyspnea but remains alert and hemodynamically stable. Which nursing approach best supports ventilation while further assessment and prescribed treatment continue?'; correct_text:='Position the client upright, reduce unnecessary exertion, reassess respiratory status, and implement prescribed respiratory support.'; else stem:='The LPN/VN is caring for a stable client with COPD who reports more dyspnea with activity. Which action best fits the established plan while the RN is notified of the change?'; correct_text:='Assist the client upright, limit exertion, collect focused respiratory data, and follow prescribed respiratory measures.'; end if;
      wrong1:='Place the client flat and encourage uninterrupted activity.';wrong2:='Delay respiratory reassessment until the next routine round.';wrong3:='Focus first on detailed discharge teaching.';rationale:='Upright positioning, energy conservation, focused reassessment, and prescribed support address ventilation without delaying recognition of deterioration.';
    elsif t='COPD' then
      cj:='Evaluate Outcomes'; memory:='Respiratory improvement is shown by the client: easier breathing, better mentation, and improved function.';
      if role='rn' then stem:='The RN evaluates a client with COPD after respiratory interventions. Which finding best supports that the plan is effective?'; correct_text:='Work of breathing decreases, the client is more alert, and activity tolerance improves toward baseline.'; else stem:='The LPN/VN monitors a client with COPD after prescribed respiratory care. Which finding should be documented and communicated as improvement?'; correct_text:='Breathing is less labored and alertness and activity tolerance are returning toward baseline.'; end if;
      wrong1:='The client remains increasingly drowsy despite quieter breath sounds.';wrong2:='The client avoids all activity because breathing feels worse.';wrong3:='The respiratory rate changes but the client becomes more confused.';rationale:='Clinical improvement requires improvement in ventilation-related symptoms and function, not an isolated number or quieter chest alone.';
    elsif t='Pneumonia' and n=1 then
      cj:='Analyze Cues'; memory:='Pneumonia deterioration: connect breathing, mentation, circulation, and overall trend.';
      if role='rn' then stem:='The RN assesses a client with pneumonia. Which combination of findings most strongly indicates worsening systemic illness?'; correct_text:='Increasing respiratory effort, new confusion, falling blood pressure from baseline, and cool skin.'; else stem:='The LPN/VN monitors a client with pneumonia. Which change from baseline requires the most prompt communication?'; correct_text:='New confusion with increased respiratory effort and blood pressure trending below the client''s baseline.'; end if;
      wrong1:='An unchanged productive cough and stable vital signs.';wrong2:='Fatigue after morning hygiene with recovery after rest.';wrong3:='A request for additional teaching about fluids.';rationale:='The correct answer clusters respiratory, neurologic, and circulatory deterioration and therefore carries greater urgency.';
    elsif t='Pneumonia' and n=2 then
      cj:='Generate Solutions'; memory:='Pneumonia nursing priorities: support oxygenation, mobilize secretions as appropriate, monitor, and reassess.';
      if role='rn' then stem:='The RN develops a nursing plan for a stable client with pneumonia and retained secretions. Which approach best supports respiratory recovery?'; correct_text:='Promote positioning and mobility as tolerated, pulmonary hygiene according to the plan, hydration when appropriate, and repeated respiratory assessment.'; else stem:='The LPN/VN is implementing an established care plan for a stable client with pneumonia. Which action is appropriate?'; correct_text:='Assist with positioning, mobility and prescribed pulmonary-hygiene measures, and monitor the respiratory response.'; end if;
      wrong1:='Keep the client continuously supine to reduce energy use.';wrong2:='Avoid reassessment after activity unless the client requests it.';wrong3:='Withhold all oral fluids regardless of the prescribed plan.';rationale:='Appropriate positioning, mobility, pulmonary hygiene, and reassessment help ventilation and secretion clearance while respecting the individualized plan.';
    elsif t='Pneumonia' then
      cj:='Evaluate Outcomes'; memory:='Pneumonia improvement = easier breathing, improving mentation/function, and trend toward baseline.';
      if role='rn' then stem:='Which finding should the RN use as the strongest evidence that a client with pneumonia is responding to the nursing and medical plan?'; correct_text:='Respiratory effort is decreasing, mentation is clear, and activity tolerance is improving.'; else stem:='Which finding should the LPN/VN report as evidence that a client with pneumonia is improving under the established plan?'; correct_text:='The client is more alert, breathes with less effort, and tolerates activity better than earlier.'; end if;
      wrong1:='The cough remains unchanged while confusion increases.';wrong2:='The client sleeps more and is increasingly difficult to arouse.';wrong3:='One isolated vital sign improves while breathing becomes more labored.';rationale:='Improvement is best judged from the overall clinical response rather than a single isolated measurement.';
    elsif t='Asthma' and n=1 then
      cj:='Analyze Cues'; memory:='Asthma: less wheeze can be dangerous when it reflects less airflow.';
      if role='rn' then stem:='During an asthma exacerbation, which change should the RN interpret as deterioration rather than improvement?'; correct_text:='Wheezing becomes faint while the client grows exhausted and air movement is markedly reduced.'; else stem:='The LPN/VN is monitoring a client with asthma. Which change should be reported immediately as possible deterioration?'; correct_text:='The client becomes exhausted and wheezing is less audible because air movement is markedly reduced.'; end if;
      wrong1:='The client remains alert and can speak more comfortably as air movement improves.';wrong2:='Anxiety decreases while respiratory effort improves.';wrong3:='The client asks about avoiding triggers after symptoms improve.';rationale:='A quieter chest is not reassuring if airflow is falling and the client is tiring.';
    elsif t='Asthma' and n=2 then
      cj:='Take Action'; memory:='Acute asthma: worsening airflow and exhaustion demand immediate respiratory response, not routine teaching.';
      if role='rn' then stem:='The RN notes rapidly worsening respiratory distress in a client with asthma despite initial prescribed therapy. What is the priority nursing action?'; correct_text:='Immediately reassess airway and breathing and activate the appropriate urgent response while continuing prescribed respiratory support.'; else stem:='The LPN/VN notes rapidly worsening respiratory distress in a client with asthma despite prescribed care. What is the priority response?'; correct_text:='Remain with the client, obtain focused respiratory data, maintain safety, and immediately notify or activate the appropriate response according to the setting.'; end if;
      wrong1:='Complete routine teaching before reassessing.';wrong2:='Wait until the next scheduled respiratory assessment.';wrong3:='Encourage the client to walk to determine exercise tolerance.';rationale:='Rapid deterioration requires immediate airway/breathing attention and escalation rather than routine care.';
    elsif t='Asthma' then
      cj:='Evaluate Outcomes'; memory:='Asthma response: better airflow, less work of breathing, and improved ability to speak/function.';
      if role='rn' then stem:='Which finding best indicates to the RN that treatment for an acute asthma exacerbation is effective?'; correct_text:='Air movement improves, work of breathing decreases, and the client can speak more comfortably.'; else stem:='Which finding should the LPN/VN document and communicate as improvement after prescribed treatment for asthma?'; correct_text:='Air movement is better, breathing is less labored, and the client can speak more comfortably.'; end if;
      wrong1:='The chest becomes nearly silent while fatigue increases.';wrong2:='The client becomes drowsier while respiratory effort remains high.';wrong3:='Wheezing changes but the client cannot speak because of dyspnea.';rationale:='Improved airflow and reduced respiratory effort demonstrate a meaningful response; a silent chest with fatigue may signal worsening obstruction.';
    elsif t='Pulmonary Embolism' and n=1 then
      cj:='Analyze Cues'; memory:='PE pattern: sudden cardiopulmonary change plus risk context.';
      if role='rn' then stem:='The RN evaluates a postoperative client with sudden dyspnea. Which additional findings most strengthen concern for pulmonary embolism?'; correct_text:='Pleuritic chest discomfort, tachycardia, anxiety, and recent immobility.'; else stem:='The LPN/VN observes sudden dyspnea in a postoperative client. Which additional findings should increase concern and be reported immediately?'; correct_text:='Pleuritic chest discomfort, a rapid pulse, anxiety, and recent immobility.'; end if;
      wrong1:='A chronic cough unchanged for several months.';wrong2:='Gradual fatigue after physical therapy with full recovery at rest.';wrong3:='A request for assistance with repositioning.';rationale:='Sudden dyspnea with pleuritic symptoms, tachycardia, and thromboembolic risk is a concerning PE pattern.';
    elsif t='Pulmonary Embolism' and n=2 then
      cj:='Take Action'; memory:='Suspected PE is time-sensitive: support breathing, minimize delay, and escalate.';
      if role='rn' then stem:='A client suddenly develops findings concerning for pulmonary embolism. Which RN action has the highest priority?'; correct_text:='Immediately assess airway, breathing and circulation, support oxygenation as prescribed or indicated by the emergency plan, and activate urgent evaluation.'; else stem:='A client suddenly develops findings concerning for pulmonary embolism while under LPN/VN care. Which action is the priority?'; correct_text:='Stay with the client, maintain safety, collect focused cardiopulmonary data, and immediately notify or activate the appropriate urgent response.'; end if;
      wrong1:='Delay communication until routine documentation is complete.';wrong2:='Encourage ambulation to determine whether symptoms resolve.';wrong3:='Begin nonurgent discharge teaching.';rationale:='A suspected pulmonary embolism is a time-sensitive cardiopulmonary emergency requiring immediate assessment/support and escalation.';
    else
      cj:='Evaluate Outcomes'; memory:='After an acute respiratory event, evaluate the whole client: breathing, circulation, mentation, and symptoms.';
      if role='rn' then stem:='The RN evaluates a client after urgent treatment for suspected pulmonary embolism. Which finding best supports clinical stabilization?'; correct_text:='Respiratory distress decreases, mentation remains clear, and blood pressure and pulse trend toward the client''s stable range.'; else stem:='The LPN/VN monitors a client after urgent treatment for suspected pulmonary embolism. Which finding should be communicated as improvement?'; correct_text:='Breathing is less distressed, mentation is clear, and vital signs are trending toward the client''s stable range.'; end if;
      wrong1:='Dyspnea worsens while the client becomes confused.';wrong2:='The pulse changes but blood pressure falls and skin becomes cool.';wrong3:='Chest discomfort persists with increasing respiratory effort.';rationale:='Stabilization is reflected by improving respiratory effort, perfusion, mentation, and symptom trend.';
    end if;

    insert into public.questions(id,slug,lifecycle_status,current_version) values(qid,role||'-resp-'||slug||'-bank-'||n,'active',1) on conflict(id) do update set lifecycle_status='active',current_version=1;
    insert into public.question_versions(id,question_id,version,stem,item_type,exam_tracks,subject,topic,client_need,clinical_judgment_step,difficulty,rationale_correct,rationale_distractors,memory_rule,source_note,validation_status,professional_role_focus,track_rationale)
    values(vid,qid,1,stem,'single_best_answer',array[role],'Adult Health: Respiratory',t,'Physiological Integrity',cj,diff,rationale,'The alternative choices represent stable findings, delayed responses, isolated measurements, or actions that do not address the highest-priority respiratory problem.',memory,'Original NursePrepIQ pilot item aligned to respiratory clinical judgment. Not an NCSBN item. Clinical editorial validation required.','pilot',focus,trationale)
    on conflict(question_id,version) do nothing;
    insert into public.question_options(question_version_id,option_key,option_text,is_correct,rationale,display_order) values
    (vid,'a',wrong1,false,'This does not best address or identify the priority respiratory problem.',1),(vid,'b',correct_text,true,rationale,2),(vid,'c',wrong2,false,'This is lower priority, delayed, or inconsistent with the clinical trend.',3),(vid,'d',wrong3,false,'This does not address the most important current respiratory need.',4)
    on conflict(question_version_id,option_key) do nothing;
   end loop;
  end loop;
 end loop;
end $$;
