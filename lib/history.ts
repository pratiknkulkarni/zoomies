import { addDays, startOfDay } from './days';

/**
 * Figures derived from a session, computed at read time (FEATURES.md §9).
 *
 * Pure, and separate from `db/queries/history.ts` for the reason
 * `lib/completion.ts` is separate from its query: the runner cannot open
 * `expo-sqlite`, so anything living beside a query is untestable. Session
 * length is this phase's second exit criterion, which makes it exactly the
 * thing that should not be inlined into a component.
 */

type SessionTiming = {
  startedAt: number;
  completedAt: number | null;
  accumulatedPauseMs: number;
};

/**
 * How long a session actually took.
 *
 * `completed_at − started_at − accumulated_pause_ms`. Pausing is an explicit
 * statement that training stopped (§6.2), so the time it covers is not training
 * time — a duration that counted it would be a lie told by arithmetic, and the
 * longer the break the bigger the lie.
 *
 * A pause still open at completion is folded in by `completeSession`, which
 * resumes before it writes, so `paused_at` never needs consulting here.
 *
 * **Null while a session is unfinished.** There is no length yet, and zero
 * would claim one (invariant 2).
 */
export function sessionLengthMs(session: SessionTiming): number | null {
  if (session.completedAt === null) {
    return null;
  }

  return Math.max(
    0,
    session.completedAt - session.startedAt - session.accumulatedPauseMs,
  );
}

/**
 * How long a session has been running, for the clock in its header.
 *
 * The same arithmetic as `sessionLengthMs`, with `now` standing in for an end
 * that has not happened. **Derived from timestamps every time it is read**
 * (invariant 4) — an interval may repaint the figure but must never add to it,
 * or ninety seconds in another app would cost ninety seconds.
 *
 * While paused the clock holds at the moment it was paused rather than at the
 * moment it is read. Pausing states that training stopped (§6.2), and a figure
 * that kept climbing behind a Paused label would be contradicting the label.
 */
export function elapsedSessionMs(
  session: SessionTiming & { pausedAt: number | null },
  now: number,
): number {
  const until = session.completedAt ?? session.pausedAt ?? now;

  return Math.max(0, until - session.startedAt - session.accumulatedPauseMs);
}

/** A stretch of days between two sessions on which nothing was trained. */
export type TrainingGap = { fromMs: number; toMs: number };

/**
 * The untrained stretches inside a timeline, keyed by the row they follow.
 *
 * The timeline is newest first, so the gap between rows `i` and `i + 1` belongs
 * after `i`. A map rather than an interleaved list, so the caller keeps a flat
 * array of sessions for its list and asks about gaps while rendering — mixing
 * two kinds of thing into one array makes every `keyExtractor` and every
 * `renderItem` test for which it has.
 *
 * **Days, not durations.** Two sessions eighteen hours apart may be on the same
 * day or on consecutive ones, and neither is a gap. Boundaries move with
 * `setDate` and `setHours` rather than by dividing milliseconds, so a clock
 * change does not invent or swallow a day.
 *
 * **A single rest day is not a gap.** Training every other day would otherwise
 * draw a rule between every pair of rows, and a timeline that remarks on every
 * day off is keeping score — which is the one thing §11.6 rules out by name.
 * Two clear days is the point at which a break is a break.
 *
 * Drawing these is the whole reason the timeline is a flat list rather than one
 * grouped by day: a break in training is part of the record, and a heading per
 * day states the days that exist while saying nothing about the ones that do
 * not.
 */
export function gapsAfter(
  timestampsNewestFirst: number[],
): Map<number, TrainingGap> {
  const gaps = new Map<number, TrainingGap>();

  for (let index = 0; index < timestampsNewestFirst.length - 1; index += 1) {
    const newer = timestampsNewestFirst[index];
    const older = timestampsNewestFirst[index + 1];

    if (newer === undefined || older === undefined) {
      continue;
    }

    const from = addDays(startOfDay(older), 1);
    const to = addDays(startOfDay(newer), -1);

    // `from >= to` covers the same day, consecutive days, and one clear day
    // between — none of which is a break worth drawing.
    if (from < to) {
      gaps.set(index, { fromMs: from, toMs: to });
    }
  }

  return gaps;
}
