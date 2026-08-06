-- Custom SQL migration file, put your code below! --

-- `family` was seeded as slugs (`pull_up`, `core_hang`) and shown to the user
-- verbatim, underscores and all. It is a display value, not a key: nothing
-- joins on it and `suggestedExercises()` only groups by exact string match, so
-- rewriting every row at once leaves grouping intact.
--
-- Sentence case per DESIGN.md §2.5. Matching is on the exact slug, so a family
-- the user typed themselves is never touched.
--
-- Forward-only and lossless: this rewrites a label on `exercises` and reaches
-- no other table. No set, no session and no logged value is involved.

UPDATE `exercises` SET `family` = 'Back lever' WHERE `family` = 'back_lever';--> statement-breakpoint
UPDATE `exercises` SET `family` = 'Core hang' WHERE `family` = 'core_hang';--> statement-breakpoint
UPDATE `exercises` SET `family` = 'Dip' WHERE `family` = 'dip';--> statement-breakpoint
UPDATE `exercises` SET `family` = 'Front lever' WHERE `family` = 'front_lever';--> statement-breakpoint
UPDATE `exercises` SET `family` = 'Handstand' WHERE `family` = 'handstand';--> statement-breakpoint
UPDATE `exercises` SET `family` = 'Handstand push-up' WHERE `family` = 'hspu';--> statement-breakpoint
UPDATE `exercises` SET `family` = 'L-sit' WHERE `family` = 'l_sit';--> statement-breakpoint
UPDATE `exercises` SET `family` = 'Pull-up' WHERE `family` = 'pull_up';--> statement-breakpoint
UPDATE `exercises` SET `family` = 'Push-up' WHERE `family` = 'push_up';--> statement-breakpoint
UPDATE `exercises` SET `family` = 'Row' WHERE `family` = 'row';--> statement-breakpoint
UPDATE `exercises` SET `family` = 'Squat' WHERE `family` = 'squat';--> statement-breakpoint
UPDATE `exercises` SET `family` = 'Support hold' WHERE `family` = 'support_hold';
