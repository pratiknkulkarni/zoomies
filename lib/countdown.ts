/**
 * The last three seconds of a countdown, said out loud (FEATURES.md §8.2).
 *
 * **A countdown that only speaks at zero is heard too late.** The tone that
 * ends a hold arrives while you are still holding, and the one that ends a rest
 * arrives with the next effort already owed — so the phone is picked up to see
 * how long is left, which is the thing a hands-free round exists to avoid. Three
 * seconds of warning is enough to be back on the bar at zero.
 *
 * **Marks, not a stream.** Three announcements at fixed distances from the end,
 * each made at most once. The last is a different sound rather than a fourth
 * tick, and it is the end of the countdown as far as sound goes — nothing plays
 * at zero, because the long tone has been running through the final second and
 * finishes as the figure does.
 *
 * **Pure, and `remainingMs` is a parameter.** Nothing here reads a clock or
 * plays anything: the caller passes what `lib/timers.ts` derived and acts on
 * what comes back, which is what lets a ninety-second absence be a test case
 * rather than a wait.
 */

const SECOND = 1000;

/**
 * A tick counts; the final tone ends. Which ending it is — stop or go — is the
 * caller's to decide, because only the caller knows what was counting down.
 */
export type Cue = 'tick' | 'final';

/**
 * How far from the end each announcement is made, in the order they are
 * reached. They are seconds apart because they are read as seconds: the figure
 * rounds up, so the mark at 3000 is announced during the second the display
 * spends reading `0:03`.
 */
export const MARKS = [3000, 2000, 1000] as const;

/** The mark that ends the countdown rather than counting it. */
export const FINAL_MARK = 1000;

/**
 * The announcement a countdown owes right now, or null.
 *
 * `announcedMark` is the mark this countdown last made — null for one that has
 * said nothing yet. The caller remembers it per countdown, so a rest that
 * follows a hold starts its own three seconds rather than inheriting them.
 *
 * **A mark passed while the app was away is skipped, and the final one never
 * is.** Coming back to find a hold long finished should not replay a countdown
 * for time that is gone; it should still say the hold is over, once, because
 * that is a fact about the set rather than a warning about the seconds before
 * it.
 */
export function cueDue(
  remainingMs: number,
  announcedMark: number | null,
): { mark: number; cue: Cue } | null {
  for (const mark of MARKS) {
    // Descending, and announcements are made in the same order, so anything at
    // or above the last one is behind us.
    if (announcedMark !== null && mark >= announcedMark) {
      continue;
    }

    if (remainingMs > mark) {
      continue;
    }

    // A whole second late is not this mark's moment any more — it is a mark
    // that went by while the screen was not being looked at.
    if (mark !== FINAL_MARK && remainingMs <= mark - SECOND) {
      continue;
    }

    return { mark, cue: mark === FINAL_MARK ? 'final' : 'tick' };
  }

  return null;
}
