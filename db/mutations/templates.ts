import { and, asc, eq, isNull } from 'drizzle-orm';

import { db, type Transaction } from '../client';
import { templateSlots, templates } from '../schema';
import { movedOnePlace, renumber } from './ordering';

/**
 * Writes for templates and their slots (FEATURES.md §5.2). Components never
 * build a query inline; everything that changes a row goes through here.
 *
 * `updated_at` is not set by hand anywhere below — `$onUpdateFn` on the
 * schema's lifecycle columns applies it to every update.
 *
 * **Nothing here can alter a completed session.** A session snapshots its
 * targets onto `exercise_entries` when it starts, so editing a template is
 * always a statement about future training. That is invariant 5, and it is why
 * these mutations are free to be as destructive as the user asks.
 */

export type SlotTargets = Pick<
  typeof templateSlots.$inferInsert,
  'targetSets' | 'restSeconds'
>;

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

/** Appended to the end of the list — a new template is not a new priority. */
export async function createTemplate(name: string): Promise<string> {
  return db.transaction(async (tx) => {
    const existing = await liveTemplates(tx);

    const [created] = await tx
      .insert(templates)
      .values({ name, displayOrder: existing.length })
      .returning({ id: templates.id });

    if (!created) {
      throw new Error(`Failed to create template: ${name}`);
    }

    return created.id;
  });
}

export async function renameTemplate(id: string, name: string): Promise<void> {
  await db.update(templates).set({ name }).where(eq(templates.id, id));
}

/**
 * Soft delete, taking the slots with it.
 *
 * The opposite call was made for exercises, whose metrics outlive them because
 * logged sets point at those metrics by id. Nothing points at a slot —
 * `exercise_entries` copies the target's value and metric, never the slot — so
 * leaving orphans behind would only make `allSlots` lie.
 */
export async function deleteTemplate(id: string): Promise<void> {
  await db.transaction(async (tx) => {
    const deletedAt = Date.now();

    await tx.update(templates).set({ deletedAt }).where(eq(templates.id, id));
    await tx
      .update(templateSlots)
      .set({ deletedAt })
      .where(and(isNull(templateSlots.deletedAt), eq(templateSlots.templateId, id)));
  });
}

// ---------------------------------------------------------------------------
// Slots
// ---------------------------------------------------------------------------

/**
 * Adds an exercise to the end of a template.
 *
 * `rest_seconds` is left to the schema default of 60 rather than passed. The
 * same exercise can appear twice — a template that opens and closes with ring
 * support holds is a legitimate plan, not a mistake to guard against.
 */
export async function addSlot(
  templateId: string,
  exerciseId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const existing = await liveSlots(tx, templateId);

    await tx.insert(templateSlots).values({
      templateId,
      exerciseId,
      displayOrder: existing.length,
    });
  });
}

/** Soft-deletes a slot and closes the gap behind it. */
export async function removeSlot(
  templateId: string,
  slotId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const ordered = await liveSlots(tx, templateId);

    await tx
      .update(templateSlots)
      .set({ deletedAt: Date.now() })
      .where(eq(templateSlots.id, slotId));

    await renumber(
      ordered,
      ordered.filter((slot) => slot.id !== slotId),
      (id, displayOrder) => writeOrder(tx, id, displayOrder),
    );
  });
}

/** Moves a slot one place. This is the order exercises are trained in. */
export async function moveSlot(
  templateId: string,
  slotId: string,
  direction: 'up' | 'down',
): Promise<void> {
  await db.transaction(async (tx) => {
    const ordered = await liveSlots(tx, templateId);
    const next = movedOnePlace(ordered, slotId, direction);

    if (!next) {
      return;
    }

    await renumber(ordered, next, (id, displayOrder) =>
      writeOrder(tx, id, displayOrder),
    );
  });
}

/**
 * `target_sets` and `rest_seconds`, both nullable and meaning different things
 * when null: no set target, and no rest timer.
 *
 * Passing `null` writes null. Omitting a key leaves it alone. That distinction
 * is the whole point — null is a recorded decision, not an absence.
 */
export async function updateSlot(
  slotId: string,
  edits: Partial<SlotTargets>,
): Promise<void> {
  if (Object.values(edits).every((value) => value === undefined)) {
    return;
  }

  await db.update(templateSlots).set(edits).where(eq(templateSlots.id, slotId));
}

/**
 * The measurement target: 8 reps, or 30 seconds.
 *
 * Metric and value are written together and cleared together, because either
 * alone is meaningless — a value with no metric does not say what 8 counts,
 * and a metric with no value states nothing. Making it one call means they
 * cannot drift apart.
 */
export async function setSlotTarget(
  slotId: string,
  target: { metricId: string; value: number } | null,
): Promise<void> {
  await db
    .update(templateSlots)
    .set({
      targetMetricId: target?.metricId ?? null,
      targetValue: target?.value ?? null,
    })
    .where(eq(templateSlots.id, slotId));
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function liveTemplates(tx: Transaction) {
  return tx
    .select({ id: templates.id })
    .from(templates)
    .where(isNull(templates.deletedAt));
}

function liveSlots(tx: Transaction, templateId: string) {
  return tx
    .select()
    .from(templateSlots)
    .where(
      and(
        isNull(templateSlots.deletedAt),
        eq(templateSlots.templateId, templateId),
      ),
    )
    .orderBy(asc(templateSlots.displayOrder));
}

function writeOrder(tx: Transaction, id: string, displayOrder: number) {
  return tx
    .update(templateSlots)
    .set({ displayOrder })
    .where(eq(templateSlots.id, id));
}
