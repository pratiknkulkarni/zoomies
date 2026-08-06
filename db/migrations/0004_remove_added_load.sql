-- Custom SQL migration file, put your code below! --

-- Added load is removed (FEATURES.md §15). Bodyweight training is what this app
-- is for, and a weighted variant can be its own exercise — which is already how
-- progressions are modelled (§3.1).
--
-- **Soft delete, exactly as `deleteMetric` does.** `set_metric_values` rows are
-- untouched and stay on disk, so nothing logged against a load metric is lost
-- and Phase 8 can still name what it is reading. Restoring the feature later
-- means clearing `deleted_at`, not reconstructing anything.
--
-- Matched on the unit rather than the name, because the name is editable and a
-- renamed load metric still stores kilograms.

UPDATE `exercise_metrics`
SET `deleted_at` = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE `deleted_at` IS NULL AND lower(`unit`) = 'kg';--> statement-breakpoint

-- Closing the gap left behind, the same thing `deleteMetric` does in its
-- transaction: every surviving metric is renumbered to its rank within its own
-- exercise, so `display_order` stays 0..n-1 and the first is unambiguously the
-- one that drives the logging UI (§4.1).
--
-- This matters beyond tidiness. An exercise ordered [Added load, Reps] now has
-- Reps at 0, so it correctly logs as a count rather than reading its primary
-- metric from a row that no longer exists.

UPDATE `exercise_metrics`
SET `display_order` = (
  SELECT COUNT(*)
  FROM `exercise_metrics` AS `earlier`
  WHERE `earlier`.`exercise_id` = `exercise_metrics`.`exercise_id`
    AND `earlier`.`deleted_at` IS NULL
    AND `earlier`.`display_order` < `exercise_metrics`.`display_order`
)
WHERE `deleted_at` IS NULL;--> statement-breakpoint

-- A template slot may have been targeting the load. A target whose metric is
-- gone would render as a value with nothing to measure it in, so both halves
-- are cleared together — the same rule `setSlotTarget` enforces (§5.1).

UPDATE `template_slots`
SET `target_metric_id` = NULL, `target_value` = NULL
WHERE `target_metric_id` IN (
  SELECT `id` FROM `exercise_metrics` WHERE lower(`unit`) = 'kg'
);--> statement-breakpoint

-- The same for targets already snapshotted onto a session's entries. An
-- in-progress session keeps its sets; it just stops claiming a target it can no
-- longer describe.

UPDATE `exercise_entries`
SET `target_metric_id` = NULL, `target_value` = NULL
WHERE `target_metric_id` IN (
  SELECT `id` FROM `exercise_metrics` WHERE lower(`unit`) = 'kg'
);
