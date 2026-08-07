/**
 * The rules that decide what a finished session is asked about
 * (FEATURES.md §6.5, §6.6).
 *
 * Pure, and separate from `db/queries/completion.ts` for the reason
 * `lib/timers.ts` is separate from anything that renders: the runner cannot
 * open `expo-sqlite` (PLAN.md §4.3 is still open), so a rule that lives in a
 * query cannot be tested. This is the part worth testing — a raise that fires
 * on one lucky set would rewrite the program on the strength of a fluke.
 */

/**
 * Whether a target was beaten on the **majority** of sets (§6.6).
 *
 * Majority, not "at least once": one strong first set followed by three that
 * fall short is a normal session, not a signal to raise. It is also not "all",
 * which would mean a single tired last set could veto a real improvement.
 *
 * `beats * 2 > total` rather than `beats > total / 2`, which is the same
 * arithmetic without a float in the middle of it. Half is not a majority, so
 * two of four does not qualify.
 *
 * An unrecorded value never counts as a beat (invariant 2) but still counts as
 * a set — it happened, it just was not measured, and treating it as absent
 * would let two measured sets out of five carry a raise.
 *
 * A tie is not a beat. Hitting the target is what the target is for.
 */
export function beatenOn(values: (number | null)[], target: number): boolean {
  if (values.length === 0) {
    return false;
  }

  const beats = values.filter(
    (value) => value !== null && value > target,
  ).length;

  return beats * 2 > values.length;
}

/**
 * The best of what was logged, which is what a raise raises to.
 *
 * Null when nothing was recorded at all — there is no figure to offer, and
 * zero would claim one (invariant 2).
 */
export function bestValue(values: (number | null)[]): number | null {
  const recorded = values.filter((value): value is number => value !== null);

  return recorded.length > 0 ? Math.max(...recorded) : null;
}
