import { and, asc, eq, isNull } from 'drizzle-orm';

import { db, type Transaction } from '../client';
import { exerciseMetrics, exercises, setMetricValues } from '../schema';
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
 * Appends a metric. §4.1 puts a soft cap of four per exercise, which the four
 * presets in `lib/metrics.ts` now give a natural ceiling.
 *
 * What it measures can still be changed afterwards, but only until something is
 * logged against it — see `convertMetric`.
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

/**
 * Renames a metric. Only the label — `type` and `unit` decide what the stored
 * numbers mean and move together through `convertMetric`.
 */
export async function updateMetric(
  metricId: string,
  edits: Pick<MetricInput, 'name'>,
): Promise<void> {
  await db
    .update(exerciseMetrics)
    .set(edits)
    .where(eq(exerciseMetrics.id, metricId));
}

/**
 * Changes what a metric measures — reps to a hold, a count to added load.
 *
 * **Refused once anything has been logged against it.** `set_metric_values`
 * stores a bare number; the metric's `type` and `unit` are the only record of
 * what it meant. Converting afterwards would turn a 30-second hold into 30kg
 * across every set silently, which is the one thing this schema exists to
 * prevent.
 *
 * Before the first set there is nothing to reinterpret, so a metric chosen
 * wrongly a minute ago is simply fixed. The check runs inside the transaction
 * rather than only in the editor: the UI hides the control, but a mutation that
 * can rewrite history must not depend on a screen having been drawn correctly.
 *
 * Returns whether it converted, so a caller can say why nothing happened.
 * Soft-deleted values count — see `metricsWithValues`.
 */
export async function convertMetric(
  metricId: string,
  preset: Pick<MetricInput, 'name' | 'type' | 'unit'>,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const logged = await tx
      .select({ id: setMetricValues.id })
      .from(setMetricValues)
      .where(eq(setMetricValues.exerciseMetricId, metricId))
      .limit(1);

    if (logged.length > 0) {
      return false;
    }

    /*
      And refused if the exercise already records that.

      `addMetric` is offered only the presets an exercise is missing, so a
      duplicate was unreachable that way — but converting was offered all of
      them. Reps and Notes, open Notes, tap `Reps`, and the exercise records
      reps twice and logs two identical fields. Three taps.

      The check is here rather than only in the editor for the same reason the
      one above it is: a mutation that can put an exercise into a state no
      screen knows how to draw must not depend on a screen having been drawn
      correctly. Identity is `(type, unit)`, never the name — §4.1, and the
      same pair `presetFor` matches on.
    */
    const [current] = await tx
      .select({ exerciseId: exerciseMetrics.exerciseId })
      .from(exerciseMetrics)
      .where(eq(exerciseMetrics.id, metricId))
      .limit(1);

    if (!current) {
      return false;
    }

    const siblings = await liveMetrics(tx, current.exerciseId);

    const taken = siblings.some(
      (metric) =>
        metric.id !== metricId &&
        metric.type === preset.type &&
        metric.unit === preset.unit,
    );

    if (taken) {
      return false;
    }

    await tx
      .update(exerciseMetrics)
      .set({ name: preset.name, type: preset.type, unit: preset.unit })
      .where(eq(exerciseMetrics.id, metricId));

    return true;
  });
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
