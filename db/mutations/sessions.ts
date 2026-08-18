import { and, asc, eq, isNull } from 'drizzle-orm';

import { db, type Transaction } from '../client';
import {
  exerciseEntries,
  sessions,
  templateSlots,
  templates,
} from '../schema';
import { logSetIn, type SetValueInput } from './sets';

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
        restSeconds: slot.restSeconds,
        templateSlotId: slot.id,
        isAdHoc: false,
      });
    }

    return session.id;
  });
}

/**
 * Five pull-ups in the evening (§6.1). One exercise, one set, completed on
 * save — no session screen is ever shown.
 *
 * **It produces the same rows a session does**, which is the whole point: a
 * session, an entry and a set, written by the same `logSetIn` the session
 * screen uses. History and analytics downstream get one shape to read rather
 * than three, and `is_quick_log` is the only thing that distinguishes it —
 * needed because §11.5 counts a quick log toward sets, records and
 * days-since-trained but never toward the sessions figure.
 *
 * One transaction, so a force-quit mid-save leaves no session with no set in it.
 *
 * It does not check for an active session. §6.2's one-at-a-time rule is about
 * sessions being trained, and a quick log is over before it starts — which is
 * why `activeSession()` filters them out rather than this asserting against
 * them.
 */
export async function quickLog(
  exerciseId: string,
  values: SetValueInput[],
  toFailure = false,
): Promise<string> {
  return db.transaction(async (tx) => {
    const now = Date.now();

    const [session] = await tx
      .insert(sessions)
      .values({
        // No template and no name — it was not planned and is not a workout
        // with a title. History shows it as what it is.
        startedAt: now,
        completedAt: now,
        isQuickLog: true,
      })
      .returning({ id: sessions.id });

    if (!session) {
      throw new Error('Failed to create a quick log');
    }

    const [entry] = await tx
      .insert(exerciseEntries)
      .values({
        sessionId: session.id,
        exerciseId,
        displayOrder: 0,
        // No target to hit and no slot to raise: nothing planned this.
        isAdHoc: false,
      })
      .returning({ id: exerciseEntries.id });

    if (!entry) {
      throw new Error('Failed to create a quick log entry');
    }

    await logSetIn(tx, entry.id, values, toFailure);

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
      /*
        Rest goes with the target it qualifies, the same way `setSlotPlan`
        clears it — otherwise dropping the target for today would leave a
        countdown still running between sets and no longer shown anywhere,
        since §8.2 hangs both the field and the readout off having a target.
      */
      ...(paired ? {} : { restSeconds: null }),
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
 * The optional session note of §7.5, written from the completion screen.
 *
 * Written as you type rather than on blur, for the reason `setEntryNotes` gives:
 * a focused field never blurs when the screen is left, and six fields lost their
 * edits that way in Phase 4.
 */
export async function setSessionNotes(
  id: string,
  notes: string | null,
): Promise<void> {
  await db.update(sessions).set({ notes }).where(eq(sessions.id, id));
}

/**
 * Completion (§6.2). The warnings and the raise prompt live on the screen that
 * calls this; by the time it runs, every decision has already been written.
 *
 * The note is not a parameter. It belongs to `setSessionNotes` and is on disk
 * before this is reached — one thing that can be lost by a force-quit is
 * enough, and a note typed and then thrown away by a crash on the last tap is
 * the same failure invariant 1 rules out for sets.
 *
 * A session paused at the moment it completes has its final pause folded in
 * first, so the duration does not silently lose it.
 */
export async function completeSession(id: string): Promise<void> {
  await resumeSession(id);

  await db
    .update(sessions)
    .set({ completedAt: Date.now() })
    .where(eq(sessions.id, id));
}

/**
 * Renaming a session from history (§9).
 *
 * The name was copied off the template at start, so changing it here cannot
 * reach the template — which is the same one-way relationship the target
 * snapshot has, for the same reason.
 */
export async function renameSession(id: string, name: string): Promise<void> {
  await db.update(sessions).set({ name }).where(eq(sessions.id, id));
}

/**
 * Removing a session from history (§9) — **soft**.
 *
 * §9 says deleting "removes its entries and sets", and invariant 7 permits only
 * soft delete for user-owned data. Marking the session satisfies both: every
 * read filters on it, including `lastTimeFor`, so the session and everything
 * logged in it leave every surface at once while the rows survive for export.
 *
 * Deliberately **not** `discardSession`, which hard-deletes and refuses a
 * session that finished. Throwing away a session you decided not to keep and
 * removing one from the record are different acts on different data, and one of
 * them is history.
 */
export async function deleteSession(id: string): Promise<void> {
  await db
    .update(sessions)
    .set({ deletedAt: Date.now() })
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
