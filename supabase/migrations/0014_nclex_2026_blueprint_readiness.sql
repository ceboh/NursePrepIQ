-- NursePrepIQ 0014: 2026 NCLEX blueprint metadata + safe simulator balancing
-- Sources used for the configured ranges: 2026 NCSBN RN/PN Test Plans and 2026 Candidate Bulletin.
-- This migration does not activate simulated exams and does not publish clinical questions.

alter table public.exam_blueprints
  add column if not exists client_need_targets jsonb not null default '{}'::jsonb,
  add column if not exists clinical_judgment_config jsonb not null default '{}'::jsonb;

update public.exam_blueprints set
 client_need_targets='{
   "Management of Care":{"min":0.15,"max":0.21},
   "Safety and Infection Prevention and Control":{"min":0.10,"max":0.16},
   "Health Promotion and Maintenance":{"min":0.06,"max":0.12},
   "Psychosocial Integrity":{"min":0.06,"max":0.12},
   "Basic Care and Comfort":{"min":0.06,"max":0.12},
   "Pharmacological and Parenteral Therapies":{"min":0.13,"max":0.19},
   "Reduction of Risk Potential":{"min":0.09,"max":0.15},
   "Physiological Adaptation":{"min":0.11,"max":0.17}
 }'::jsonb,
 clinical_judgment_config='{"case_study_items":18,"standalone_share_approx":0.10,"case_study_sets":3,"items_per_case_study":6}'::jsonb
where slug='rn-simulated-v1';

update public.exam_blueprints set
 client_need_targets='{
   "Coordinated Care":{"min":0.18,"max":0.24},
   "Safety and Infection Prevention and Control":{"min":0.10,"max":0.16},
   "Health Promotion and Maintenance":{"min":0.06,"max":0.12},
   "Psychosocial Integrity":{"min":0.09,"max":0.15},
   "Basic Care and Comfort":{"min":0.07,"max":0.13},
   "Pharmacological Therapies":{"min":0.10,"max":0.16},
   "Reduction of Risk Potential":{"min":0.09,"max":0.15},
   "Physiological Adaptation":{"min":0.07,"max":0.13}
 }'::jsonb,
 clinical_judgment_config='{"case_study_items":18,"standalone_share_approx":0.10,"case_study_sets":3,"items_per_case_study":6}'::jsonb
where slug='pn-simulated-v1';

create or replace view public.simulator_blueprint_readiness as
with eligible as (
 select b.id blueprint_id,b.slug,b.exam_track,b.question_count,b.client_need_targets,
        qv.client_need,count(*) eligible_count
 from public.exam_blueprints b
 cross join lateral jsonb_object_keys(b.client_need_targets) k(client_need)
 left join public.questions q on q.lifecycle_status='active'
 left join public.question_versions qv
   on qv.question_id=q.id and qv.version=q.current_version
  and qv.validation_status='production_validated'
  and b.exam_track=any(qv.exam_tracks)
  and qv.client_need=k.client_need
 group by b.id,b.slug,b.exam_track,b.question_count,b.client_need_targets,qv.client_need,k.client_need
)
select b.slug,b.exam_track,b.question_count,k.client_need,
       (k.bounds->>'min')::numeric min_share,(k.bounds->>'max')::numeric max_share,
       ceil(b.question_count*((k.bounds->>'min')::numeric))::int minimum_items,
       count(q.id) filter(where q.lifecycle_status='active' and qv.validation_status='production_validated') eligible_items,
       count(q.id) filter(where q.lifecycle_status='active' and qv.validation_status='production_validated')
         >= ceil(b.question_count*((k.bounds->>'min')::numeric)) as minimum_inventory_ready
from public.exam_blueprints b
cross join lateral jsonb_each(b.client_need_targets) k(client_need,bounds)
left join public.questions q on q.lifecycle_status='active'
left join public.question_versions qv
 on qv.question_id=q.id and qv.version=q.current_version
 and qv.validation_status='production_validated'
 and b.exam_track=any(qv.exam_tracks)
 and qv.client_need=k.client_need
group by b.slug,b.exam_track,b.question_count,k.client_need,k.bounds;

comment on view public.simulator_blueprint_readiness is
'Per-client-need inventory readiness for active production-validated questions. It does not claim CAT equivalence or predict NCLEX outcomes.';
