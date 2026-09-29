# Question Admission & Duplicate Safety Policy

This policy applies to all new NursePrepIQ question-bank imports, including the planned RN/PN master bank.

## Non-destructive admission rule

Duplicate detection is an admission/review gate. It is not a deletion engine.

1. **Exact normalized duplicate:** block/skip the incoming copy. Keep the already-admitted item.
2. **Very high or high textual similarity:** flag for review. Do not delete either item automatically.
3. **Concept similarity:** flag for review. Keep both when they test materially different nursing decisions, competencies, scopes, or contexts.
4. **Intentional unfolding NGN case:** preserve linked items that share a `case_set_id`. Reuse of the patient scenario/cues is expected. Each item must still ask a distinct clinical-judgment task.
5. **Same disease/topic is not a duplicate by itself.** Topic overlap is expected in a comprehensive NCLEX bank.

## Legacy cleanup migrations

Migrations `0066_production_duplicate_hard_purge.sql` and `0067_production_semantic_concept_duplicate_purge.sql` were one-time legacy-bank cleanup migrations. They must not be copied, scheduled, invoked by an importer, or reused as recurring maintenance for newly admitted content.

Do not create new migrations that automatically hard-delete questions based on semantic/text similarity. Any future destructive cleanup requires an explicit reviewed list of question IDs.

## Source identity

Incoming questions should retain a stable `source_id` (for example `Set01-Cardiovascular-RN-1`) and intentional case members should share a stable `case_set_id`. A later master-file import can therefore skip already-ingested source items without relying only on fuzzy similarity.

## Promotion

Similarity review is separate from clinical/key validation. A question may be unique but clinically wrong; it may also resemble another item while validly testing a different competency. Production promotion therefore requires the existing clinical/key/rationale gates in addition to this admission policy.
