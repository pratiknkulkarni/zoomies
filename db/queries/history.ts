import {
  and,
  count,
  desc,
  eq,
  gte,
  isNotNull,
  isNull,
  max,
} from 'drizzle-orm';

import { db } from '../client';
import {
  exerciseEntries,
  sessions,
  setMetricValues,
  sets,
} from '../schema';
/**
 * Reads for History (FEATURES.md §9).
 *
 * Same rule as every read layer before this one: **each query is rooted at the
 * table it depends on**, because `useLiveQuery` subscribes to the root alone. A
 * timeline that joined in its exercise counts would never move when a set was
 * logged or a session deleted.
 *
 * Nothing here is **stored** aggregated (invariant 3). Several of these queries
 * do aggregate — `COUNT`, `MAX`, a date floor — and that is not the same thing.
 * The invariant forbids a `set_count` column that a corrected set could not
 * reach; it says nothing about where a fold happens at read time, and SQLite is
 * a better place for one than JavaScript is.
 *
 * **That distinction was worth about three and a half seconds.** These queries
 * originally selected every matching row and folded them in JS. On a database
 * holding nineteen years, logging one set re-ran them across roughly 206,000
 * rows — every one serialised over the bridge and allocated as a JS object — and
 * the set took four seconds to appear. Folding in SQL returns the same answers:
 * 50,707 rows became 3,724 for the counts, and 11 for the last-trained map.
 */

/** Completed sessions, newest first. Quick logs included — see below. */
export function completedSessions() {
  return db
    .select()
    .from(sessions)
    .where(
      and(
        isNull(sessions.deletedAt),
        isNotNull(sessions.completedAt),
      ),
    )
    .orderBy(desc(sessions.completedAt));
}

/**
 * Every live entry, as the two columns History needs.
 *
 * Supplies both the exercise count per session and — for a quick log, which has
 * no name of its own (§6.1) — the exercise to title the row with. Rooted at
 * `exercise_entries` so the count moves when one is added or removed.
 *
 * Two columns for every entry ever, which grows with training history. At this
 * volume that is cheaper than a query per row and honest about what it costs;
 * Phase 8 is where it would be revisited if it ever mattered.
 */
export function liveEntryRefs() {
  return db
    .select({
      sessionId: exerciseEntries.sessionId,
      exerciseId: exerciseEntries.exerciseId,
    })
    .from(exerciseEntries)
    .where(isNull(exerciseEntries.deletedAt))
    .orderBy(exerciseEntries.displayOrder);
}

/**
 * How many sets each session holds, counted in SQL.
 *
 * The timeline says `11 sets` on every row, and that figure is a count of rows
 * every time it is read — there is no stored total and there must not be one
 * (invariant 3). Rooted at `sets` so logging or deleting one moves the number.
 *
 * **This used to return one row per set and count them in JavaScript**, on the
 * stated grounds that `useLiveQuery` watches the root table rather than the
 * shape of the result, so a `GROUP BY` would save transfer and change nothing
 * about *when* the query re-runs. Both halves of that are true and the
 * conclusion was still wrong: how often it re-runs was never the problem, and
 * what it costs each time is. At nineteen years this returned 50,707 rows to
 * produce 3,724 numbers, and it re-ran on every set logged anywhere in the
 * application.
 */
export function setCountsBySession() {
  return db
    .select({
      sessionId: exerciseEntries.sessionId,
      sets: count(),
    })
    .from(sets)
    .innerJoin(exerciseEntries, eq(exerciseEntries.id, sets.exerciseEntryId))
    .where(and(isNull(sets.deletedAt), isNull(exerciseEntries.deletedAt)))
    .groupBy(exerciseEntries.sessionId);
}

/**
 * When each exercise was last trained: one row per exercise, `MAX` in SQL.
 *
 * Read by four screens — the library, the archive, Quick log's recents and Look
 * back's neglect list — and every one of them wanted this single figure. It
 * used to be answered by returning **every set ever** and folding it down in
 * JavaScript, which at nineteen years meant 50,707 rows carried across the
 * bridge to produce **eleven**. Quick log even reimplemented the fold inline.
 *
 * **Completed sessions only**, the same line §10.1 draws for records: a set
 * logged in a session still running has not happened yet in the sense this
 * figure means, and the library would otherwise say `today` for a movement
 * mid-session and take it back if the session were discarded.
 */
