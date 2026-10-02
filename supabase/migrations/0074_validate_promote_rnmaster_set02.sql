-- 0074: Validate and promote RN Master Set 2 pilot items that pass deterministic integrity checks.
-- RN-7 is intentionally held in pilot for current-guideline clinical review.
begin;

update public.question_versions qv
set
  validation_status = 'production_validated',
  lifecycle_status = 'production',
  key_consistency_status = 'pass',
  key_consistency_checked_at = now(),
  key_consistency_notes = 'Deterministic option/key/rationale integrity passed; promoted after pilot import.'
where qv.source_id like 'RNMaster-Set02-RN-%'
  and qv.source_id <> 'RNMaster-Set02-RN-7'
  and qv.validation_status = 'pilot'
  and exists (
    select 1
    from public.question_options qo
    where qo.question_version_id = qv.id
      and qo.is_correct
  )
  and not exists (
    select 1
    from public.question_options qo
    where qo.question_version_id = qv.id
      and (qo.option_text is null or btrim(qo.option_text) = '')
  )
  and (
    (qv.item_type = 'single_best_answer' and
      (select count(*) from public.question_options qo where qo.question_version_id=qv.id and qo.is_correct)=1)
    or
    (qv.item_type = 'multiple_response' and
      (select count(*) from public.question_options qo where qo.question_version_id=qv.id and qo.is_correct)>=1)
  );

update public.question_versions
set
  key_consistency_status='needs_review',
  key_consistency_checked_at=now(),
  key_consistency_notes='Held for current-guideline review of occupational TB screening/TST interpretation before production promotion.'
where source_id='RNMaster-Set02-RN-7'
  and validation_status='pilot';

commit;
