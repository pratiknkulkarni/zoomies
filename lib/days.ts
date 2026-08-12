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
