import type { exerciseMetrics } from '@/db/schema';

type MetricType = (typeof exerciseMetrics.$inferSelect)['type'];

/**
 * The units that exist by default, per metric type.
 *
 * **Not derived from the data.** An earlier version offered `SELECT DISTINCT
 * unit`, which meant every typo ever made became a permanent suggestion and the
 * next typo joined it — `rep`, `reps`, `s` and `secund` all sat in the same
 * list. A list built from the table can only ever be as clean as the table.
 *
 * Anything the user creates deliberately still persists and is offered
 * afterwards, because a unit lives on the metric that uses it. What changed is
 * that creating one is now an explicit act rather than a side effect of
 * mistyping.
 *
 * Scoped by type so a duration cannot be measured in kilograms — CLAUDE.md
 * invariant 9 fixes the vocabulary at kg and seconds, and FEATURES.md §4.1
 * agrees. Anything beyond those two is a deliberate addition.
 *
 * **A count has no unit.** `Reps` is the metric's name, so a `reps` unit
 * underneath says the same word twice — which is exactly how it read on screen.
 * Both `formatSetValues` and `formatTarget` fall back to the metric name when
 * the unit is null, so a set still reads `9 reps` with nothing stored.
 */
const CANONICAL: Record<MetricType, string[]> = {
  number: ['kg'],
  duration: ['s'],
  notes: [],
};

/**
 * What the unit picker offers for a metric of this type: the canonical units
 * first, then anything already in use that is not one of them.
 *
 * Order matters — the common answer should not be below a custom one.
 */
export function unitsFor(type: MetricType, inUse: string[]): string[] {
  const canonical = CANONICAL[type];
  const extra = inUse.filter((unit) => !canonical.includes(unit));

  return [...canonical, ...extra];
}
