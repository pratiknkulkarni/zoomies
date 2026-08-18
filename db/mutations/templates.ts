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
 * The same exercise can appear twice — a template that opens and closes with
 * ring support holds is a legitimate plan, not a mistake to guard against
 * (§5.2).
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
 * Everything a slot plans, written as one row (§5.1).
 *
 * The slot screen is a draft (§18), so it saves once rather than per keystroke,
 * and this is the write it makes. Every field is nullable and each null is a
 * recorded decision rather than an absence: no `target_sets` means the session
 * counts what you do with nothing to reach, no target means no measurement to
 * beat, and no `rest_seconds` means no countdown between sets at all.
 *
 * Sets and target used to be two calls, which meant a moment where the row held
 * a new set count against an old target. Nothing read it in that moment, but
 * nothing guaranteed that either.
 */
export async function setSlotPlan(
  slotId: string,
  plan: {
    targetSets: number | null;
    target: { metricId: string; value: number } | null;
    restSeconds: number | null;
  },
): Promise<void> {
  await db
    .update(templateSlots)
    .set({
      targetSets: plan.targetSets,
      targetMetricId: plan.target?.metricId ?? null,
      targetValue: plan.target?.value ?? null,
      /*
        Rest hangs off the target, because §8.2 only offers it once there is
        one — a countdown between sets of nothing measured is a timer with no
        exercise attached. Clearing the target therefore clears the rest with
        it, rather than leaving a figure the slot screen can no longer show.
      */
      restSeconds: plan.target === null ? null : plan.restSeconds,
    })
    .where(eq(templateSlots.id, slotId));
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
