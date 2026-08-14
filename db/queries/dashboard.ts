import { and, eq, gte, isNotNull, isNull, lt, max } from 'drizzle-orm';

import { db } from '../client';
import { exerciseEntries, sessions, setMetricValues, sets } from '../schema';

/**
 * The one read Look back needs that no other screen already makes
 * (FEATURES.md §11).
 *
 * Everything else on that screen is served by queries that exist: the grid and
 * the neglect list fold `trainedAtRefs`, the two counts fold
 * `completedSessions`, and the names come from `allLiveExercises` and
 * `allMetrics`. Six live queries on one screen, each rooted at the table it has
 * to react to — `useLiveQuery` subscribes to the root alone, so a single joined
 * query would answer every question and move for none of them.
 */

/**
 * Every measurement ever recorded, flattened across the whole library.
 *
 * §11.3's records block asks what was beaten in the last thirty days, and
 * beating something means comparing against everything before it — so the
 * window cannot be pushed into the query. What can be, and is: null
 * measurements, which are not candidates for anything (invariant 2), and the
 * three filters §10.1 puts on a record.
 *
 * **Only completed sessions.** A record claimed mid-session would vanish if
 * that session were discarded, and the same line is drawn by
 * `db/queries/records.ts` and by History (§9).
 *
 * **The window can be pushed into the query after all.** The note above is the
 * one this replaces, and it was wrong in an interesting way: beating something
 * does mean comparing against everything before it, but *everything before it*
 * collapses to one number per exercise and metric. So this returns only the
 * window, `bestBeforePerMetric` returns the bar each one has to clear, and the
 * 54,642 rows that used to cross the bridge to answer this became a few dozen.
 *
 * `notes` metrics contribute nothing — a note stores `value_text` and leaves
 * `value_num` null, so the predicate below drops them before they are read.
 */
export function valuesSince(sinceMs: number) {
  return db
    .select({
      exerciseId: exerciseEntries.exerciseId,
      metricId: setMetricValues.exerciseMetricId,
      setId: setMetricValues.setId,
      value: setMetricValues.valueNum,
      performedAt: sets.performedAt,
    })
    .from(setMetricValues)
    .innerJoin(sets, eq(sets.id, setMetricValues.setId))
    .innerJoin(exerciseEntries, eq(exerciseEntries.id, sets.exerciseEntryId))
    .innerJoin(sessions, eq(sessions.id, exerciseEntries.sessionId))
    .where(
      and(
        isNotNull(setMetricValues.valueNum),
        isNull(setMetricValues.deletedAt),
        isNull(sets.deletedAt),
        isNull(exerciseEntries.deletedAt),
        isNull(sessions.deletedAt),
        isNotNull(sessions.completedAt),
        gte(sets.performedAt, sinceMs),
      ),
    );
}

/**
 * The best each exercise and metric had reached **before** the window.
 *
 * The other half of the same answer. `recentRecords` needs to know what a set
 * in the window beat, and that is one number per exercise and metric rather
 * than every set that ever preceded it — so `MAX` in SQL returns eleven-ish rows
 * where the full history returned 54,642.
 *
 * Rooted at `set_metric_values`, like the query above, so a correction to an old
 * set moves what today's set is measured against.
 */
export function bestBeforePerMetric(sinceMs: number) {
  return db
    .select({
      exerciseId: exerciseEntries.exerciseId,
      metricId: setMetricValues.exerciseMetricId,
      best: max(setMetricValues.valueNum),
    })
    .from(setMetricValues)
    .innerJoin(sets, eq(sets.id, setMetricValues.setId))
    .innerJoin(exerciseEntries, eq(exerciseEntries.id, sets.exerciseEntryId))
    .innerJoin(sessions, eq(sessions.id, exerciseEntries.sessionId))
    .where(
      and(
        isNotNull(setMetricValues.valueNum),
        isNull(setMetricValues.deletedAt),
        isNull(sets.deletedAt),
        isNull(exerciseEntries.deletedAt),
        isNull(sessions.deletedAt),
        isNotNull(sessions.completedAt),
        lt(sets.performedAt, sinceMs),
      ),
    )
    .groupBy(exerciseEntries.exerciseId, setMetricValues.exerciseMetricId);
}
