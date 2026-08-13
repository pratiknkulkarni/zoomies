import { addDays, daysBetween, startOfDay, startOfMonth, startOfWeek } from './days';

/**
 * The figures behind Look back (FEATURES.md §11), folded from rows.
 *
 * Pure, and separate from the queries for the reason `lib/records.ts` and
 * `lib/history.ts` are: `db/` imports the client, the client imports
 * `expo-sqlite`, and the test runner cannot open it. Everything a wrong answer
 * would be visible in lives here.
 *
 * **Nothing is stored** (invariant 3). Every figure on this screen is a fold
 * over sets and sessions computed at read time, which is why a corrected set
 * from three weeks ago moves the grid, the counts and the records together.
 *
 * §11.1 is the constraint underneath all of it: reps and seconds do not
 * aggregate, so nothing here adds a hold to a rep. The counts are counts of
 * *events* — days, sessions, quick logs — and the records are per exercise per
 * metric.
 */

// ---------------------------------------------------------------------------
// Days trained
// ---------------------------------------------------------------------------

/** Thirteen weeks: a quarter, and as many columns as fit a phone at this size. */
export const GRID_WEEKS = 13;

/**
 * What one square says.
 *
 * Two of the four are drawn and two are not, and the line between them is
 * whether the day is **inside the record**. `trained` and `rest` are: they
 * happened, the app was keeping count, and one of them has a set in it.
 * `before` and `future` are not — a Thursday that has not arrived is not a
 * Thursday you skipped, and neither is a Tuesday three weeks before you first
 * opened the app. Drawing either as an empty square would report a failure to
 * train at a time nothing was being recorded.
 *
 * They stay separate states rather than one because their reasons are opposite
 * ends of the window, and a renderer that collapsed them would have no way to
 * say so.
 */
export type DayState = 'trained' | 'rest' | 'before' | 'future';

export type GridDay = { dayMs: number; state: DayState };

/** A run of consecutive columns belonging to one month, for the axis. */
export type MonthSpan = { monthMs: number; columns: number };

export type DaysGrid = {
  /** Seven rows, Monday first, each `GRID_WEEKS` entries wide. */
  rows: GridDay[][];
  months: MonthSpan[];
  /**
   * How many leading columns are entirely `before` — undrawn, but occupying
   * their width so the squares never resize. The month axis skips them.
   */
  leading: number;
  /** The first day the grid can show training on, for the range label. */
  fromMs: number;
  /** Today. */
  toMs: number;
};

/**
 * The days-trained grid: one square per day, filled where something was logged.
 *
 * **This is not a streak** (§11.6). It carries no number, marks no current run,
 * and treats a rest day exactly as it treats the day before your first session
 * — as a day. What it answers is §11.2's first question, "am I showing up",
 * which a single figure cannot answer honestly because the shape of a month is
 * the whole content of it.
 *
 * **It is always thirteen columns wide and starts drawing at your first
 * session.** Those are two different things and the difference is the whole of
 * this function. A grid that also *narrowed* to the weeks it had would give
 * week two two columns to fill the screen with, and a square sized by how new
 * you are is a square the width of a thumb — which is what shipped, and what
 * this fixes. So the geometry is fixed at a quarter and the leading columns are
 * simply not drawn: the width is constant, today's column sits at the right
 * edge for good, and nobody is shown a quarter of blank past they never had the
 * chance to fill.
 *
 * Binary, never shaded by volume. §11.1 rules out a combined volume figure
 * across a pull-up and a hold, so an intensity ramp would have to invent the
 * number it shaded by.
 *
 * Null when nothing has ever been logged: there is no range to draw, and an
 * empty quarter is the one thing this must never render.
 */
