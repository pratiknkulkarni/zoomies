import { and, asc, desc, eq, inArray, isNotNull, isNull, ne } from 'drizzle-orm';

import { db } from '../client';
import {
  exerciseEntries,
  sessions,
  setMetricValues,
  sets,
} from '../schema';

/**
 * Reads for sessions, entries and sets.
 *
 * Same rule as every read layer before this one: **each query is rooted at the
 * table it depends on**, because `useLiveQuery` subscribes to the root alone.
 * The session screen therefore reads entries and sets separately and counts in
 * memory rather than joining — a joined count would never move when a set was
 * logged.
 *
 * Nothing here is aggregated in the database. `2 / 4` is a count of rows at
 * read time (invariant 3).
 */

export type Session = typeof sessions.$inferSelect;
export type ExerciseEntry = typeof exerciseEntries.$inferSelect;
export type LoggedSet = typeof sets.$inferSelect;
export type SetMetricValue = typeof setMetricValues.$inferSelect;

const liveSession = isNull(sessions.deletedAt);
const liveEntry = isNull(exerciseEntries.deletedAt);
const liveSet = isNull(sets.deletedAt);
const liveValue = isNull(setMetricValues.deletedAt);

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

/**
 * The unfinished session, if there is one. §6.2 allows exactly one at a time,
 * so this drives the resume prompt on launch and the banner on Home.
 *
 * Quick logs are excluded: they complete on save and never leave anything to
 * resume (§6.1).
 */
export function activeSession() {
  return db
    .select()
    .from(sessions)
    .where(
      and(
        liveSession,
        isNull(sessions.completedAt),
        eq(sessions.isQuickLog, false),
      ),
    )
    .orderBy(desc(sessions.startedAt))
    .limit(1);
}

export function sessionById(id: string) {
  return db
    .select()
    .from(sessions)
    .where(and(liveSession, eq(sessions.id, id)))
    .limit(1);
}

// ---------------------------------------------------------------------------
// Entries and sets
// ---------------------------------------------------------------------------

/** One session's exercises, in the order they are trained. */
export function entriesForSession(sessionId: string) {
  return db
    .select()
    .from(exerciseEntries)
    .where(and(liveEntry, eq(exerciseEntries.sessionId, sessionId)))
    .orderBy(asc(exerciseEntries.displayOrder));
}

export function entryById(id: string) {
  return db
    .select()
    .from(exerciseEntries)
    .where(and(liveEntry, eq(exerciseEntries.id, id)))
    .limit(1);
}

/**
 * Every set in a session, for the `2 / 4` counters on the session screen.
 *
 * Rooted at `sets` and filtered through a join to entries: the listener watches
 * `sets`, which is exactly the table that changes when a set is logged.
 */
export function setsForSession(sessionId: string) {
  return db
    .select({ set: sets })
    .from(sets)
    .innerJoin(exerciseEntries, eq(exerciseEntries.id, sets.exerciseEntryId))
    .where(and(liveSet, liveEntry, eq(exerciseEntries.sessionId, sessionId)))
    .orderBy(asc(sets.setIndex));
}

/** One exercise's sets, in the order they were performed. */
export function setsForEntry(entryId: string) {
  return db
    .select()
    .from(sets)
    .where(and(liveSet, eq(sets.exerciseEntryId, entryId)))
    .orderBy(asc(sets.setIndex));
}

/**
 * The measurements for one exercise's sets. Rooted at `set_metric_values` so
 * editing a value refreshes the screen — the set row itself does not change
 * when its numbers do.
 */
export function valuesForEntry(entryId: string) {
  return db
    .select({ value: setMetricValues })
    .from(setMetricValues)
    .innerJoin(sets, eq(sets.id, setMetricValues.setId))
    .where(and(liveValue, liveSet, eq(sets.exerciseEntryId, entryId)));
}

// ---------------------------------------------------------------------------
// In-memory joins
// ---------------------------------------------------------------------------

/** Groups sets by the entry they belong to, preserving set order. */
export function indexSetsByEntry(
  rows: { set: LoggedSet }[],
): Map<string, LoggedSet[]> {
  const byEntry = new Map<string, LoggedSet[]>();

  for (const { set } of rows) {
    const existing = byEntry.get(set.exerciseEntryId);
    if (existing) {
      existing.push(set);
    } else {
      byEntry.set(set.exerciseEntryId, [set]);
    }
  }

  return byEntry;
}

