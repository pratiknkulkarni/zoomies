/**
 * Calendar-day arithmetic.
 *
 * **Days are not milliseconds.** A day is 23 or 25 hours twice a year, and two
 * sessions eighteen hours apart may be on the same day or on consecutive ones.
 * Everything here moves boundaries with `setDate` and `setHours`, which the
 * platform resolves against the local zone, rather than by dividing by
 * 86,400,000 — which invents or swallows a day at every clock change.
 *
 * Extracted from `lib/history.ts`, which had these privately for its gap rules.
 * The dashboard needs the same three (§11), and a second copy is how the
 * timeline and the day grid would come to disagree about which day a 00:30
 * session belongs to.
 */

/** Milliseconds in a day when nothing unusual is happening. See `daysBetween`. */
const NOMINAL_DAY_MS = 86_400_000;

/** Midnight at the start of the day containing `epochMs`, in the local zone. */
export function startOfDay(epochMs: number): number {
  const date = new Date(epochMs);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** The same clock time `days` later. Negative goes back. */
export function addDays(epochMs: number, days: number): number {
  const date = new Date(epochMs);
  date.setDate(date.getDate() + days);
  return date.getTime();
}

/**
 * Midnight on the Monday of the week containing `epochMs`.
 *
 * Monday first because the grid in §11.3 is read as a training week, and a week
 * that begins on Sunday splits every weekend across two columns.
 *
 * `getDay()` is 0 for Sunday, so the shift maps it to 6 and leaves Monday at 0.
 */
export function startOfWeek(epochMs: number): number {
  const day = new Date(startOfDay(epochMs));
  return addDays(day.getTime(), -((day.getDay() + 6) % 7));
}

/** Midnight on the first of the month containing `epochMs`. */
export function startOfMonth(epochMs: number): number {
  const date = new Date(epochMs);
  date.setHours(0, 0, 0, 0);
  date.setDate(1);
  return date.getTime();
}

// ---------------------------------------------------------------------------
// Week columns — the geometry both charts are drawn on
// ---------------------------------------------------------------------------

/**
 * Thirteen weeks: a quarter, and how much time one screen of chart shows.
 *
 * A **floor**, never a cap. It fixes the width of one column — thirteen of them
 * span the screen — and a longer history adds columns of that same width and
 * scrolls. Shared by the day grid (§11.3) and the best-set trend (§10.2) so that
 * a screenful means the same span of time in both, and neither can be denser
 * than the other.
 */
export const WINDOW_WEEKS = 13;

/** A run of consecutive week-columns belonging to one month, for an axis. */
export type MonthSpan = { monthMs: number; columns: number };

export type WeekWindow = {
  /** Midnight on the Monday of the leftmost column. */
  startMs: number;
  /** Columns drawn, at least `minWeeks`. */
  weeks: number;
  /**
   * Columns before the first one with anything in it — held open so the column
   * never resizes, drawn as nothing. Zero once the data is wider than the floor,
   * which is what lets one number serve a young chart and a long one.
   */
  leading: number;
  /** Columns the data itself spans, both ends included. */
  spanned: number;
  /** Midnight on the Monday of the first column with anything in it. */
  firstMs: number;
};

/**
 * The columns a chart is drawn on: one per week, ending on the week of `toMs`.
 *
 * Extracted from `daysTrainedGrid` in Phase 11, when the trend needed the same
 * arithmetic. Both charts anchor their right edge to their most recent week and
 * grow leftwards, which is why `startMs` is derived from `toMs` rather than the
 * other way round — the newest column has a fixed home and history accumulates
 * behind it.
 */
export function weekWindow(
  fromMs: number,
  toMs: number,
  minWeeks: number = WINDOW_WEEKS,
): WeekWindow {
  const firstMs = startOfWeek(fromMs);
  const lastColumn = startOfWeek(toMs);

  // Both ends included: one week of data is one column, not nought. Floored at
  // one so a caller handing these over backwards gets a degenerate chart rather
  // than a negative width.
  const spanned = Math.max(
    1,
    Math.round(daysBetween(firstMs, lastColumn) / 7) + 1,
  );
  const weeks = Math.max(minWeeks, spanned);

  return {
    startMs: addDays(lastColumn, -(weeks - 1) * 7),
    weeks,
    leading: weeks - spanned,
    spanned,
    firstMs,
  };
}

/**
 * Which months the columns fall in, as spans rather than per-column labels.
 *
 * A week is attributed to its Monday's month, so a week straddling the first
 * belongs to the month it started in — one rule, applied once, rather than a
 * boundary drawn through the middle of a column.
 *
 * Spans rather than a label per column because `MAY` is wider than a square:
 * given the run it covers, an axis can lay each label out in the space its own
 * month occupies.
 */
export function monthSpans(firstColumn: number, columns: number): MonthSpan[] {
  const spans: MonthSpan[] = [];

  for (let column = 0; column < columns; column += 1) {
    const monthMs = startOfMonth(addDays(firstColumn, column * 7));
    const open = spans.at(-1);

    if (open && open.monthMs === monthMs) {
      open.columns += 1;
    } else {
      spans.push({ monthMs, columns: 1 });
    }
  }

  return spans;
}

/**
 * Whole days from one to the other, counting calendar boundaries crossed.
 * Negative when `toMs` is the earlier one.
 *
 * Rounded rather than floored. Both ends are snapped to midnight first, so the
 * only thing division can be wrong about is a daylight-saving hour — which
 * makes the quotient 100.96 or 101.04 rather than 101, and never approaches the
 * half-day it would take to change the answer. Stepping a `Date` forward day by
 * day would be exact and would also walk a hundred iterations to say `101`.
 */
export function daysBetween(fromMs: number, toMs: number): number {
  return Math.round((startOfDay(toMs) - startOfDay(fromMs)) / NOMINAL_DAY_MS);
}
