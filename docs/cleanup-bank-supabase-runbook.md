# Existing-bank cleanup: Supabase application runbook

This runbook is for the legacy/pilot-bank cleanup only. It does **not** authorize clinical validation or production publication.

## Important: do not use automatic filename ordering for the cleanup set

The repository currently contains duplicate numeric migration prefixes (`0020` and `0021`). Until those historical filenames are normalized, apply the cleanup SQL manually in the Supabase SQL Editor in the exact order below. Do not use a migration runner that assumes the numeric prefix is unique.

## Exact cleanup order

1. `0020_cleanup_0019_answer_balance.sql`
2. `0020_cleanup_publish_foundation.sql`
3. `0020_cleanup_respiratory_foundation.sql`
4. `0021_cleanup_cardiovascular_foundation.sql`
5. `0021_cleanup_high_acuity_batch_a.sql`
6. `0022_cleanup_neurologic_foundation.sql`
7. `0023_cleanup_renal_foundation.sql`
8. `0024_cleanup_respiratory_expansion.sql`
9. `0025_cleanup_cardiovascular_depth.sql`
10. `0026_cleanup_heart_failure_legacy.sql`
11. `0027_stage_cleaned_bank_for_validation.sql`
12. `0028_validation_readiness_report.sql`

Run each file separately and stop if Supabase reports an error. Do not skip forward after an error.

## What this sequence is allowed to do

- revise existing questions and distractor rationales;
- rebalance answer positions;
- keep cleaned, non-retired questions in `pilot` when genuine production validation is incomplete;
- record a schema pass only when the database can prove the structural conditions in `0027`;
- expose readiness/count reporting in `0028`.

It must **not** manufacture clinical, NCLEX-alignment, editorial, or pilot/human validation events. A question must not become production-active unless all required gates have genuine pass evidence and the guarded promotion function accepts it.

## Verification after the sequence

Run:

```sql
select * from public.question_pipeline_counts;
select * from public.question_validation_readiness_counts;
```

Keep these meanings distinct:

- **generated**: draft/validating current versions;
- **pilot**: cleaned/testing content not yet fully production validated;
- **validated**: current versions marked `production_validated` only after all required gates;
- **production_active**: validated current versions whose question lifecycle is `active`.

If `production_active` remains zero after cleanup, that is expected when genuine clinical/human validation has not yet occurred. Do not bypass the validation gates merely to populate the website.
