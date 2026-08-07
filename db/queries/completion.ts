import { and, eq, inArray, isNull } from 'drizzle-orm';

import { beatenOn, bestValue } from '@/lib/completion';
import { db } from '../client';
import {
  exerciseEntries,
  exerciseMetrics,
  exercises,
  setMetricValues,
  sets,
  templateSlots,
} from '../schema';

/**
 * What the completion screen asks about (FEATURES.md §6.5, §6.6).
 *
 * **Read once, not live.** The session is about to finish and nothing else is
 * writing it, so subscribing would buy nothing and would re-run the whole
 * review on every keystroke in the session note. Same reasoning `lastTimeFor`
 * already gives.
 *
 * Nothing here is aggregated in the database (invariant 3) — the counts and the
 * best value are computed from rows at read time, every time.
 */

/** An exercise that was planned and never trained. */
export type UntrainedEntry = {
  entryId: string;
  name: string;
};

/** A target beaten well enough to offer raising (§6.6). */
export type TargetRaise = {
  entryId: string;
  slotId: string;
  name: string;
  metric: { name: string; unit: string | null };
  /** What was trained against — the entry's snapshot, override included. */
  target: number;
  /** What the slot currently says, which is what would change. */
  slotTarget: number;
  /** The best set, and what Raise writes. */
  best: number;
};

export type CompletionReview = {
  untrained: UntrainedEntry[];
  raises: TargetRaise[];
};

export async function completionReview(
  sessionId: string,
): Promise<CompletionReview> {
  const entries = await db
    .select({
      id: exerciseEntries.id,
      name: exercises.name,
      targetMetricId: exerciseEntries.targetMetricId,
      targetValue: exerciseEntries.targetValue,
      slotId: exerciseEntries.templateSlotId,
    })
    .from(exerciseEntries)
    .innerJoin(exercises, eq(exercises.id, exerciseEntries.exerciseId))
    .where(
      and(
        isNull(exerciseEntries.deletedAt),
        eq(exerciseEntries.sessionId, sessionId),
      ),
    )
    .orderBy(exerciseEntries.displayOrder);

  if (entries.length === 0) {
    return { untrained: [], raises: [] };
  }

  const performed = await db
    .select({ id: sets.id, entryId: sets.exerciseEntryId })
    .from(sets)
    .where(
      and(
        isNull(sets.deletedAt),
        inArray(
          sets.exerciseEntryId,
          entries.map((entry) => entry.id),
        ),
      ),
    )
    .orderBy(sets.setIndex);

  const setsByEntry = new Map<string, string[]>();

  for (const row of performed) {
    const existing = setsByEntry.get(row.entryId);
    if (existing) {
      existing.push(row.id);
    } else {
      setsByEntry.set(row.entryId, [row.id]);
    }
  }

  // §6.5 — zero sets, and only zero. An exercise merely short of its target was
  // very likely cut on purpose, and nagging about that is how a warning stops
  // being read at all.
  const untrained = entries
    .filter((entry) => (setsByEntry.get(entry.id)?.length ?? 0) === 0)
    .map((entry) => ({ entryId: entry.id, name: entry.name }));

  const raises = await collectRaises(entries, setsByEntry);

  return { untrained, raises };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

type ReviewEntry = {
  id: string;
  name: string;
  targetMetricId: string | null;
  targetValue: number | null;
  slotId: string | null;
};

/**
 * The raise prompt is offered only when every one of these holds. Each is a
 * different way of the offer being meaningless rather than merely unlikely, so
 * they are checked rather than ranked.
 */
async function collectRaises(
  entries: ReviewEntry[],
  setsByEntry: Map<string, string[]>,
): Promise<TargetRaise[]> {
  const candidates = entries.filter(
    (
      entry,
    ): entry is ReviewEntry & {
      targetMetricId: string;
      targetValue: number;
      slotId: string;
    } =>
      // Nothing to raise: an ad-hoc exercise, an ad-hoc session or a quick log.
      entry.slotId !== null &&
      // A target of nothing cannot be beaten.
      entry.targetMetricId !== null &&
      entry.targetValue !== null &&
      (setsByEntry.get(entry.id)?.length ?? 0) > 0,
  );

  if (candidates.length === 0) {
    return [];
  }

  const slots = await db
    .select({
      id: templateSlots.id,
      targetValue: templateSlots.targetValue,
      targetMetricId: templateSlots.targetMetricId,
    })
    .from(templateSlots)
    .where(
      and(
        isNull(templateSlots.deletedAt),
        inArray(
          templateSlots.id,
          candidates.map((entry) => entry.slotId),
        ),
      ),
    );

  const slotById = new Map(slots.map((slot) => [slot.id, slot]));

  const metrics = await db
    .select({
      id: exerciseMetrics.id,
      name: exerciseMetrics.name,
      unit: exerciseMetrics.unit,
    })
    .from(exerciseMetrics)
    .where(
      inArray(
        exerciseMetrics.id,
        candidates.map((entry) => entry.targetMetricId),
      ),
    );

  const metricById = new Map(metrics.map((metric) => [metric.id, metric]));

  const values = await db
    .select({
      setId: setMetricValues.setId,
      metricId: setMetricValues.exerciseMetricId,
      valueNum: setMetricValues.valueNum,
    })
    .from(setMetricValues)
    .where(
      and(
        isNull(setMetricValues.deletedAt),
        inArray(
          setMetricValues.setId,
          candidates.flatMap((entry) => setsByEntry.get(entry.id) ?? []),
        ),
      ),
    );

  const valueBySetAndMetric = new Map(
    values.map((value) => [`${value.setId}:${value.metricId}`, value.valueNum]),
  );

  const raises: TargetRaise[] = [];

  for (const entry of candidates) {
    const slot = slotById.get(entry.slotId);
    const metric = metricById.get(entry.targetMetricId);

    // The slot was removed from the template since the session started, or the
    // metric was deleted from the exercise. Either way there is nowhere to
    // write, and offering would be a button that does nothing.
    if (!slot || !metric) {
      continue;
    }

    /**
     * Ordered as performed, with `null` for a set where the target's metric
     * went unrecorded — `beatenOn` needs the shape, because a set that happened
     * but was not measured still counts toward the majority.
     */
    const logged = (setsByEntry.get(entry.id) ?? []).map(
      (setId) =>
        valueBySetAndMetric.get(`${setId}:${entry.targetMetricId}`) ?? null,
    );

    if (!beatenOn(logged, entry.targetValue)) {
      continue;
    }

    const best = bestValue(logged);

    /**
     * **A raise may never be a lowering.**
     *
     * `entry.targetValue` is what was trained against, override included
     * (§7.4). Someone who dropped a target to 8 for a bad night and then hit 10
     * has genuinely beaten it — but if the template still says 12, writing 10
     * would quietly cut the program on the strength of a good session against
     * an easier bar. The slot's own figure is the one that has to be beaten
     * before anything is offered.
     *
     * This also covers the slot having been raised by hand mid-session.
     */
    if (best === null || slot.targetValue === null || best <= slot.targetValue) {
      continue;
    }

    // The slot's target counts something else now, so raising it would write
    // seconds into a rep target.
    if (slot.targetMetricId !== entry.targetMetricId) {
      continue;
    }

    raises.push({
      entryId: entry.id,
      slotId: slot.id,
      name: entry.name,
      metric,
      target: entry.targetValue,
      slotTarget: slot.targetValue,
      best,
    });
  }

  return raises;
}
