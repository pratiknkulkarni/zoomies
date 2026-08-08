-- Custom SQL migration file, put your code below! --

-- The raise prompt (FEATURES.md §6.6) is the only mechanism by which a target
-- increases, so it has to write back to the template slot — the entry is
-- history, and invariant 5 forbids rewriting it.
--
-- Until now an entry could not say which slot it came from. It records the
-- exercise and a snapshot of the targets, and §5.2 lets one exercise fill two
-- slots in the same template with different targets, so matching on the
-- exercise is a guess and matching on display order breaks the moment a slot
-- is reordered.
--
-- This column is **provenance, not a target source.** Nothing reads a target
-- through it. It answers one question: which slot, if any.
--
-- Written by hand rather than generated from a schema diff, because a foreign
-- key added to a table holding training history should read as a decision.
--
-- No table rebuild: SQLite accepts a REFERENCES clause on ADD COLUMN as long as
-- the default is NULL, which it is. Existing entries keep NULL — they belong to
-- sessions that are already complete and were never raisable.

ALTER TABLE `exercise_entries`
  ADD COLUMN `template_slot_id` text
  REFERENCES `template_slots`(`id`) ON DELETE SET NULL;
