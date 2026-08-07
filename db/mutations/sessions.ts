import { and, asc, eq, isNull } from 'drizzle-orm';

import { db, type Transaction } from '../client';
import {
  exerciseEntries,
  sessions,
  templateSlots,
  templates,
} from '../schema';

/**
 * Writes for sessions and their exercise entries (FEATURES.md §6).
 *
 * **The snapshot is the point of this file.** A session copies its targets out
 * of the template when it starts and never reads them from the template again.
 * That is invariant 5: editing a template changes the next session, never a
 * past one, and never one already underway.
 *
 * Deletion is soft everywhere except discarding an unfinished session, which is
 * the one place history is genuinely removed — see `discardSession`.
 */

const liveEntry = isNull(exerciseEntries.deletedAt);

// ---------------------------------------------------------------------------
// Starting
// ---------------------------------------------------------------------------

/**
 * Turns a template into a session (§6.1). Slots become entries, and each
 * entry keeps its own copy of `target_sets`, `target_metric_id` and
 * `target_value`.
 *
 * The template's name is copied onto the session so history still reads as
 * `Rings` after the template is renamed or deleted.
 *
 * `template_slot_id` is written alongside the snapshot but is not part of it —
 * it says where the entry came from, so the raise prompt of §6.6 knows which
 * slot a beaten target belongs to. Nothing reads a target through it.
 */
export async function startFromTemplate(templateId: string): Promise<string> {
  return db.transaction(async (tx) => {
    await assertNoActiveSession(tx);

    const [template] = await tx
      .select()
      .from(templates)
      .where(and(isNull(templates.deletedAt), eq(templates.id, templateId)))
      .limit(1);

    if (!template) {
      throw new Error(`No such template: ${templateId}`);
    }

    const slots = await tx
      .select()
      .from(templateSlots)
      .where(
        and(
          isNull(templateSlots.deletedAt),
          eq(templateSlots.templateId, templateId),
        ),
      )
      .orderBy(asc(templateSlots.displayOrder));

    const [session] = await tx
      .insert(sessions)
      .values({
        templateId,
        name: template.name,
        startedAt: Date.now(),
      })
      .returning({ id: sessions.id });

    if (!session) {
      throw new Error(`Failed to start a session from ${template.name}`);
    }

    for (const [index, slot] of slots.entries()) {
      await tx.insert(exerciseEntries).values({
        sessionId: session.id,
        exerciseId: slot.exerciseId,
        displayOrder: index,
        targetSets: slot.targetSets,
        targetMetricId: slot.targetMetricId,
        targetValue: slot.targetValue,
        templateSlotId: slot.id,
        isAdHoc: false,
      });
    }

    return session.id;
  });
}

/** A session with no plan (§6.1). Exercises are added as they are trained. */
export async function startAdHocSession(): Promise<string> {
  return db.transaction(async (tx) => {
    await assertNoActiveSession(tx);

    const [session] = await tx
      .insert(sessions)
      .values({ startedAt: Date.now() })
      .returning({ id: sessions.id });

    if (!session) {
      throw new Error('Failed to start a session');
    }

    return session.id;
  });
}

// ---------------------------------------------------------------------------
// Entries
// ---------------------------------------------------------------------------

/**
 * Pushups on leg day (§6.4). Joins this session only, carries no target, and
 * the template is untouched — which is why `is_ad_hoc` exists rather than the
 * entry simply being one the template did not have.
 */
export async function addEntry(
  sessionId: string,
  exerciseId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: exerciseEntries.id })
      .from(exerciseEntries)
      .where(and(liveEntry, eq(exerciseEntries.sessionId, sessionId)));

    await tx.insert(exerciseEntries).values({
      sessionId,
      exerciseId,
      displayOrder: existing.length,
      isAdHoc: true,
    });
  });
}

/**
 * Changes a target for this session only (§7.4). The template is not touched —
 * a bad night should never silently rewrite the program.
 *
 * This writes the entry's own snapshot, which is exactly what makes the
 * override local: there is no path from here back to the slot.
 */
export async function overrideTarget(
  entryId: string,
  target: { sets: number | null; metricId: string | null; value: number | null },
): Promise<void> {
  // A value without its metric does not say what the number counts, so the
  // pair is written together or not at all — exactly as on a template slot.
  const paired = target.metricId !== null && target.value !== null;

  await db
    .update(exerciseEntries)
    .set({
      targetSets: target.sets,
      targetMetricId: paired ? target.metricId : null,
      targetValue: paired ? target.value : null,
    })
    .where(eq(exerciseEntries.id, entryId));
}

/** One note per entry, not per set (§7.5). */
export async function setEntryNotes(
  entryId: string,
  notes: string | null,
): Promise<void> {
  await db
    .update(exerciseEntries)
    .set({ notes })
    .where(eq(exerciseEntries.id, entryId));
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/**
 * An explicit pause (§6.2). Never automatic — leaving the application is not
 * pausing, because session state lives in SQLite and switching apps changes
 * nothing.
 */
export async function pauseSession(id: string): Promise<void> {
  await db
    .update(sessions)
    .set({ pausedAt: Date.now() })
    .where(and(eq(sessions.id, id), isNull(sessions.pausedAt)));
}

/**
 * Resuming folds the pause into `accumulated_pause_ms`, so session duration
 * stays honest however many times training stopped.
 */
export async function resumeSession(id: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [session] = await tx
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1);

    if (!session?.pausedAt) {
      return;
    }

    await tx
      .update(sessions)
      .set({
        pausedAt: null,
        accumulatedPauseMs:
          session.accumulatedPauseMs + (Date.now() - session.pausedAt),
      })
      .where(eq(sessions.id, id));
  });
}

/**
 * Completion (§6.2). The warnings and the target-raise prompt are Phase 6; this
 * is the write underneath both, and the one the resume prompt's "Complete it
 * now" calls directly.
 *
 * A session paused at the moment it completes has its final pause folded in
 * first, so the duration does not silently lose it.
 */
export async function completeSession(
  id: string,
  notes?: string | null,
): Promise<void> {
  await resumeSession(id);

  await db
    .update(sessions)
    .set({
      completedAt: Date.now(),
      ...(notes === undefined ? {} : { notes }),
    })
    .where(eq(sessions.id, id));
}

/**
 * Throwing away an unfinished session (§6.3) — the one place in the app where
 * data is genuinely deleted rather than soft-deleted.
 *
 * There is no "save and start a new one": an in-progress session is either
 * finished or thrown away, so keeping the rows would leave history containing
 * something the user explicitly discarded. Entries, sets and values go with it
 * through the cascades declared in the schema, which is why `db/client.ts`
 * turns foreign keys on.
 */
export async function discardSession(id: string): Promise<void> {
  await db
    .delete(sessions)
    .where(and(eq(sessions.id, id), isNull(sessions.completedAt)));
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/**
 * §6.2 allows one active session at a time. The UI offers Resume rather than
 * ever reaching this, but a mutation that can silently produce a second active
 * session is a mutation that eventually will.
 */
async function assertNoActiveSession(tx: Transaction): Promise<void> {
  const [active] = await tx
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(
        isNull(sessions.deletedAt),
        isNull(sessions.completedAt),
        eq(sessions.isQuickLog, false),
      ),
    )
    .limit(1);

  if (active) {
    throw new Error(
      'A session is already in progress. Finish or discard it first.',
    );
  }
}
