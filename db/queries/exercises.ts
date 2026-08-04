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
 * Archived exercises. Not in FEATURES.md as a surface, but archiving without
 * anywhere to see the result is a one-way door — this is what makes it
 * reversible.
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
        eq(owned.isArchived, false),
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
