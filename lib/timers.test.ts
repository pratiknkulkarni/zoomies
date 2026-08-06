import { describe, expect, it } from 'vitest';

import {
  elapsedMs,
  hasElapsed,
  pauseTimer,
  remainingMs,
  resumeTimer,
  startTimer,
  type Timer,
} from './timers';

/** A fixed epoch so every expectation reads as an offset from it. */
const T0 = 1_700_000_000_000;
const s = (seconds: number) => seconds * 1000;

describe('elapsedMs', () => {
  it('is the distance from the start, not a count of ticks', () => {
    const timer = startTimer(T0);

    expect(elapsedMs(timer, T0)).toBe(0);
    expect(elapsedMs(timer, T0 + s(30))).toBe(s(30));
  });

  /**
   * FEATURES.md §8.1, and the reason none of this uses setInterval: the app is
   * suspended in the background and no tick fires, but the wall clock moved.
   */
  it('accounts for 90 seconds spent in another app', () => {
    const timer = startTimer(T0);

    expect(elapsedMs(timer, T0 + s(90))).toBe(s(90));
  });

  it('stops advancing while paused, however long the pause lasts', () => {
    const timer = pauseTimer(startTimer(T0), T0 + s(10));

    expect(elapsedMs(timer, T0 + s(10))).toBe(s(10));
    expect(elapsedMs(timer, T0 + s(600))).toBe(s(10));
  });

  it('excludes the paused stretch once resumed', () => {
    let timer = startTimer(T0);
    timer = pauseTimer(timer, T0 + s(10));
    timer = resumeTimer(timer, T0 + s(40));

    // Ten seconds ran, thirty were paused, ten more ran.
    expect(elapsedMs(timer, T0 + s(50))).toBe(s(20));
  });

  it('accumulates across several pauses', () => {
    let timer = startTimer(T0);
    timer = pauseTimer(timer, T0 + s(5));
    timer = resumeTimer(timer, T0 + s(15));
    timer = pauseTimer(timer, T0 + s(20));
    timer = resumeTimer(timer, T0 + s(30));

    // Ran 0-5, 15-20, 30-35.
    expect(elapsedMs(timer, T0 + s(35))).toBe(s(15));
  });

  /**
   * `Date.now()` is not monotonic — an NTP correction can move it backwards.
   * A negative elapsed time would render as a negative hold and, worse, could
   * be written as one.
   */
  it('never reports a negative elapsed time if the clock steps back', () => {
    const timer = startTimer(T0);

    expect(elapsedMs(timer, T0 - s(5))).toBe(0);
  });
});

describe('pauseTimer and resumeTimer', () => {
  it('pausing twice does not double-count the second pause', () => {
    const paused = pauseTimer(startTimer(T0), T0 + s(10));
    const again = pauseTimer(paused, T0 + s(20));

    expect(again).toEqual(paused);
    expect(elapsedMs(again, T0 + s(60))).toBe(s(10));
  });

  it('resuming a running timer changes nothing', () => {
    const running = startTimer(T0);

    expect(resumeTimer(running, T0 + s(10))).toEqual(running);
  });

  it('leaves the original untouched, since these describe stored rows', () => {
    const timer = startTimer(T0);
    pauseTimer(timer, T0 + s(10));

    expect(timer.pausedAt).toBeNull();
  });
});

describe('remainingMs', () => {
  it('counts down from the duration', () => {
    const timer = startTimer(T0);

    expect(remainingMs(timer, s(60), T0)).toBe(s(60));
    expect(remainingMs(timer, s(60), T0 + s(20))).toBe(s(40));
  });

  /** A rest timer that has run out reads zero, never a negative countdown. */
  it('clamps at zero once the duration has passed', () => {
    const timer = startTimer(T0);

    expect(remainingMs(timer, s(60), T0 + s(60))).toBe(0);
    expect(remainingMs(timer, s(60), T0 + s(300))).toBe(0);
  });

  it('holds while paused', () => {
    const timer = pauseTimer(startTimer(T0), T0 + s(20));

    expect(remainingMs(timer, s(60), T0 + s(600))).toBe(s(40));
  });
});

describe('hasElapsed', () => {
  it('turns true exactly at the duration, not before', () => {
    const timer = startTimer(T0);

    expect(hasElapsed(timer, s(60), T0 + s(59))).toBe(false);
    expect(hasElapsed(timer, s(60), T0 + s(60))).toBe(true);
  });

  /**
   * The case the notification exists for: the app was killed at 10s and
   * reopened well after the rest was over.
   */
  it('is true on return from a long absence', () => {
    const timer = startTimer(T0);

    expect(hasElapsed(timer, s(60), T0 + s(3600))).toBe(true);
  });

  it('is false while paused short of the duration, however long', () => {
    const timer: Timer = pauseTimer(startTimer(T0), T0 + s(30));

    expect(hasElapsed(timer, s(60), T0 + s(9999))).toBe(false);
  });
});
