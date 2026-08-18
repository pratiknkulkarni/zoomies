import * as Haptics from 'expo-haptics';

/**
 * FEATURES.md §7.6 — feedback without looking at the screen.
 *
 * Every call is fire-and-forget and swallows its own failure. A device with
 * haptics disabled, or without a motor at all, must not turn a saved set into
 * an error: the set is already on disk by the time any of this runs.
 */

const ignore = () => {};

/** A set was recorded. The common case, so the lightest signal. */
export function tapSaved(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(ignore);
}

/**
 * The target was reached. Distinct from a plain save because the point is to
 * know without looking — §6.5 lets you keep going past it, so this states a
 * fact rather than stopping anything.
 */
export function tapTargetReached(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
    ignore,
  );
}

/**
 * Rest is over and the next set is starting (§8.2) — §7.6's *timer complete*,
 * which until the cycle existed had no moment to fire on.
 *
 * **The one signal that is not confirming something you did.** Every other call
 * here reports a write that has landed; this one is an instruction to move, and
 * it is the heavier notification style for that reason. The hold reaching its
 * target gets no haptic of its own — `tapTargetReached` follows from the save
 * instead — so the two ends of a round stay one signal each.
 */
export function tapRestOver(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
    ignore,
  );
}

/**
 * Something was added to a list — an exercise into a template.
 *
 * The same weight as `tapSaved`, because it means the same thing: that counted.
 *
 * **Fired in the press handler, before the write.** The row it changes only
 * updates once SQLite has written and the live query has re-run, and while that
 * gap is small it is the whole gap between tapping and seeing anything happen.
 * Building a template is the other place in the application where taps come in
 * quick succession, so it is the other place where that gap is felt.
 */
export function tapAdded(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(ignore);
}
