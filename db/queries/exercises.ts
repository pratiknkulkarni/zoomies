import { and, asc, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';

import { db } from '../client';
import { exerciseMetrics, exercises } from '../schema';

/**
 * Reads for the exercise library. Every function returns a query builder, not
 * a result — components hand it to `useLiveQuery` and never refetch by hand.
 *
 * **Each query is rooted at the one table it depends on.** `useLiveQuery`
 * subscribes to a single table, the root of the query, and re-runs only when
 * that table changes. A list of exercises that joined in their metrics would
 * therefore go stale the moment a metric was edited, because the write lands
 * in `exercise_metrics` and the listener is watching `exercises`. So metrics
 * are read separately and joined in memory by `indexMetricsByExercise`, which
 * keeps both halves live.
 */

export type Exercise = typeof exercises.$inferSelect;
export type ExerciseMetric = typeof exerciseMetrics.$inferSelect;

/** Soft delete is the only delete, so this predicate belongs on every read. */
const alive = isNull(exercises.deletedAt);

/**
 * The active library: what the user owns. Archived exercises drop out of here
 * and out of pickers, but keep their history (FEATURES.md §3.5).
 */
export function activeExercises() {
  return db
    .select()
    .from(exercises)
    .where(
      and(alive, eq(exercises.isActive, true), eq(exercises.isArchived, false)),
    )
    .orderBy(asc(exercises.name));
}

/**
 * Archived exercises (§3.5). Backs `app/exercise/archived.tsx`, and the count
 * decides whether the Exercises tab offers a way there at all — archiving with
 * nowhere to see the result is a one-way door.
 */
export function archivedExercises() {
  return db
    .select()
    .from(exercises)
    .where(
      and(alive, eq(exercises.isActive, true), eq(exercises.isArchived, true)),
    )
    .orderBy(asc(exercises.name));
}

/**
 * Suggestions, FEATURES.md §3.3: catalogue exercises the user does not own,
 * whose `family` matches something they do. The curated `family` column drives
 * this — never string similarity.
 *
 * **Archived exercises still count as owned.** Archiving is usually a
 * graduation — the movement got too easy — and retracting the family at that
 * moment would hide the harder variants exactly when they became relevant.
 * Deleting does retract it: archive means "not right now", delete means "this
 * was a mistake". An archived exercise cannot be suggested back to the user
 * either way, since it is still `is_active` and the filter below excludes it.
 *
 * Dismissals are permanent, so a dismissed row never returns. Nothing here is
 * added without a tap, and §3.3 forbids showing any of it during a session.
 */
export function suggestedExercises() {
  const owned = alias(exercises, 'owned');

  const ownedFamilies = db
    .select({ family: owned.family })
    .from(owned)
    .where(
      and(
        isNull(owned.deletedAt),
        eq(owned.isActive, true),
        isNotNull(owned.family),
      ),
    );

  return db
    .select()
    .from(exercises)
    .where(
      and(
        alive,
        eq(exercises.isActive, false),
        isNull(exercises.suggestionDismissedAt),
        isNotNull(exercises.family),
        inArray(exercises.family, ownedFamilies),
      ),
    )
    .orderBy(asc(exercises.family), asc(exercises.name));
}

/**
 * Every exercise that still exists, for resolving an id to a name.
 *
 * Deliberately includes archived and inactive rows. A template slot written
 * last month may point at an exercise archived since, and the slot still has to
 * render as something better than a UUID. Pickers use `activeExercises`; this
 * is for lookup, not for offering.
 */
export function allLiveExercises() {
  return db.select().from(exercises).where(alive).orderBy(asc(exercises.name));
}

/** Keys the result of `allLiveExercises` by id. */
export function indexExercisesById(rows: Exercise[]): Map<string, Exercise> {
  return new Map(rows.map((exercise) => [exercise.id, exercise]));
}

/** One exercise, for the detail screen. Includes archived; excludes deleted. */
export function exerciseById(id: string) {
  return db
    .select()
    .from(exercises)
    .where(and(alive, eq(exercises.id, id)))
    .limit(1);
}

/**
 * One exercise's metrics in display order. The first is the primary metric and
 * drives the logging UI in Phase 4 (FEATURES.md §4.1).
 */
export function metricsForExercise(exerciseId: string) {
  return db
    .select()
    .from(exerciseMetrics)
    .where(
      and(
        isNull(exerciseMetrics.deletedAt),
        eq(exerciseMetrics.exerciseId, exerciseId),
      ),
    )
    .orderBy(asc(exerciseMetrics.displayOrder));
}

/**
 * Every live metric, for list rows that summarise what an exercise tracks.
 * Rooted at `exercise_metrics` so edits to a metric refresh the list.
 */
export function allMetrics() {
  return db
    .select()
    .from(exerciseMetrics)
    .where(isNull(exerciseMetrics.deletedAt))
    .orderBy(asc(exerciseMetrics.displayOrder));
}

/** Keys metrics by id, for resolving a stored `target_metric_id` to a name. */
export function indexMetricsById(
  metrics: ExerciseMetric[],
): Map<string, ExerciseMetric> {
  return new Map(metrics.map((metric) => [metric.id, metric]));
}

/** Groups the result of `allMetrics` by exercise, preserving display order. */
export function indexMetricsByExercise(
  metrics: ExerciseMetric[],
): Map<string, ExerciseMetric[]> {
  const byExercise = new Map<string, ExerciseMetric[]>();

  for (const metric of metrics) {
    const existing = byExercise.get(metric.exerciseId);
    if (existing) {
      existing.push(metric);
    } else {
      byExercise.set(metric.exerciseId, [metric]);
    }
  }

  return byExercise;
}
