import type { exerciseMetrics } from '@/db/schema';

type MetricRow = typeof exerciseMetrics.$inferSelect;
type MetricType = MetricRow['type'];

/** What a metric records. `name` is a label and is editable afterwards. */
export type MetricPreset = {
  key: string;
  name: string;
  type: MetricType;
  unit: string | null;
  /** One phrase for the choice list — what this measures, in plain words. */
  measure: string;
};

/**
 * The three things an exercise can record.
 *
 * **Name, type and unit arrive together and are never composed by hand.** The
 * screen used to offer all three as separate fields, which asked the user to
 * know that a count is a `number` with no unit while a load is a `number` with
 * `kg` — and got them "reps measured in kilograms", because `number` covered two
 * unrelated things and the unit list could only be scoped to the type. Choosing
 * a whole metric instead makes that combination unreachable rather than merely
 * discouraged.
 *
 * FEATURES.md §15 cut a custom metric registry as "an entire CRUD surface for
 * one user". This list is what remains.
 *
 * **Added load was removed** (§15) — bodyweight training is what this app is
 * for, and a weighted variant can be its own exercise. Restoring it is one row
 * here plus a preset entry, not a rebuild: nothing was deleted, existing load
 * metrics were soft-deleted by migration 0004, and their logged values are
 * still on disk.
 */
export const METRIC_PRESETS: MetricPreset[] = [
  { key: 'reps', name: 'Reps', type: 'number', unit: null, measure: 'a count' },
  { key: 'hold', name: 'Hold', type: 'duration', unit: 's', measure: 'seconds' },
  { key: 'notes', name: 'Notes', type: 'notes', unit: null, measure: 'text' },
];

/** Falls back to the type for anything the presets do not cover. */
const TYPE_NAMES: Record<MetricType, string> = {
  number: 'a number',
  duration: 'seconds',
  notes: 'text',
};

/**
 * Which preset a metric already matches, so its row can show the current
 * choice as selected.
 *
 * **Identity is the `(type, unit)` pair, never the name.** A metric renamed to
 * `Hold (left)` still records seconds, and a metric renamed to `Reps` while
 * holding `kg` still records kilograms — the name is a label and says nothing
 * about what is stored.
 */
export function presetFor(
  metric: Pick<MetricRow, 'type' | 'unit'>,
): MetricPreset | undefined {
  return METRIC_PRESETS.find(
    (preset) => preset.type === metric.type && preset.unit === metric.unit,
  );
}

/**
 * What an existing metric records, for the caption beneath its name.
 *
 * Migrated rows may hold a unit no preset knows about, so this describes them
 * rather than claiming they are invalid.
 */
export function describeMeasure(
  metric: Pick<MetricRow, 'type' | 'unit'>,
): string {
  const preset = presetFor(metric);

  if (preset) {
    return preset.measure;
  }

  return metric.unit ? `${TYPE_NAMES[metric.type]} in ${metric.unit}` : TYPE_NAMES[metric.type];
}

/** The presets an exercise does not already record, for the add list. */
export function presetsNotOn(
  metrics: Pick<MetricRow, 'type' | 'unit'>[],
): MetricPreset[] {
  return METRIC_PRESETS.filter(
    (preset) => !metrics.some((metric) => presetFor(metric)?.key === preset.key),
  );
}