export function daysTrainedGrid(
  performedAt: number[],
  now: number,
  weeks: number = GRID_WEEKS,
): DaysGrid | null {
  if (performedAt.length === 0) {
    return null;
  }

  const trained = new Set(performedAt.map(startOfDay));
  const today = startOfDay(now);

  const earliest = performedAt.reduce((low, at) => Math.min(low, at), Infinity);

  const lastColumn = startOfWeek(today);
  // Where the grid's width begins, always. Everything left of `firstColumn` is
  // held open and left undrawn.
  const gridStart = addDays(lastColumn, -(weeks - 1) * 7);
  // Where it begins to say anything: the week of the first session, or the far
  // edge once history is longer than the window.
  const firstColumn = Math.max(startOfWeek(earliest), gridStart);

  const leading = Math.floor(daysBetween(gridStart, firstColumn) / 7);

  // The first day drawn, to the day rather than to the week. Starting a Thursday
  // first-timer's grid on the Monday would draw three squares saying they
  // skipped three days they had not yet installed the app for. It leaves the
  // first column ragged at the top, which mirrors the last column being ragged
  // at the bottom for the days still to come.
  const began = Math.max(startOfDay(earliest), gridStart);

  return {
    rows: Array.from({ length: 7 }, (_, row) =>
      Array.from({ length: weeks }, (_, column): GridDay => {
        const dayMs = addDays(gridStart, column * 7 + row);

        return {
          dayMs,
          state:
            dayMs < began
              ? 'before'
              : dayMs > today
                ? 'future'
                : trained.has(dayMs)
                  ? 'trained'
                  : 'rest',
        };
      }),
    ),
    months: monthSpans(firstColumn, weeks - leading),
    leading,
    // The label states what is drawn, not what exists. Where history runs past
    // the cap the grid begins at the cap, and a range naming a first session
    // outside the picture would be describing squares that are not there.
    fromMs: Math.max(firstColumn, startOfDay(earliest)),
    toMs: today,
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
 * given the run it covers, the axis can lay each label out in the space its own
 * month occupies.
 */
function monthSpans(firstColumn: number, columns: number): MonthSpan[] {
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

// ---------------------------------------------------------------------------
// Sessions and quick logs
// ---------------------------------------------------------------------------

export type TrainingCounts = {
  sessions: number;
  quickLogs: number;
  /** The first day counted, for the caption. */
  sinceMs: number;
  /** False while history is younger than the window — say "since 16 Aug". */
  wholeWindow: boolean;
};

/**
 * How much training happened lately, as two counts side by side.
 *
 * **Quick logs are counted and stated separately, never folded in and never
 * hidden.** §11.5 keeps them out of the sessions figure — five evening pull-ups
 * is not a training session, and letting it count would make the number
 * meaningless. Dropping them silently has the opposite failure: a week of
 * doorway sets reads as a week of nothing. Two numbers say both true things.
 *
 * Ad-hoc sessions count as sessions (§11.5). They are training that began
 * without a plan, which is a fact about how they started and not about whether
 * they happened.
 *
 * **Twenty-eight days rather than this week.** A week holds nought to four
 * sessions, so the figure swings between halves and doubles on a Sunday and
 * says nothing either time. Four weeks is short enough to be about now and long
 * enough to be about a habit — and the grid above already draws this week.
 */
export function trainingCounts(
  rows: { completedAt: number | null; isQuickLog: boolean }[],
  now: number,
  windowDays = 28,
): TrainingCounts {
  // Inclusive of today, so 28 days means 28 squares of the grid above.
  const windowStart = addDays(startOfDay(now), -(windowDays - 1));

  let sessions = 0;
  let quickLogs = 0;
  let earliest = Infinity;

  for (const row of rows) {
    if (row.completedAt === null) {
      continue;
    }

    earliest = Math.min(earliest, row.completedAt);

    if (row.completedAt >= windowStart) {
      if (row.isQuickLog) {
        quickLogs += 1;
      } else {
        sessions += 1;
      }
    }
  }

  const first = earliest === Infinity ? windowStart : startOfDay(earliest);
  const wholeWindow = first <= windowStart;

  return {
    sessions,
    quickLogs,
    sinceMs: wholeWindow ? windowStart : first,
    wholeWindow,
  };
}

// ---------------------------------------------------------------------------
// Longest since trained
// ---------------------------------------------------------------------------

export type Neglected = {
  exerciseId: string;
  lastTrainedAt: number;
  days: number;
};

/**
 * What has gone longest without being trained (§11.3), longest first.
 *
 * **Sorted by the gap and stated with the date beside it**, so a movement you
 * deliberately stopped reads as a fact rather than a debt: `Nordic Curl · 6 May
 * · 101 days` is a sentence about the past, where `Nordic Curl — 101 days` in a
 * list headed by an exclamation is a bill.
 *
 * **Never trained is not a long gap.** It has no last date, so it has no number
 * of days, and inventing one from when the exercise was added would be a figure
 * about the library rather than about training (invariant 2). Something added
 * yesterday and not yet done is not neglect.
 *
 * **Nothing under `minDays` appears at all.** The block answers "what am I
 * neglecting", and an exercise trained on Tuesday is not an answer to it — a
 * list that ranked everything by recency would be a leaderboard of the whole
 * library, which is the same object with the meaning removed. A week is the
 * point at which a movement has missed its turn in any program.
 */
export function longestSinceTrained(
  exerciseIds: string[],
  lastTrainedAt: Map<string, number>,
  now: number,
  options?: { minDays?: number; limit?: number },
): Neglected[] {
  const minDays = options?.minDays ?? 7;
  const limit = options?.limit ?? 5;

  return exerciseIds
    .flatMap((exerciseId) => {
      const at = lastTrainedAt.get(exerciseId);

      if (at === undefined) {
        return [];
      }

      const days = daysBetween(at, now);

      return days >= minDays ? [{ exerciseId, lastTrainedAt: at, days }] : [];
    })
    .sort(
      (a, b) =>
        b.days - a.days ||
        a.lastTrainedAt - b.lastTrainedAt ||
        (a.exerciseId < b.exerciseId ? -1 : 1),
    )
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Recent records
// ---------------------------------------------------------------------------

/** One measurement, flattened across every exercise. */
export type RankedRow = {
  exerciseId: string;
  metricId: string;
  setId: string;
  value: number;
  performedAt: number;
};

export type RecentRecord = {
  exerciseId: string;
  metricId: string;
  value: number;
  /** What it beat. Never null — a first-ever set beat nothing. */
  previous: number;
  performedAt: number;
};

/**
 * Records set in the last thirty days (§11.3), newest first.
 *
 * **A record here is an event, not a standing.** The exercise screen answers
 * "what is my best"; this answers §11.2's fourth question, "what did I just
 * achieve", and the two are different objects. So this walks each exercise and
 * metric forward in time and notes the moments where a set beat everything
 * before it — which is what "set a record" means as a sentence about a day.
 *
 * **A first-ever set is not a record.** It is a baseline, and month one would
 * otherwise be a wall of them: every exercise's first set is its best set. That
 * is also why nothing here needs §10.1's tie rule restated — strictly beating
 * what came before it already means an equalled best is not an event.
 *
 * **One per exercise and metric**, the most recent. Three raises on a pull-up
 * in a month is a good month, not three items.
 *
 * The caller filters to rankable metrics, live rows and completed sessions:
 * §10.1's other three rules live in the query, and a null measurement never
 * reaches here because it is not a candidate for anything (invariant 2).
 */
export function recentRecords(
  rows: RankedRow[],
  now: number,
  options?: { windowDays?: number; limit?: number },
): RecentRecord[] {
  const windowDays = options?.windowDays ?? 30;
  const limit = options?.limit ?? 5;
  const windowStart = addDays(startOfDay(now), -(windowDays - 1));

  const groups = new Map<string, RankedRow[]>();

  for (const row of rows) {
    const key = `${row.exerciseId} ${row.metricId}`;
    const held = groups.get(key);

    if (held) {
      held.push(row);
    } else {
      groups.set(key, [row]);
    }
  }

  const found: RecentRecord[] = [];

  for (const group of groups.values()) {
    // Ordered by when it happened, with the set id as the last tiebreak so two
    // sets sharing a timestamp cannot make the answer depend on row order —
    // ids are UUID v7, so the smaller one is the older one.
    const ordered = [...group].sort(
      (a, b) =>
        a.performedAt - b.performedAt || (a.setId < b.setId ? -1 : 1),
    );

    let best: number | undefined;
    let latest: RecentRecord | undefined;

    for (const row of ordered) {
      if (best !== undefined && row.value > best) {
        latest = {
          exerciseId: row.exerciseId,
          metricId: row.metricId,
          value: row.value,
          previous: best,
          performedAt: row.performedAt,
        };
      }

      if (best === undefined || row.value > best) {
        best = row.value;
      }
    }

    if (latest && latest.performedAt >= windowStart) {
      found.push(latest);
    }
  }

  return found
    .sort(
      (a, b) =>
        b.performedAt - a.performedAt ||
        (a.exerciseId < b.exerciseId ? -1 : 1),
    )
    .slice(0, limit);
}
