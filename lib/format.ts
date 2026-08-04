import type { exerciseMetrics } from '@/db/schema';

type MetricType = (typeof exerciseMetrics.$inferSelect)['type'];

/**
 * Display formatting. Nothing here decides anything — it turns stored values
 * into what a screen shows, and stays out of `db/`.
 *
 * Duration, load and date formatting join this file as the phases that need
 * them land.
 */

const METRIC_TYPES: Record<MetricType, string> = {
  number: 'Number',
  duration: 'Duration',
  notes: 'Notes',
};

/** Sentence case, per DESIGN.md §2.5. Never Title Case. */
export function formatMetricType(type: MetricType): string {
  return METRIC_TYPES[type];
}
