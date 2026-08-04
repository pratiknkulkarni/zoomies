import type { exerciseMetrics } from '@/db/schema';

type ExerciseMetricRow = typeof exerciseMetrics.$inferSelect;
type MetricType = ExerciseMetricRow['type'];

/**
 * Display formatting. Nothing here decides anything — it turns stored values
 * into what a screen shows, and stays out of `db/`.
 *
 * Each function takes the narrowest shape it needs rather than a whole row, so
 * a test does not have to invent ids and timestamps to check a string.
 *
 * Duration, load and date formatting join this file as the phases that need
 * them land.
 */

/** DESIGN.md §2.4 — the separator between items of metadata in a caption. */
const SEPARATOR = ' · ';

const METRIC_TYPES: Record<MetricType, string> = {
  number: 'Number',
  duration: 'Duration',
  notes: 'Notes',
};

/** Sentence case, per DESIGN.md §2.5. Never Title Case. */
export function formatMetricType(type: MetricType): string {
  return METRIC_TYPES[type];
}

/**
 * What a list row says an exercise records: `Reps · Added load (kg)`.
 *
 * The unit is what carries the meaning — `Hold` on its own does not say
 * seconds — but it is dropped where it only repeats the name, because
 * `Reps (reps)` is noise. Undefined when there are no metrics, so `ListRow`
 * omits the subtitle rather than rendering an empty line.
 */
export function formatMetricSummary(
  metrics: Pick<ExerciseMetricRow, 'name' | 'unit'>[],
): string | undefined {
  if (metrics.length === 0) {
    return undefined;
  }

  return metrics.map(nameWithUnit).join(SEPARATOR);
}

function nameWithUnit({
  name,
  unit,
}: Pick<ExerciseMetricRow, 'name' | 'unit'>): string {
  if (!unit || unit.toLowerCase() === name.toLowerCase()) {
    return name;
  }

  return `${name} (${unit})`;
}

/**
 * What a template row says it contains. Counted at read time from the slots —
 * nothing aggregated is stored (invariant 3).
 */
export function formatSlotCount(count: number): string {
  if (count === 0) {
    return 'No exercises';
  }

  return count === 1 ? '1 exercise' : `${count} exercises`;
}

/**
 * One logged set as a line: `9 reps · 10 kg`.
 *
 * A metric with no row for this set went unrecorded and is simply absent —
 * writing `0` would claim something the user never said (invariant 2). A set
 * where nothing at all was recorded still happened, so it says so.
 */
export function formatSetValues(
  metrics: (MetricLabel & { id: string })[],
  valueByMetric: Map<string, number | null>,
): string {
  const parts = metrics
    .map((metric) => {
      const value = valueByMetric.get(metric.id);
      return value === undefined || value === null
        ? null
        : `${value} ${metric.unit ?? metric.name.toLowerCase()}`;
    })
    .filter((part): part is string => part !== null);

  return parts.length > 0 ? parts.join(SEPARATOR) : 'Recorded';
}

/**
 * The `2 / 4` counter of DESIGN.md §6.4 — the element that solves the original
 * problem, because it says what is outstanding without opening the exercise.
 *
 * With no target there is nothing to be short of, so it counts what was done
 * and stops there. Never `2 / 0`.
 */
export function formatSetCount(done: number, target: number | null): string {
  return target === null ? String(done) : `${done} / ${target}`;
}

/**
 * What an exercise did last time: `8 · 8 · 7 · 6`.
 *
 * A set where this metric went unrecorded shows as `—`, never as zero
 * (invariant 2).
 */
export function formatLastTime(values: (number | null)[]): string {
  return values.map((value) => value ?? '—').join(SEPARATOR);
}

/**
 * What a template slot plans: `3 × 8 reps · 60s rest`.
 *
 * Every part is nullable and each null means something specific (§5.1). No
 * target sets shows the completed count alone during a session; no rest
 * seconds means no timer at all, which is how handstand practice avoids being
 * interrupted. Both are stated rather than omitted, because a blank line would
 * read as "not configured yet" instead of "decided".
 */
export function formatSlotTarget(
  slot: {
    targetSets: number | null;
    targetValue: number | null;
    restSeconds: number | null;
  },
  metric: MetricLabel | undefined,
): string {
  const rest =
    slot.restSeconds === null ? 'No rest timer' : `${slot.restSeconds}s rest`;

  return [formatTarget(slot, metric), rest].join(SEPARATOR);
}

/**
 * The target alone: `3 × 8 reps`.
 *
 * Shared by template slots and by the exercise entries they are snapshotted
 * onto, so a session shows the same words the plan did. An entry has no rest
 * seconds of its own — that stays on the slot, because it is not history.
 */
export function formatTarget(
  target: { targetSets: number | null; targetValue: number | null },
  metric: MetricLabel | undefined,
): string {
  const measure =
    target.targetValue !== null && metric
      ? `${target.targetValue} ${metric.unit ?? metric.name.toLowerCase()}`
      : null;

  if (target.targetSets !== null && measure) {
    return `${target.targetSets} × ${measure}`;
  }
  if (target.targetSets !== null) {
    return target.targetSets === 1 ? '1 set' : `${target.targetSets} sets`;
  }
  return measure ?? 'No target';
}

type MetricLabel = { name: string; unit: string | null };

/**
 * The half of a metric that cannot be edited: `Primary · Duration`.
 *
 * The first metric drives the logging UI (FEATURES.md §4.1), which is worth
 * saying out loud rather than leaving implied by its position. Type is fixed at
 * creation (see `db/mutations/exercises.ts`), so in the editor — where name and
 * unit are fields — this is the whole of what a caption can say.
 */
export function formatMetricRole(
  type: MetricType,
  isPrimary: boolean,
): string {
  return [isPrimary ? 'Primary' : undefined, formatMetricType(type)]
    .filter(Boolean)
    .join(SEPARATOR);
}

/**
 * What a metric's own row says beneath its name where nothing is editable:
 * `Primary · Duration · s`.
 */
export function formatMetricDetail(
  metric: Pick<ExerciseMetricRow, 'type' | 'unit'>,
  isPrimary: boolean,
): string {
  return [formatMetricRole(metric.type, isPrimary), metric.unit ?? undefined]
    .filter(Boolean)
    .join(SEPARATOR);
}
