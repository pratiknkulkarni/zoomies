import { and, asc, eq, isNull } from 'drizzle-orm';

import { db, type Transaction } from '../client';
import { setMetricValues, sets } from '../schema';
import { renumber } from './ordering';

/**
 * Writes for logged sets — the ones invariant 1 is about.
 *
 * **Never lose a set.** Every function here is a single transaction that
 * commits to SQLite before it resolves, and callers await it before the UI
 * moves. A force-quit between tapping Save and the screen changing loses
 * nothing, because by then the row is already on disk.
 *
 * **A set stores no measurements.** The `sets` row records that an effort
 * happened; the numbers live in `set_metric_values`, one row per metric. A
 * metric the user left blank gets no row at all — that is what "not recorded"
 * is, and it is why an unrecorded value can never read back as zero.
 */

export type SetValueInput = {
  metricId: string;
  num?: number | null;
  text?: string | null;
};

const liveSet = isNull(sets.deletedAt);
const liveValue = isNull(setMetricValues.deletedAt);

/** Nothing entered at all — no row is written for this metric. */
function isRecorded(value: SetValueInput): boolean {
  return (value.num ?? null) !== null || (value.text ?? null) !== null;
}

/**
 * Logs one set: the effort, then its measurements, in one transaction.
 *
 * `to_failure` lives on the set rather than being a metric (§4.2) — eight clean
 * reps and eight grinding reps are different data, and every exercise can say
 * so regardless of what it measures.
 */
export async function logSet(
  entryId: string,
  values: SetValueInput[],
  toFailure = false,
): Promise<string> {
  return db.transaction(async (tx) => {
    const existing = await liveSets(tx, entryId);

    const [created] = await tx
      .insert(sets)
      .values({
        exerciseEntryId: entryId,
        setIndex: existing.length,
        toFailure,
        performedAt: Date.now(),
      })
      .returning({ id: sets.id });

    if (!created) {
      throw new Error(`Failed to log a set against entry ${entryId}`);
    }

    await writeValues(tx, created.id, values);

    return created.id;
  });
}

/**
 * Corrects a set that was logged wrong (§7.3). Available during and after a
 * session, because mislogging while tired is expected.
 *
 * Clearing a value deletes its row rather than writing zero: the user is saying
 * it was never recorded, which is not the same as saying it was none.
 */
export async function updateSetValues(
  setId: string,
  values: SetValueInput[],
): Promise<void> {
  await db.transaction(async (tx) => {
    await writeValues(tx, setId, values);
  });
}

export async function setToFailure(
  setId: string,
  toFailure: boolean,
): Promise<void> {
  await db.update(sets).set({ toFailure }).where(eq(sets.id, setId));
}

/**
 * Soft-deletes a set and closes the gap behind it, so `set_index` stays 0..n-1
 * and the `2 / 4` counter keeps matching the rows it counts.
 *
 * The measurements are left alone — they hang off a set that is now deleted and
 * every read filters on that, so removing them would be work with no observable
 * effect and one more way to lose data by accident.
 */
export async function deleteSet(
  entryId: string,
  setId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const ordered = await liveSets(tx, entryId);

    await tx
      .update(sets)
      .set({ deletedAt: Date.now() })
      .where(eq(sets.id, setId));

    await renumber(
      ordered.map((row) => ({ id: row.id, displayOrder: row.setIndex })),
      ordered.filter((row) => row.id !== setId),
      (id, setIndex) => tx.update(sets).set({ setIndex }).where(eq(sets.id, id)),
    );
  });
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function liveSets(tx: Transaction, entryId: string) {
  return tx
    .select()
    .from(sets)
    .where(and(liveSet, eq(sets.exerciseEntryId, entryId)))
    .orderBy(asc(sets.setIndex));
}

/**
 * Upserts the measurements for one set. Recorded values are written, blank ones
 * remove whatever was there — so editing a set to clear a field is a real
 * statement, not a no-op.
 */
async function writeValues(
  tx: Transaction,
  setId: string,
  values: SetValueInput[],
): Promise<void> {
  const existing = await tx
    .select()
    .from(setMetricValues)
    .where(and(liveValue, eq(setMetricValues.setId, setId)));

  const byMetric = new Map(
    existing.map((value) => [value.exerciseMetricId, value]),
  );

  for (const value of values) {
    const current = byMetric.get(value.metricId);

    if (!isRecorded(value)) {
      if (current) {
        await tx
          .update(setMetricValues)
          .set({ deletedAt: Date.now() })
          .where(eq(setMetricValues.id, current.id));
      }
      continue;
    }

    if (current) {
      await tx
        .update(setMetricValues)
        .set({ valueNum: value.num ?? null, valueText: value.text ?? null })
        .where(eq(setMetricValues.id, current.id));
    } else {
      await tx.insert(setMetricValues).values({
        setId,
        exerciseMetricId: value.metricId,
        valueNum: value.num ?? null,
        valueText: value.text ?? null,
      });
    }
  }
}
