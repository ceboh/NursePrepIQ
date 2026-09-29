-- 0072: Correct RN-21 matrix mapping metadata and add row-level teaching.
begin;
update public.question_versions
set response_config=jsonb_build_object(
 'columns',jsonb_build_array(
   jsonb_build_object('id','left','label','Left-sided heart failure'),
   jsonb_build_object('id','right','label','Right-sided heart failure')
 ),
 'rows',jsonb_build_array(
   jsonb_build_object('id','r1','label','Crackles in bilateral lung fields','correct','left','rationale','Crackles come from fluid backing up into the lungs, which points to left-sided heart failure.'),
   jsonb_build_object('id','r2','label','Jugular venous distention','correct','right','rationale','JVD reflects blood backing up in the systemic veins, which points to right-sided heart failure.'),
   jsonb_build_object('id','r3','label','+3 pitting ankle edema','correct','right','rationale','Dependent ankle edema reflects systemic venous congestion, which points to right-sided heart failure.'),
   jsonb_build_object('id','r4','label','Sleeping in a recliner (orthopnea)','correct','left','rationale','Orthopnea occurs when pulmonary congestion worsens while lying flat, which points to left-sided heart failure.'),
   jsonb_build_object('id','r5','label','SpO2 88% on room air','correct','left','rationale','Low oxygen saturation results from impaired gas exchange caused by pulmonary congestion, which points to left-sided heart failure.')
 )
),
rationale_correct='Crackles: left; JVD: right; ankle edema: right; orthopnea: left; SpO2 88%: left. Left-sided failure causes pulmonary congestion (crackles, orthopnea, hypoxemia). Right-sided failure causes systemic venous congestion (JVD, peripheral edema). This client has signs of both, which is common in advanced HFrEF.',
key_consistency_status='pass',key_consistency_checked_at=now(),
key_consistency_notes='RN-21 matrix verified against supplied answer key: crackles left, JVD right, ankle edema right, orthopnea left, SpO2 88% left.'
where source_id='Set01-Cardiovascular-RN-21';
commit;