export function lastTrainedPerExercise() {
  return db
    .select({
      exerciseId: exerciseEntries.exerciseId,
      lastTrainedAt: max(sets.performedAt),
    })
    .from(sets)
    .innerJoin(exerciseEntries, eq(exerciseEntries.id, sets.exerciseEntryId))
    .innerJoin(sessions, eq(sessions.id, exerciseEntries.sessionId))
    .where(
      and(
        isNull(sets.deletedAt),
        isNull(exerciseEntries.deletedAt),
        isNull(sessions.deletedAt),
        isNotNull(sessions.completedAt),
      ),
    )
    .groupBy(exerciseEntries.exerciseId);
}

/**
 * The days something was trained, no earlier than `fromMs`.
 *
 * **The window is the point.** The grid draws one square per day and never more
 * than the weeks it is showing, so a query that returned every set ever was
 * fetching nineteen years to draw fifteen weeks. `DISTINCT` on top: four sets on
 * one evening are one square, and the fold in `daysTrainedGrid` was collapsing
 * them in JavaScript after carrying all four across.
 *
 * Rooted at `sets`, so a set logged now moves the grid. `fromMs` must be stable
 * across renders or the subscription is torn down and rebuilt on every one —
 * Look back fixes its clock once at mount for exactly this reason.
 */
export function trainedDaysSince(fromMs: number) {
  return db
    .selectDistinct({ performedAt: sets.performedAt })
    .from(sets)
    .innerJoin(exerciseEntries, eq(exerciseEntries.id, sets.exerciseEntryId))
    .innerJoin(sessions, eq(sessions.id, exerciseEntries.sessionId))
    .where(
      and(
        isNull(sets.deletedAt),
        isNull(exerciseEntries.deletedAt),
        isNull(sessions.deletedAt),
        isNotNull(sessions.completedAt),
        gte(sets.performedAt, fromMs),
      ),
    );
}

/**
 * Every measurement in one session, for the detail screen's per-set lines.
 *
 * Rooted at `set_metric_values` so correcting a set from history refreshes the
 * screen — the set row itself does not change when its numbers do.
 */
export function valuesForSession(sessionId: string) {
  return db
    .select({ value: setMetricValues })
    .from(setMetricValues)
    .innerJoin(sets, eq(sets.id, setMetricValues.setId))
    .innerJoin(exerciseEntries, eq(exerciseEntries.id, sets.exerciseEntryId))
    .where(
      and(
        isNull(setMetricValues.deletedAt),
        isNull(sets.deletedAt),
        isNull(exerciseEntries.deletedAt),
        eq(exerciseEntries.sessionId, sessionId),
      ),
    );
}

// ---------------------------------------------------------------------------
// In-memory joins
// ---------------------------------------------------------------------------

/** Exercise ids per session, in the order they were trained. */
export function indexEntriesBySession(
  rows: { sessionId: string; exerciseId: string }[],
): Map<string, string[]> {
  const bySession = new Map<string, string[]>();

  for (const row of rows) {
    const existing = bySession.get(row.sessionId);
    if (existing) {
      existing.push(row.exerciseId);
    } else {
      bySession.set(row.sessionId, [row.exerciseId]);
    }
  }

  return bySession;
}

/**
 * The most recent set per exercise. Absent means never trained — which is not
 * a date and must never be rendered as one (invariant 2).
 */
export function lastTrainedByExercise(
  rows: { exerciseId: string; lastTrainedAt: number | null }[],
): Map<string, number> {
  const latest = new Map<string, number>();

  for (const row of rows) {
    // `MAX` over an empty group is null, and a null is not a date. Invariant 2
    // reaches all the way out here: absent must stay absent rather than becoming
    // a zero that renders as 1 January 1970.
    if (row.lastTrainedAt !== null) {
      latest.set(row.exerciseId, row.lastTrainedAt);
    }
  }

  return latest;
}

/**
 * How many sets each exercise holds. Absent means none — the archive uses this
 * to decide what can be deleted outright rather than only put away.
 */
export function setCountByExercise(
  rows: { exerciseId: string }[],
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const row of rows) {
    counts.set(row.exerciseId, (counts.get(row.exerciseId) ?? 0) + 1);
  }

  return counts;
}

/**
 * How many sets each session holds, keyed for lookup.
 *
 * A transcription now rather than a fold — `setCountsBySession` does the
 * counting. Absent still means none, and is still never a stored zero.
 */
export function countBySession(
  rows: { sessionId: string; sets: number }[],
): Map<string, number> {
  return new Map(rows.map((row) => [row.sessionId, row.sets]));
}

/**
 * Session length lives in `lib/history.ts`, not here. It is the phase's second
 * exit criterion and this module cannot be imported by the test runner —
 * `../client` pulls in `expo-sqlite`, which does not run in Node.
 */
