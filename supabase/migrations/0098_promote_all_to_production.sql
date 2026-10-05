-- Promote every pilot question to production (both tracks). Status change only; no question
-- content changes. Expected rows: 2662 (RN 1223, PN 1439), checked before applying.
--
-- The bank loader never overwrites status on existing rows (scripts/bank/load.mjs), so later
-- loads keep these rows in production; questions added later still enter as pilot.
--
-- Reverse (only while no question has been promoted or added since):
--   update public.questions set status = 'pilot', updated_at = now() where status = 'production';

UPDATE public.questions SET status = 'production', updated_at = now() WHERE status = 'pilot';
