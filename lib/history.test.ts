import { describe, expect, it } from 'vitest';

import { sessionLengthMs } from './history';

describe('sessionLengthMs', () => {
  const minute = 60_000;

  it('is the time between starting and finishing', () => {
    expect(
      sessionLengthMs({
        startedAt: 0,
        completedAt: 48 * minute,
        accumulatedPauseMs: 0,
      }),
    ).toBe(48 * minute);
  });

  /**
   * The phase's second exit criterion. Pausing states that training stopped
   * (§6.2), so counting that time would make every long break inflate the
   * figure — the longer the break, the bigger the lie.
   */
  it('excludes time spent paused', () => {
    expect(
      sessionLengthMs({
        startedAt: 0,
        completedAt: 60 * minute,
        accumulatedPauseMs: 12 * minute,
      }),
    ).toBe(48 * minute);
  });

  it('excludes several pauses, since they accumulate into one figure', () => {
    expect(
      sessionLengthMs({
        startedAt: 1_000_000,
        completedAt: 1_000_000 + 90 * minute,
        accumulatedPauseMs: 30 * minute,
      }),
    ).toBe(60 * minute);
  });

  // Not something that should happen, but a clock that went backwards or a
  // pause longer than the session must not produce a negative duration.
  it('never returns a negative length', () => {
    expect(
      sessionLengthMs({
        startedAt: 0,
        completedAt: 10 * minute,
        accumulatedPauseMs: 30 * minute,
      }),
    ).toBe(0);
  });

  /** There is no length yet, and zero would claim one (invariant 2). */
  it('is null while the session is unfinished', () => {
    expect(
      sessionLengthMs({
        startedAt: 0,
        completedAt: null,
        accumulatedPauseMs: 0,
      }),
    ).toBeNull();
  });
});
