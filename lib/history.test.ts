import { describe, expect, it } from 'vitest';

import { elapsedSessionMs, gapsAfter, sessionLengthMs } from './history';

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

describe('elapsedSessionMs', () => {
  const minute = 60_000;
  const running = {
    startedAt: 0,
    completedAt: null,
    accumulatedPauseMs: 0,
    pausedAt: null,
  };

  it('climbs with the clock while a session runs', () => {
    expect(elapsedSessionMs(running, 24 * minute)).toBe(24 * minute);
  });

  /**
   * Invariant 4 read from the display side: the figure is derived from
   * timestamps, so ninety seconds in another app costs nothing.
   */
  it('does not lose time spent outside the app', () => {
    expect(elapsedSessionMs(running, 90_000)).toBe(90_000);
  });

  it('excludes time already spent paused', () => {
    expect(
      elapsedSessionMs({ ...running, accumulatedPauseMs: 5 * minute }, 30 * minute),
    ).toBe(25 * minute);
  });

  /**
   * A clock climbing behind a `Paused` label would be contradicting the label.
   * It holds at the moment training stopped.
   */
  it('holds still while paused, however long the pause lasts', () => {
    const paused = { ...running, pausedAt: 10 * minute };

    expect(elapsedSessionMs(paused, 12 * minute)).toBe(10 * minute);
    expect(elapsedSessionMs(paused, 90 * minute)).toBe(10 * minute);
  });

  /** Once finished it is a fact, and `now` stops being part of it. */
  it('stops at completion', () => {
    expect(
      elapsedSessionMs(
        { ...running, completedAt: 48 * minute },
        999 * minute,
      ),
    ).toBe(48 * minute);
  });

  it('never returns a negative figure', () => {
    expect(
      elapsedSessionMs({ ...running, accumulatedPauseMs: 30 * minute }, minute),
    ).toBe(0);
  });
});

describe('gapsAfter', () => {
  /** Local time throughout — a gap is a run of calendar days, not of hours. */
  const at = (day: number, hour = 18) =>
    new Date(2026, 7, day, hour, 0, 0).getTime();

  it('names the untrained days between two sessions', () => {
    const gaps = gapsAfter([at(12), at(7)]);

    expect(gaps.get(0)).toEqual({ fromMs: at(8, 0), toMs: at(11, 0) });
  });

  it('keys a gap to the row it follows, newest first', () => {
    const gaps = gapsAfter([at(14), at(12), at(7)]);

    // 13 Aug alone is a rest day, not a break.
    expect(gaps.has(0)).toBe(false);
    expect(gaps.get(1)).toEqual({ fromMs: at(8, 0), toMs: at(11, 0) });
  });

  /**
   * Training every other day would otherwise put a rule between every pair of
   * rows, and a timeline that remarks on every day off is keeping score.
   */
  it('says nothing about a single rest day', () => {
    expect(gapsAfter([at(10), at(8)]).size).toBe(0);
  });

  it('draws two clear days, which is where a break starts', () => {
    expect(gapsAfter([at(11), at(8)]).get(0)).toEqual({
      fromMs: at(9, 0),
      toMs: at(10, 0),
    });
  });

  it('finds no gap between consecutive days', () => {
    expect(gapsAfter([at(10), at(9)]).size).toBe(0);
  });

  /**
   * Two sessions and a quick log on one evening are one day's training, not
   * three, and nothing separates them.
   */
  it('finds no gap within a single day', () => {
    expect(gapsAfter([at(10, 21), at(10, 18), at(10, 7)]).size).toBe(0);
  });

  it('has nothing to say about a timeline with one row, or none', () => {
    expect(gapsAfter([at(10)]).size).toBe(0);
    expect(gapsAfter([]).size).toBe(0);
  });

  /**
   * Boundaries move by date arithmetic rather than by dividing milliseconds,
   * so the 25-hour day at the end of British Summer Time neither invents a day
   * nor swallows one.
   */
  it('survives a clock change', () => {
    const before = new Date(2026, 9, 24, 18).getTime(); // 24 Oct
    const after = new Date(2026, 9, 27, 18).getTime(); // 27 Oct, clocks back
    const gaps = gapsAfter([after, before]);

    expect(gaps.get(0)).toEqual({
      fromMs: new Date(2026, 9, 25, 0).getTime(),
      toMs: new Date(2026, 9, 26, 0).getTime(),
    });
  });
});
