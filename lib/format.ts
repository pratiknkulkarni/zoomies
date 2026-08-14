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
 * What a plan is, on one line: `4 exercises · 14 sets · last run 9 Aug`.
 *
 * The set count is what the plan **asks for**, summed from the slots, not what
 * any session did. A slot with no target sets contributes nothing to it (§5.1
 * — null means "as many as you do"), so a plan made entirely of those says only
 * how many exercises it holds rather than claiming a total it does not have.
 *
 * `never run` is stated rather than omitted. A plan built and not yet used is a
 * common and temporary state, and a blank there reads as missing data.
 */
export function formatPlanSummary(
  exercises: number,
  targetSets: number,
  lastRunAt: number | null,
): string {
  return [
    formatSlotCount(exercises),
    targetSets === 0 ? null : targetSets === 1 ? '1 set' : `${targetSets} sets`,
    lastRunAt === null ? 'never run' : `last run ${formatSessionDate(lastRunAt)}`,
  ]
    .filter(Boolean)
    .join(SEPARATOR);
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
 * A stretch of days: `9 Aug`, `8–11 Aug`, `28 Jul – 3 Aug`.
 *
 * The month is stated once where both ends share it, because `8 Aug–11 Aug`
 * repeats a word the reader has already had. Where they differ both are needed,
 * and the range gets spaces around its dash — the parts are long enough that a
 * tight dash stops reading as one span.
 *
 * No year. This appears between two dated rows, which carry it if it matters.
 */
export function formatDayRange(fromMs: number, toMs: number): string {
  const from = new Date(fromMs);
  const to = new Date(toMs);

  const month = (date: Date) =>
    date.toLocaleDateString('en-GB', { month: 'short' });

  if (fromMs === toMs) {
    return formatShortDate(fromMs);
  }
  if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
    return `${from.getDate()}–${to.getDate()} ${month(to)}`;
  }
  return `${from.getDate()} ${month(from)} – ${to.getDate()} ${month(to)}`;
}

/**
 * One day, without its weekday: `6 May`.
 *
 * `formatSessionDate` leads with `Sat` because a session is an occasion and
 * which day of the week it fell on is part of reading a timeline. A date beside
 * a figure is not — `Nordic Curl · Wed 6 May · 101 days` puts three facts where
 * two were asked for, and the weekday is the one nobody wanted.
 *
 * No year, like the range it backs. Where a date is old enough for that to
 * matter the figure beside it already says so: `101 days` is the fact, and the
 * date is where it started.
 */
export function formatShortDate(epochMs: number): string {
  const date = new Date(epochMs);

  return `${date.getDate()} ${date.toLocaleDateString('en-GB', {
    month: 'short',
  })}`;
}

/**
 * The month under a column of the day grid: `May`.
 *
 * Rendered uppercase by the label treatment (DESIGN.md §2.4), not here — the
 * source stays sentence case (§2.5) so nothing downstream has to undo it.
 */
/**
 * `Aug 2026` — the heading a month of the timeline sits under.
 *
 * The year is always present, never dropped for the current one. A list this
 * long is read by scrolling into the past, and `Aug` alone at the top of a
 * screen is only unambiguous to someone who already knows how far down they
 * are — which is the thing the heading exists to tell them.
 */
export function formatMonthYear(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
  });
}

export function formatMonth(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString('en-GB', { month: 'short' });
}

/**
 * What a count covers: `last 28 days`, or `since 16 Aug`.
 *
 * **A window wider than the history is a lie about the history.** `4 sessions,
 * last 28 days` in week one states twenty-four days of nothing that never
 * happened — the app did not exist for them. Once training runs past the window
 * the fixed phrase is the honest one, and it is also the one that lets two
 * readings a month apart be compared.
 */
export function formatTrainingWindow(
  sinceMs: number,
  wholeWindow: boolean,
  windowDays: number,
): string {
  return wholeWindow
    ? `last ${windowDays} days`
    : `since ${formatShortDate(sinceMs)}`;
}

