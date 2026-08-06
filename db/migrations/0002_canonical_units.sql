-- Custom SQL migration file, put your code below! --

-- Units were free text, then briefly a picker built from `SELECT DISTINCT
-- unit` — which offered every typo already made and so kept them alive. The
-- picker now works from a canonical list (`lib/units.ts`); this cleans up what
-- the free-text era left behind.
--
-- Deliberately conservative. Only spellings of the two units the app actually
-- has (CLAUDE.md invariant 9: kg and seconds) are normalised, and a unit that
-- is none of these is left exactly as it is rather than guessed at.
--
-- Forward-only and lossless: this touches the `unit` label on
-- `exercise_metrics` and nothing else. No set, no `set_metric_values` row and
-- no logged number is involved, and a null unit still displays — both
-- `formatSetValues` and `formatTarget` fall back to the metric's name.

-- Case and spelling variants of the two canonical units.
UPDATE `exercise_metrics`
SET `unit` = 'kg'
WHERE lower(`unit`) = 'kg' AND `unit` <> 'kg';--> statement-breakpoint

UPDATE `exercise_metrics`
SET `unit` = 's'
WHERE lower(`unit`) IN ('s', 'sec', 'secs', 'second', 'seconds', 'secund', 'secunds')
  AND `unit` <> 's';--> statement-breakpoint

-- A count has no unit: `Reps` is the metric's name, so a `reps` unit beneath it
-- repeats the same word. This is what made the metric editor show `Reps` over
-- `reps` and read as two fields wanting the same answer.
UPDATE `exercise_metrics`
SET `unit` = NULL
WHERE lower(`unit`) IN ('rep', 'reps');--> statement-breakpoint

-- The general form of the rule above, for any metric whose unit only restates
-- its own name.
UPDATE `exercise_metrics`
SET `unit` = NULL
WHERE `unit` IS NOT NULL AND lower(`unit`) = lower(`name`);
