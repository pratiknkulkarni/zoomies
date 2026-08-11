import type { exerciseMetrics } from '@/db/schema';

// Relative, unlike the type import above: `@/` is a tsconfig alias the test
// runner does not resolve, and a type import is erased before it ever tries.
import { describeMeasure } from './metrics';

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
 * How a set says a metric went unrecorded.
 *
 * `omit` drops it. During training that keeps rows scannable, and it is what
 * the session screen wants.
 *
 * `name` says which one: `31s · reps not recorded`. History's job is fidelity,
 * and `10 reps` alone cannot be told apart from `10 reps` with a note that was
 * never written. A bare dash makes the two distinguishable but not readable —
 * `21 · —` means counting positions against the metric list to work out what is
 * missing, which is exactly what a tired reader will not do.
 *
 * Invariant 2 is the rule under all three: never `0` for a value nobody
 * entered.
 */
export type MissingValues = 'omit' | 'dash' | 'name';

/**
 * One logged set as a line: `9 reps · 10 kg`.
 *
 * A metric with no row for this set went unrecorded and is simply absent —
 * writing `0` would claim something the user never said (invariant 2).
 *
 * **A set where nothing at all was recorded still happened, so it says so** —
 * in every mode, not just `omit`. `— · —` and `reps not recorded · hold not
 * recorded` both describe the same set at more length and less clearly than
 * `Recorded` does.
 */
export function formatSetValues(
  metrics: MeasuredMetric[],
  valueByMetric: Map<string, number | null>,
  options?: { missing?: MissingValues },
): string {
  const missing = options?.missing ?? 'omit';

  const parts = measured(metrics)
    .map((metric) => {
      const value = valueByMetric.get(metric.id);

      if (value !== undefined && value !== null) {
        return formatMeasure(value, metric);
      }

      return missing === 'omit'
        ? null
        : missing === 'dash'
          ? '—'
          : `${metric.name.toLowerCase()} not recorded`;
    })
    .filter((part): part is string => part !== null);

  const recorded = measured(metrics).some((metric) => {
    const value = valueByMetric.get(metric.id);
    return value !== undefined && value !== null;
  });

  return recorded && parts.length > 0 ? parts.join(SEPARATOR) : 'Recorded';
}

type MeasuredMetric = MetricLabel & { id: string; type: MetricType };

/**
 * The metrics a value line can speak for.
 *
 * **A note is not a measurement and is never missing from one.** Its text lives
 * in `value_text` while this function reads `value_num`, so a written note was
 * indistinguishable here from one that was never written — invisible while the
 * mode was `omit`, and an outright false statement the moment the mode became
 * `name`. Notes are rendered on their own line by `formatSetNote`.
 */
function measured(metrics: MeasuredMetric[]): MeasuredMetric[] {
  return metrics.filter((metric) => metric.type !== 'notes');
}

/**
 * What a set was annotated with: `grip went first`.
 *
 * Its own line rather than another item on the value line, because a note is
 * prose and the values are figures — `31 s · 12 reps · grip went first` reads
 * as three measurements, one of which is a sentence.
 *
 * Null when nothing was written, so the caller renders no line at all. An
 * unwritten note says nothing and is not worth a `—`: the value line above it
 * already accounts for everything that was measured.
 */
export function formatSetNote(
  metrics: MeasuredMetric[],
  textByMetric: Map<string, string | null>,
): string | null {
  const written = metrics
    .filter((metric) => metric.type === 'notes')
    .map((metric) => textByMetric.get(metric.id)?.trim())
    .filter((text): text is string => !!text);

  return written.length > 0 ? written.join(SEPARATOR) : null;
}

/**
 * How long a session took: `48m`, `1h 12m`, `2h`.
 *
 * Minutes only below an hour, and the minutes dropped when there are none —
 * `1h 00m` reads like a stopwatch, and this is a fact about a past session
 * rather than something counting.
 *
 * Anything under a minute rounds to `1m`. A session that genuinely took
 * seconds is a mistake, and `0m` states it less clearly than the smallest real
 * number does.
 */
