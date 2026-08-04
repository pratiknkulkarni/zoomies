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
