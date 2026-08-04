import { and, asc, eq, isNull } from 'drizzle-orm';

import { db, type Transaction } from '../client';
import { exerciseMetrics, exercises } from '../schema';
import { movedOnePlace, renumber } from './ordering';

/**
 * Writes for the exercise library. Components never build a query inline;
 * everything that changes a row goes through here.
 *
 * Multi-statement work runs inside `db.transaction`. A lone `UPDATE` is not
 * wrapped — SQLite commits it atomically in autocommit mode, and a transaction
 * around one statement buys nothing but noise.
 *
 * `updated_at` is not set by hand anywhere below. `$onUpdateFn` on the schema's
 * lifecycle columns applies it to every update, so a mutation cannot forget.
 *
 * Deletion is soft everywhere. Nothing here reaches `set_metric_values`:
 * editing an exercise's metrics must leave logged history exactly as it was.
 */

/** The shape a new metric arrives in, taken from the table rather than restated. */
export type MetricInput = Pick<
  typeof exerciseMetrics.$inferInsert,
  'name' | 'type' | 'unit'
>;

export type ExerciseInput = Pick<
  typeof exercises.$inferInsert,
  'name' | 'family' | 'notes'
>;

// ---------------------------------------------------------------------------
// Suggestions
// ---------------------------------------------------------------------------

/**
 * The one tap of FEATURES.md §3.3 — a catalogue exercise becomes owned.
 *
 * A previous dismissal is left alone. It is a record of what the user said,
 * and the row leaves the suggestions list by being active regardless.
 */
export async function activateExercise(id: string): Promise<void> {
  await db
    .update(exercises)
    .set({ isActive: true })
    .where(eq(exercises.id, id));
}

/** Dismissals do not return (§3.3). */
export async function dismissSuggestion(id: string): Promise<void> {
  await db
    .update(exercises)
    .set({ suggestionDismissedAt: Date.now() })
    .where(eq(exercises.id, id));
}

// ---------------------------------------------------------------------------
// Exercises
// ---------------------------------------------------------------------------

/**
 * A custom exercise (§3.4). Active immediately — the user just asked for it.
 *
 * Metrics are inserted in the order given, so the first is the primary metric
 * and drives the logging UI in Phase 4 (§4.1).
 */
export async function createExercise(
  input: ExerciseInput,
  metrics: MetricInput[],
): Promise<string> {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(exercises)
      .values({ ...input, isBuiltin: false, isActive: true })
      .returning({ id: exercises.id });

    if (!created) {
      throw new Error(`Failed to create exercise: ${input.name}`);
    }

    await insertMetrics(tx, created.id, metrics, 0);

    return created.id;
  });
}

export async function updateExercise(
  id: string,
  edits: Partial<ExerciseInput>,
): Promise<void> {
  if (Object.values(edits).every((value) => value === undefined)) {
    return;
  }

  await db.update(exercises).set(edits).where(eq(exercises.id, id));
}

/** Out of pickers, history intact (§3.5). */
export async function archiveExercise(id: string): Promise<void> {
  await db
    .update(exercises)
    .set({ isArchived: true })
    .where(eq(exercises.id, id));
}

export async function unarchiveExercise(id: string): Promise<void> {
  await db
    .update(exercises)
    .set({ isArchived: false })
    .where(eq(exercises.id, id));
}

/**
 * Soft delete. History stays queryable, and a deleted built-in does not come
 * back on the next launch because the seed runs once (§3.5).
 *
 * The exercise's metrics are deliberately left alive: sets already logged
 * point at them, and Phase 8 has to be able to name what it is reading.
 */
export async function deleteExercise(id: string): Promise<void> {
  await db
    .update(exercises)
    .set({ deletedAt: Date.now() })
    .where(eq(exercises.id, id));
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

/**
 * Appends a metric. §4.1 puts a soft cap of four per exercise — a guideline,
 * not enforced here.
 *
 * There is deliberately no way to change a metric's `type`. Reinterpreting
 * `value_num` from reps to seconds would silently rewrite the meaning of every
 * set already logged against it. Delete the metric and add another instead.
 */
export async function addMetric(
  exerciseId: string,
  metric: MetricInput,
): Promise<void> {
  await db.transaction(async (tx) => {
    const existing = await liveMetrics(tx, exerciseId);
    await insertMetrics(tx, exerciseId, [metric], existing.length);
  });
}

export async function updateMetric(
  metricId: string,
  edits: Partial<Pick<MetricInput, 'name' | 'unit'>>,
): Promise<void> {
  if (Object.values(edits).every((value) => value === undefined)) {
    return;
  }

  await db
    .update(exerciseMetrics)
    .set(edits)
    .where(eq(exerciseMetrics.id, metricId));
}

/**
 * Moves a metric one place. Ordering is what decides the primary metric, so
 * this is how an exercise's logging UI changes.
 */
export async function moveMetric(
  exerciseId: string,
  metricId: string,
  direction: 'up' | 'down',
): Promise<void> {
  await db.transaction(async (tx) => {
    const ordered = await liveMetrics(tx, exerciseId);
    const next = movedOnePlace(ordered, metricId, direction);

    if (!next) {
      return;
    }

    await renumber(ordered, next, (id, displayOrder) =>
      writeOrder(tx, id, displayOrder),
    );
  });
}

/**
 * Soft-deletes a metric and closes the gap behind it, so the remaining
 * `display_order` values stay 0..n-1 and the first is unambiguously primary.
 *
 * Existing `set_metric_values` rows still point here and are untouched. That
 * is the Phase 2 exit criterion: editing metrics never rewrites history.
 */
export async function deleteMetric(
  exerciseId: string,
  metricId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const ordered = await liveMetrics(tx, exerciseId);

    await tx
      .update(exerciseMetrics)
      .set({ deletedAt: Date.now() })
      .where(eq(exerciseMetrics.id, metricId));

    await renumber(
      ordered,
      ordered.filter((metric) => metric.id !== metricId),
      (id, displayOrder) => writeOrder(tx, id, displayOrder),
    );
  });
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function liveMetrics(tx: Transaction, exerciseId: string) {
  return tx
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

async function insertMetrics(
  tx: Transaction,
  exerciseId: string,
  metrics: MetricInput[],
  startAt: number,
): Promise<void> {
  let displayOrder = startAt;

  for (const metric of metrics) {
    await tx.insert(exerciseMetrics).values({
      ...metric,
      exerciseId,
      displayOrder,
    });
    displayOrder += 1;
  }
}

function writeOrder(tx: Transaction, id: string, displayOrder: number) {
  return tx
    .update(exerciseMetrics)
    .set({ displayOrder })
    .where(eq(exerciseMetrics.id, id));
}