/** Groups measurements by set, so a set row can render its own numbers. */
export function indexValuesBySet(
  rows: { value: SetMetricValue }[],
): Map<string, SetMetricValue[]> {
  const bySet = new Map<string, SetMetricValue[]>();

  for (const { value } of rows) {
    const existing = bySet.get(value.setId);
    if (existing) {
      existing.push(value);
    } else {
      bySet.set(value.setId, [value]);
    }
  }

  return bySet;
}

// ---------------------------------------------------------------------------
// Last time
// ---------------------------------------------------------------------------

export type LastTime = {
  /** Ordered as performed: `8 · 8 · 7 · 6`. */
  values: (number | null)[];
  performedAt: number;
  /** True when this came from a different template, or from none (§7.2). */
  fromElsewhere: boolean;
  sessionName: string | null;
};

/**
 * What this exercise did last time, for the line above the logging UI (§7.2).
 *
 * **Scoped to the template first.** Pull-ups in Pull Day and pull-ups in a
 * Rings session are different contexts, so a same-template result always wins.
 * Only when the template has no prior history does this fall back to the most
 * recent occurrence anywhere, and then it says so — `fromElsewhere` is what
 * lets the screen label the source rather than quietly comparing across
 * contexts.
 *
 * **Read once, not live.** History cannot change while a session is running,
 * so subscribing to it would buy nothing and would re-render the logging screen
 * on every set saved.
 */
export async function lastTimeFor(
  exerciseId: string,
  metricId: string,
  templateId: string | null,
  excludeSessionId: string,
): Promise<LastTime | null> {
  const sameTemplate =
    templateId === null
      ? null
      : await mostRecentEntry(exerciseId, excludeSessionId, templateId);

  const entry =
    sameTemplate ?? (await mostRecentEntry(exerciseId, excludeSessionId, null));

  if (!entry) {
    return null;
  }

  const performed = await db
    .select({ id: sets.id })
    .from(sets)
    .where(and(liveSet, eq(sets.exerciseEntryId, entry.entryId)))
    .orderBy(asc(sets.setIndex));

  if (performed.length === 0) {
    // §6.5 — an exercise with no sets reads as "not trained", never as zeros.
    return null;
  }

  const values = await db
    .select()
    .from(setMetricValues)
    .where(
      and(
        liveValue,
        eq(setMetricValues.exerciseMetricId, metricId),
        inArray(
          setMetricValues.setId,
          performed.map((row) => row.id),
        ),
      ),
    );

  const bySet = new Map(values.map((value) => [value.setId, value.valueNum]));

  return {
    // Null for a set where this metric went unrecorded — displayed as `—`,
    // never as zero (invariant 2).
    values: performed.map((row) => bySet.get(row.id) ?? null),
    performedAt: entry.completedAt,
    fromElsewhere: sameTemplate === null,
    sessionName: entry.sessionName,
  };
}

/** The most recent completed session's entry for an exercise. */
async function mostRecentEntry(
  exerciseId: string,
  excludeSessionId: string,
  templateId: string | null,
) {
  const [row] = await db
    .select({
      entryId: exerciseEntries.id,
      completedAt: sessions.completedAt,
      sessionName: sessions.name,
    })
    .from(exerciseEntries)
    .innerJoin(sessions, eq(sessions.id, exerciseEntries.sessionId))
    .where(
      and(
        liveEntry,
        liveSession,
        eq(exerciseEntries.exerciseId, exerciseId),
        isNotNull(sessions.completedAt),
        // The session being logged right now is not its own history. It is
        // still incomplete, so `completedAt` already excludes it — this is
        // belt and braces for the completion flow in Phase 6, which writes
        // `completed_at` before the screen unmounts.
        ne(sessions.id, excludeSessionId),
        templateId === null ? undefined : eq(sessions.templateId, templateId),
      ),
    )
    .orderBy(desc(sessions.completedAt))
    .limit(1);

  if (!row || row.completedAt === null) {
    return null;
  }

  return { ...row, completedAt: row.completedAt };
}
