import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm';

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
 * Nothing here is aggregated in the database (invariant 3). A session's length
 * and its exercise count are both computed from rows every time they are read.
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
 * One row per live set, carrying only the session it belongs to.
 *
 * The timeline says `11 sets` on every row, and that figure is a count of rows
 * every time it is read — there is no stored total and there must not be one
 * (invariant 3). Rooted at `sets` so logging or deleting one moves the number.
 *
 * Counting in SQL with a `GROUP BY` would return fewer rows, but `useLiveQuery`
 * watches the root table rather than the shape of the result, so it would save
 * transfer and change nothing about when the query re-runs. One column per set
 * keeps it the same kind of query as `liveEntryRefs` above, which is worth more
 * than the bytes.
 */
export function liveSetRefs() {
  return db
    .select({ sessionId: exerciseEntries.sessionId })
    .from(sets)
    .innerJoin(exerciseEntries, eq(exerciseEntries.id, sets.exerciseEntryId))
    .where(and(isNull(sets.deletedAt), isNull(exerciseEntries.deletedAt)));
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

/** How many sets each session holds. Absent means none, never zero stored. */
export function countBySession(rows: { sessionId: string }[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const row of rows) {
    counts.set(row.sessionId, (counts.get(row.sessionId) ?? 0) + 1);
  }

  return counts;
}

/**
 * Session length lives in `lib/history.ts`, not here. It is the phase's second
 * exit criterion and this module cannot be imported by the test runner —
 * `../client` pulls in `expo-sqlite`, which does not run in Node.
 */
