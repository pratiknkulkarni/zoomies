import { and, asc, desc, eq, isNotNull, isNull } from 'drizzle-orm';

import { db } from '../client';
import {
  exerciseEntries,
  sessions,
  setMetricValues,
  sets,
} from '../schema';

/**
 * Reads for Exercise Details (FEATURES.md §10) — one movement across its whole
 * life, spanning every template and including quick logs.
 *
 * Same rule as every read layer before this one: **each query is rooted at the
 * table it depends on**, because `useLiveQuery` subscribes to the root alone.
 * Three roots, and each one earns its place:
 *
 * | root               | moves when                                  |
 * |--------------------|---------------------------------------------|
 * | `sessions`         | a session is renamed, deleted or completed  |
 * | `sets`             | a set is logged or deleted                  |
 * | `set_metric_values`| a set is corrected from history             |
 *
 * A single joined query would answer all three questions and react to none of
 * them properly. `exercise_entries` needs no root of its own: nothing
 * soft-deletes an entry — `deleteSession` marks only the session — so every way
 * an entry can leave this screen already moves one of the three above.
 *
 * **Only completed sessions.** A record claimed mid-session would vanish if
 * that session were later discarded, and §9 already draws this line for
 * history. The moment a target is beaten during training belongs to the
 * completion review (§6.6), not here.
 *
 * Nothing is aggregated in the database (invariant 3). The ranking is a fold in
 * `lib/records.ts`, where it can be tested.
 */

const liveSession = isNull(sessions.deletedAt);
const liveEntry = isNull(exerciseEntries.deletedAt);
const liveSet = isNull(sets.deletedAt);
const liveValue = isNull(setMetricValues.deletedAt);

/** A session that is over and still in the record. */
const finished = and(liveSession, isNotNull(sessions.completedAt));

/**
 * Every completed session this exercise appears in, newest first.
 *
 * Distinct because §5.2 lets one exercise fill two slots in a template, which
 * gives one session two entries for it — the same session, trained twice, not
 * two sessions.
 */
export function sessionsForExercise(exerciseId: string) {
  return db
    .selectDistinct({ session: sessions })
    .from(sessions)
    .innerJoin(exerciseEntries, eq(exerciseEntries.sessionId, sessions.id))
    .where(and(finished, liveEntry, eq(exerciseEntries.exerciseId, exerciseId)))
    .orderBy(desc(sessions.completedAt));
}

/**
 * Every set ever logged for this exercise.
 *
 * Ordered newest session first and, within one, in the order the sets were
 * performed — which is what `groupSetsBySession` then reads, and what a line of
 * sets has to say to mean anything.
 *
 * `sessionId` is carried up from the entry so the fold never needs the entry
 * itself. Where an exercise fills two slots of one template, both entries'
 * sets land in the same session and read as one line; §10 is the lifetime of a
 * movement, not a record of which slot it sat in.
 */
export function setsForExercise(exerciseId: string) {
  return db
    .select({
      id: sets.id,
      sessionId: exerciseEntries.sessionId,
      setIndex: sets.setIndex,
      toFailure: sets.toFailure,
      performedAt: sets.performedAt,
    })
    .from(sets)
    .innerJoin(exerciseEntries, eq(exerciseEntries.id, sets.exerciseEntryId))
    .innerJoin(sessions, eq(sessions.id, exerciseEntries.sessionId))
    .where(
      and(liveSet, liveEntry, finished, eq(exerciseEntries.exerciseId, exerciseId)),
    )
    .orderBy(desc(sessions.completedAt), asc(sets.setIndex));
}

/**
 * Every measurement ever recorded for this exercise.
 *
 * Rooted at `set_metric_values` so correcting a set from history moves both the
 * line it appears in and the record it might have just taken or lost.
 */
export function valuesForExercise(exerciseId: string) {
  return db
    .select({
      setId: setMetricValues.setId,
      exerciseMetricId: setMetricValues.exerciseMetricId,
      valueNum: setMetricValues.valueNum,
      valueText: setMetricValues.valueText,
    })
    .from(setMetricValues)
    .innerJoin(sets, eq(sets.id, setMetricValues.setId))
    .innerJoin(exerciseEntries, eq(exerciseEntries.id, sets.exerciseEntryId))
    .innerJoin(sessions, eq(sessions.id, exerciseEntries.sessionId))
    .where(
      and(
        liveValue,
        liveSet,
        liveEntry,
        finished,
        eq(exerciseEntries.exerciseId, exerciseId),
      ),
    );
}
