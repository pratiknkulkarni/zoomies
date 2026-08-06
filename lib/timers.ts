/**
 * Timing, derived from timestamps and never from accumulated ticks
 * (FEATURES.md §8.1, invariant 4).
 *
 * **Nothing here counts.** A `setInterval` stops firing when the app is
 * suspended, so a timer built on one loses exactly the time spent in another
 * app — ninety seconds away would cost ninety seconds. Every figure below is
 * the distance between two clock readings, so a suspended app resumes at the
 * right number without knowing it was away.
 *
 * A `setInterval` still drives *repainting* — a screen has to redraw for the
 * figure to change — but it never accumulates. It only asks these functions
 * again.
 *
 * **Pure, and `now` is always a parameter.** No function reads the clock
 * itself, which is what makes a ninety-second gap something a unit test can
 * state rather than wait for.
 *
 * The shape matches the `paused_at` and `accumulated_pause_ms` columns already
 * on `sessions`, so a stored session is a `Timer` without translation.
 */
export type Timer = {
  /** Epoch millis. */
  startedAt: number;
  /** Epoch millis while paused, null while running. */
  pausedAt: number | null;
  /** Total paused time before the current pause, in millis. */
  accumulatedPauseMs: number;
};

export function startTimer(now: number): Timer {
  return { startedAt: now, pausedAt: null, accumulatedPauseMs: 0 };
}

/** Already paused is a no-op, so a double tap cannot restart the pause. */
export function pauseTimer(timer: Timer, now: number): Timer {
  if (timer.pausedAt !== null) {
    return timer;
  }

  return { ...timer, pausedAt: now };
}

/** Already running is a no-op. Folds the pause just ended into the total. */
export function resumeTimer(timer: Timer, now: number): Timer {
  if (timer.pausedAt === null) {
    return timer;
  }

  return {
    startedAt: timer.startedAt,
    pausedAt: null,
    accumulatedPauseMs: timer.accumulatedPauseMs + (now - timer.pausedAt),
  };
}

/**
 * Time the timer has actually run.
 *
 * Clamped at zero because `Date.now()` is not monotonic — an NTP correction
 * can step it backwards, and a negative hold is not a thing that can be
 * displayed or, worse, saved.
 */
export function elapsedMs(timer: Timer, now: number): number {
  const until = timer.pausedAt ?? now;

  return Math.max(0, until - timer.startedAt - timer.accumulatedPauseMs);
}

/** What a countdown has left. Never negative — a finished rest reads zero. */
export function remainingMs(
  timer: Timer,
  durationMs: number,
  now: number,
): number {
  return Math.max(0, durationMs - elapsedMs(timer, now));
}

/**
 * Whether a countdown is over.
 *
 * True on return from any absence long enough, which is what lets a rest timer
 * be correct after the app was killed and reopened rather than needing to have
 * been running the whole time.
 */
export function hasElapsed(
  timer: Timer,
  durationMs: number,
  now: number,
): boolean {
  return elapsedMs(timer, now) >= durationMs;
}
