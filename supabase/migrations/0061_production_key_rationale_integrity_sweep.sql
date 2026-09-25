-- NursePrepIQ 0061: production answer-key/rationale integrity sweep.
-- Mechanical/internal consistency audit only; no human/psychometric validation claim.
begin;

create table if not exists public.question_integrity_audit (
 id bigserial primary key, question_id uuid not null, question_version integer not null,
 audited_at timestamptz not null default now(), outcome text not null,
 reason text, keyed_option text, keyed_rationale text, version_rationale_correct text
);

-- Audit every current production item. Quarantine any item whose single keyed
-- option does not carry the exact rationale_correct associated with that version.
insert into public.question_integrity_audit(question_id,question_version,outcome,reason,keyed_option,keyed_rationale,version_rationale_correct)
select q.id,q.current_version,
 case when x.key_count=1 and coalesce(trim(x.keyed_rationale),'')=coalesce(trim(qv.rationale_correct),'') then 'pass' else 'quarantine' end,
 case when x.key_count<>1 then 'Expected exactly one keyed option; found '||x.key_count
      when coalesce(trim(x.keyed_rationale),'')<>coalesce(trim(qv.rationale_correct),'') then 'Stored key rationale disagrees with rationale_correct; possible answer-position/scramble defect.'
      else 'Key and rationale_correct agree.' end,
 x.keyed_text,x.keyed_rationale,qv.rationale_correct
from public.questions q join public.question_versions qv on qv.question_id=q.id and qv.version=q.current_version
cross join lateral (
 select count(*) filter(where o.is_correct) key_count,
        max(o.option_text) filter(where o.is_correct) keyed_text,
        max(o.rationale) filter(where o.is_correct) keyed_rationale
 from public.question_options o where o.question_version_id=qv.id
) x
where q.lifecycle_status='active' and qv.validation_status='production_validated';

-- Mark passing items with the mechanical consistency result, without claiming
-- independent clinical adjudication.
update public.question_versions qv set
 key_consistency_status='pass',key_consistency_checked_at=now(),
 key_consistency_notes='0061 production integrity sweep: exactly one key and keyed option rationale exactly agrees with rationale_correct.'
from public.questions q
where q.id=qv.question_id and q.current_version=qv.version and q.lifecycle_status='active'
and qv.validation_status='production_validated'
and exists(select 1 from public.question_integrity_audit a where a.question_id=q.id and a.question_version=q.current_version and a.outcome='pass' and a.audited_at=(select max(a2.audited_at) from public.question_integrity_audit a2 where a2.question_id=a.question_id and a2.question_version=a.question_version));

-- Immediately remove mechanical failures from student-facing production.
-- Publication guard requires lifecycle demotion before validation downgrade.
update public.questions q set lifecycle_status='review',updated_at=now()
where exists(select 1 from public.question_integrity_audit a where a.question_id=q.id and a.question_version=q.current_version and a.outcome='quarantine'
 and a.audited_at=(select max(a2.audited_at) from public.question_integrity_audit a2 where a2.question_id=a.question_id and a2.question_version=a.question_version));

update public.question_versions qv set
 key_consistency_status='fail',key_consistency_checked_at=now(),
 key_consistency_notes=a.reason,quarantine_reason='KEY_RATIONALE_MISMATCH',
 quarantined_at=now(),validation_status='needs_review'
from public.questions q, public.question_integrity_audit a
where q.id=qv.question_id and q.current_version=qv.version
and a.question_id=q.id and a.question_version=q.current_version and a.outcome='quarantine'
and a.audited_at=(select max(a2.audited_at) from public.question_integrity_audit a2 where a2.question_id=a.question_id and a2.question_version=a.question_version);

commit;
