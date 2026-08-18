-- Rest returns, as a **slot** setting (FEATURES.md §8.2, issue #5).
--
-- Migration 0003 dropped `rest_seconds` from `template_slots` when §15 cut the
-- rest timer, and the reasoning there still holds for what it was actually
-- objecting to: a countdown that pushes you back to the bar during an
-- unhurried two-hour session. `expo-notifications` and the scheduling,
-- cancelling and deliver-to-a-killed-app machinery that went with it stay gone.
--
-- What comes back is narrower and is the case that cut missed: interval work.
-- Ten 60-second rounds of jump rope with 15 seconds between them is not a rest
-- that interrupts training, it *is* the training, and the gap has to be timed
-- for the exercise to be what it says it is.
--
-- **On the slot, not the exercise**, because §5.2 lets one exercise fill two
-- slots and the same rope appears twice in one template at different rests.
-- Snapshotted onto `exercise_entries` at session start like every other plan
-- figure, so editing a template never rewrites what a finished session says
-- (invariant 5).
--
-- Both columns are nullable and default to null, which is no rest configured
-- and no countdown shown. Nothing existing is read, rewritten or dropped.

ALTER TABLE `exercise_entries` ADD `rest_seconds` integer;--> statement-breakpoint
ALTER TABLE `template_slots` ADD `rest_seconds` integer;
