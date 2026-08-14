import {
  daysBetween,
  monthSpans,
  startOfDay,
  weekWindow,
  WINDOW_WEEKS,
  type MonthSpan,
} from './days';

/**
 * The best-set trend (FEATURES.md §10.2), folded from rows.
 *
 * Pure, and separate from the queries for the same reason `lib/records.ts` is:
 * `db/` imports the client, the client imports `expo-sqlite`, and the runner
 * cannot open it. The screen already reads every set and every value it needs
 * for §10's other blocks, so this adds no query at all — it is a second reading
 * of rows that are already on the screen.
 *
 * **Nothing is stored** (invariant 3). The chart is a fold every time it is
 * drawn, which is why correcting a set from history moves the dot.
 *
 * The scaling and the per-session fold are the two things worth being wrong
 * about, so they live here where a fixture is three lines. The component only
 * positions what this returns.
 */

/** What the trend needs from a set. Deliberately not the whole row. */
export type TrendSet = {
  id: string;
  sessionId: string;
  performedAt: number;
};

/** What it needs from a measurement. */
export type TrendValue = {
  setId: string;
  exerciseMetricId: string;
  valueNum: number | null;
};

export type TrendPoint = {
  sessionId: string;
  /** The best measurement recorded in that session. */
  value: number;
  /** Midnight on the day it happened. */
  atMs: number;
  /** Where it sits across the drawn window: 0 at the left edge, 1 at the right. */
  x: number;
  /** Where it sits up the range: 0 at `min`, 1 at `max`. */
  y: number;
};

export type Trend = {
  /** One per session, oldest first. */
  points: TrendPoint[];
  /** The all-time low and high, which are the only two axis labels. */
  min: number;
  max: number;
  /** Columns of one week each, at least `WINDOW_WEEKS`. */
  weeks: number;
  /** Undrawn leading columns, holding their width. Zero past the floor. */
  leading: number;
  months: MonthSpan[];
  /** The first and last days drawn on, for a caption. */
  fromMs: number;
  toMs: number;
};

/**
 * One dot per session, at the best set of that session.
 *
 * **Dots, never a line.** A line joining two sessions three weeks apart draws
 * training that did not happen, and refusing to is the whole argument for the
 * shape. It is also why `points` carries `x` rather than an index: dots spaced
 * one per session would make a three-week gap look exactly like three
 * consecutive days, which is the same lie by another route.
 *
 * **The best of each session, not every set.** One point per session means the
 * density of the picture says how often you trained, at the same time as the
 * height says how well — and sixty-three dots for eighteen sessions would say
 * neither.
 *
 * **The window ends on the last session, not on today.** The day grid ends on
 * today because §11.2's question is "am I showing up", and empty columns to the
 * right of the last one are the answer. This asks whether a movement is going
 * anywhere, and a movement you stopped three months ago would otherwise open on
 * a screen of blank with the training off to the left. *When* you last did it is
 * already stated immediately above this, as `Last trained`.
 *
 * **Null when nothing ranks.** No sets, no recorded values for this metric, or a
 * metric that is not rankable at all — §10.1 gives `notes` no ordering. The
 * caller draws nothing rather than an empty pair of axes.
 *
 * Order-independent: the same rows shuffled produce the same chart.
 */
export function bestSetTrend(
  sets: TrendSet[],
  values: TrendValue[],
  metricId: string,
  minWeeks: number = WINDOW_WEEKS,
): Trend | null {
  const setById = new Map(sets.map((set) => [set.id, set]));

  /** Best value per session, and the earliest day it was measured on. */
  const bySession = new Map<string, { value: number; atMs: number }>();

  for (const value of values) {
    // Invariant 2: an unrecorded rep is not a zero-rep set, and a chart that
    // plotted it at the bottom of the range would be drawing a bad session that
    // never happened.
    if (value.valueNum === null || value.exerciseMetricId !== metricId) {
      continue;
    }

    const set = setById.get(value.setId);
    if (!set) {
      continue;
    }

    const atMs = startOfDay(set.performedAt);
    const held = bySession.get(set.sessionId);

    if (!held) {
      bySession.set(set.sessionId, { value: value.valueNum, atMs });
      continue;
    }

    // The best of the session, on the earliest day any of it was measured. The
    // two are tracked apart on purpose: a session that ran past midnight should
    // sit on the day it started, whichever set turned out to be the best one.
    held.value = Math.max(held.value, value.valueNum);
    held.atMs = Math.min(held.atMs, atMs);
  }

  if (bySession.size === 0) {
    return null;
  }

  const found = [...bySession.entries()]
    .map(([sessionId, best]) => ({ sessionId, ...best }))
    // Oldest first, with the session id as the last tiebreak so two sessions on
    // one day cannot make the order depend on which row was read first — ids are
    // UUID v7, so the smaller one is the older one.
    .sort((a, b) => a.atMs - b.atMs || (a.sessionId < b.sessionId ? -1 : 1));

  const first = found[0];
  const last = found.at(-1);

  // Unreachable — `bySession` is non-empty above. `noUncheckedIndexedAccess`
  // cannot see that, and narrowing is cheaper than asserting.
  if (!first || !last) {
    return null;
  }

  const bests = found.map((point) => point.value);
  const min = Math.min(...bests);
  const max = Math.max(...bests);

  const window = weekWindow(first.atMs, last.atMs, minWeeks);

  // The window covers whole weeks, so its last day is six days after the Monday
  // of its last column. Minus one because both ends are drawn *on* the chart:
  // day zero sits at the left edge and the last day at the right.
  const days = window.weeks * 7 - 1;

  return {
    points: found.map((point) => ({
      sessionId: point.sessionId,
      value: point.value,
      atMs: point.atMs,
      x: daysBetween(window.startMs, point.atMs) / days,
      /*
        A flat history is centred rather than divided by nothing. One session,
        or five sessions all of ten reps, has a range of zero — and every
        answer to "where in the range" is equally true, so the middle is the
        one that does not imply the dots are at a high or a low.
      */
      y: max === min ? 0.5 : (point.value - min) / (max - min),
    })),
    min,
    max,
    weeks: window.weeks,
    leading: window.leading,
    months: monthSpans(window.firstMs, window.spanned),
    fromMs: first.atMs,
    toMs: last.atMs,
  };
}
