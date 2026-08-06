-- Custom SQL migration file, put your code below! --

-- The rest timer is cut (FEATURES.md §15). A countdown that pushes you back to
-- the bar works against someone training unhurriedly for two hours, which is
-- how this app is actually used.
--
-- Written by hand rather than generated from a schema diff, because dropping a
-- column is a decision and should read as one.
--
-- `ALTER TABLE ... DROP COLUMN` needs SQLite 3.35, which every platform this
-- ships to has. No table rebuild: nothing references a slot (§5.2), so there
-- are no foreign keys to reconstruct.
--
-- Forward-only and lossless in the sense that matters: `rest_seconds` was a
-- plan setting, never training history. No set, no session and no logged value
-- is touched.

ALTER TABLE `template_slots` DROP COLUMN `rest_seconds`;