export function formatDuration(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/**
 * The day a session happened: `Sat 8 Aug`, or `Sat 8 Aug 2025` once it is not
 * this year.
 *
 * The year is omitted for the current one and shown otherwise. A timeline read
 * every week should not repeat it on every row, but a session from last January
 * must never read as one from this January.
 *
 * `now` is a parameter for the same reason it is one throughout `lib/timers.ts`:
 * a function that reads the clock itself cannot be tested at a year boundary.
 */
export function formatSessionDate(epochMs: number, now = Date.now()): string {
  const date = new Date(epochMs);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();

  const formatted = date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });

  // `en-GB` puts a comma after the weekday only when a year is present, so the
  // two forms would otherwise punctuate differently for no reason the reader
  // could see. The locale is pinned, so this is one known quirk and not a
  // general attempt to reformat arbitrary output.
  return formatted.replace(',', '');
}

/**
 * A number and what it counts: `9 reps`, `30 s`.
 *
 * The unit carries the meaning where there is one; where there is not, the
 * metric's own name is the word — `Reps` stores no unit precisely because
 * "reps" is already what a count of them is called (`lib/metrics.ts`).
 *
 * Shared by logged sets, targets and the raise prompt so the same figure reads
 * the same way wherever it appears.
 *
 * **`bare` is for callers that have already named the metric**, such as the
 * records row, where the name sits in its own label column. The unit survives
 * because it carries meaning the label does not — `42` alone does not say
 * seconds — but the name-as-word fallback is dropped, since repeating it gives
 * `Reps · 12 reps`, and gives `20 · 21 20` for a metric someone named `20`.
 */
export function formatMeasure(
  value: number,
  metric: MetricLabel,
  options?: { bare?: boolean },
): string {
  if (options?.bare) {
    return metric.unit ? `${value} ${metric.unit}` : String(value);
  }

  return `${value} ${metric.unit ?? metric.name.toLowerCase()}`;
}

/**
 * A running timer: `0:30`, `1:05`, `12:00`.
 *
 * Minutes are unpadded and seconds always two digits, so the figure does not
 * change width as it counts and the display stops jittering — it is set in
 * Geist Mono at `display` size (DESIGN.md §6.3), where a shifting digit is very
 * visible.
 *
 * Rounds **up**, so a timer started at 30 seconds reads `0:30` for its first
 * moment rather than flicking to `0:29` immediately, and only reads `0:00` when
 * the time is genuinely gone.
 */
export function formatClock(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
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
 * How many slots in a template already use one exercise: `× 2`.
 *
 * The same exercise may appear more than once — pull-ups to open and again as a
 * finisher — so the picker counts rather than toggling. Absent at zero: a row
 * saying `× 0` would be noise on every exercise not yet chosen.
 */
export function formatSlotTally(count: number): string | undefined {
  return count > 0 ? `× ${count}` : undefined;
}

/**
 * What a plan says: `3 × 8 reps`.
 *
 * Shared by template slots and by the exercise entries they are snapshotted
 * onto, so a session shows the same words the plan did.
 *
 * Every part is nullable and each null means something specific (§5.1). No
 * target sets shows the completed count alone during a session. `No target` is
 * stated rather than omitted, because a blank line would read as "not
 * configured yet" instead of "decided".
 */
export function formatTarget(
  target: { targetSets: number | null; targetValue: number | null },
  metric: MetricLabel | undefined,
): string {
  const measure =
    target.targetValue !== null && metric
      ? formatMeasure(target.targetValue, metric)
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
 * What a metric records, plus its position if that position matters:
 * `Logged first · seconds`.
 *
 * **Not `Primary`, and not the raw type.** `Primary · Duration · s` put three
 * pieces of jargon in a row and told you nothing you could act on. `Logged
 * first` states the consequence — FEATURES.md §4.1 means only that this metric
 * decides the logging UI — and `describeMeasure` says what is stored in the
 * words the metric was chosen with.
 */
export function formatMetricDetail(
  metric: Pick<ExerciseMetricRow, 'type' | 'unit'>,
  isPrimary: boolean,
): string {
  return [isPrimary ? 'Logged first' : undefined, describeMeasure(metric)]
    .filter(Boolean)
    .join(SEPARATOR);
}