/**
 * When a movement was last trained and how long ago: `6 May · 101 days`.
 *
 * Both, never one. The figure alone is a debt — it counts up and nothing about
 * it says the number was ever chosen. The date makes it a fact about a decision
 * that may have been deliberate, which is the difference between a list you can
 * read and a list that nags (§11.6).
 */
export function formatLastTrained(lastTrainedAt: number, days: number): string {
  return `${formatShortDate(lastTrainedAt)}${SEPARATOR}${
    days === 1 ? '1 day' : `${days} days`
  }`;
}

/**
 * When a session ran: `18:42–19:30`.
 *
 * Beside the date and the duration this answers a question neither of them
 * does — whether that was a morning session or an evening one, which is most of
 * what distinguishes two sessions on the same day.
 *
 * Null while a session is unfinished. A range with one end missing would have
 * to invent the other, and `18:42–now` is not a fact about the past.
 *
 * 24-hour, from the pinned `en-GB` locale rather than the device's, so the
 * figure is the same width in every row (`DESIGN.md` §2.1 wants columns of
 * numbers that do not jitter).
 */
export function formatTimeRange(
  startedAt: number,
  completedAt: number | null,
): string | null {
  if (completedAt === null) {
    return null;
  }

  return `${clockTime(startedAt)}–${clockTime(completedAt)}`;
}

function clockTime(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
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
 * One metric across a session's sets: `10 · 9 · 9 · 7`, `31 s · 42 s · 38 s`.
 *
 * `formatLastTime` with the unit attached. Unrecorded stays `—` for the same
 * reason: a set where this metric went unmeasured did not score zero.
 *
 * The unit repeats on every figure rather than sitting once at the end. `31 ·
 * 42 · 38 s` reads as three numbers with a stray letter, and the column is
 * mono, so the repetition costs alignment nothing.
 */
export function formatSetSeries(
  values: (number | null)[],
  metric: MetricLabel,
): string {
  return values
    .map((value) =>
      value === null ? '—' : formatMeasure(value, metric, { bare: true }),
    )
    .join(SEPARATOR);
}

/**
 * What an exercise measures, in the words it was chosen with: `records
 * seconds, reps`.
 *
 * In metric order, so the first named is the one logged first — the ordering
 * §4.1 gives meaning to. Undefined where an exercise records nothing, so the
 * caller omits the phrase rather than printing `records`.
 *
 * A duration says `seconds` rather than `s`: this is a sentence about the
 * exercise, and a unit symbol inside prose reads as an abbreviation of the
 * wrong word.
 */
export function formatRecordsWhat(
  metrics: Pick<ExerciseMetricRow, 'name' | 'type'>[],
): string | undefined {
  const what = formatMeasures(metrics);
  return what && `records ${what}`;
}

/**
 * The same list without the verb: `seconds, reps`.
 *
 * The library puts this on every row, where `records` on twenty rows is a word
 * the reader stops seeing. The exercise's own screen writes the sentence.
 */
export function formatMeasures(
  metrics: Pick<ExerciseMetricRow, 'name' | 'type'>[],
): string | undefined {
  if (metrics.length === 0) {
    return undefined;
  }

  return metrics
    .map((metric) =>
      metric.type === 'duration'
        ? 'seconds'
        : metric.type === 'notes'
          ? 'notes'
          : metric.name.toLowerCase(),
    )
    .join(', ');
}

/**
 * How much of an exercise there is: `63 sets over 18 sessions`.
 *
 * Both figures are counts of rows read at the moment they are shown; neither is
 * stored (invariant 3). Undefined at zero — `0 sets over 0 sessions` is a
 * sentence about nothing, and the screen says `never trained` instead.
 */
export function formatVolume(
  sets: number,
  sessions: number,
): string | undefined {
  if (sets === 0) {
    return undefined;
  }

  const setPart = sets === 1 ? '1 set' : `${sets} sets`;
  const sessionPart = sessions === 1 ? '1 session' : `${sessions} sessions`;

  return `${setPart} over ${sessionPart}`;
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
