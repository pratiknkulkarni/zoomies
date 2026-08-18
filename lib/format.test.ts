import { describe, expect, it } from 'vitest';

import {
  formatClock,
  formatDayRange,
  formatDuration,
  formatLastTrained,
  formatMeasure,
  formatMetricDetail,
  formatMetricSummary,
  formatMonth,
  formatPlanSummary,
  formatRecordsWhat,
  formatSessionDate,
  formatSetNote,
  formatSetSeries,
  formatSetValues,
  formatShortDate,
  formatSlotTally,
  formatTarget,
  formatTimeRange,
  formatTrainingWindow,
  formatVolume,
} from './format';

describe('formatDuration', () => {
  it('is minutes alone below an hour', () => {
    expect(formatDuration(48 * 60_000)).toBe('48m');
  });

  it('splits hours from minutes', () => {
    expect(formatDuration(72 * 60_000)).toBe('1h 12m');
  });

  // `1h 00m` reads like a stopwatch; this is a fact about a session that is
  // over, not something counting.
  it('drops the minutes when there are none', () => {
    expect(formatDuration(120 * 60_000)).toBe('2h');
  });

  /**
   * A session that genuinely took seconds is a mistake, and `0m` states that
   * less clearly than the smallest real number does.
   */
  it('never reads as zero', () => {
    expect(formatDuration(0)).toBe('1m');
    expect(formatDuration(20_000)).toBe('1m');
  });
});

describe('formatSessionDate', () => {
  const aug8 = new Date('2026-08-08T09:00:00Z').getTime();

  it('omits the year within the current one', () => {
    const now = new Date('2026-08-09T09:00:00Z').getTime();
    expect(formatSessionDate(aug8, now)).toBe('Sat 8 Aug');
  });

  // A session from last January must never read as one from this January.
  it('shows the year once it is not this one', () => {
    const now = new Date('2027-01-02T09:00:00Z').getTime();
    expect(formatSessionDate(aug8, now)).toBe('Sat 8 Aug 2026');
  });
});

describe('formatTimeRange', () => {
  const started = new Date('2026-08-14T18:42:00').getTime();
  const finished = new Date('2026-08-14T19:30:00').getTime();

  it('reads as a range on one line', () => {
    expect(formatTimeRange(started, finished)).toBe('18:42–19:30');
  });

  // The width has to be constant down a column of sessions, so an early
  // morning pads rather than dropping its leading zero.
  it('pads the hour, so every row is the same width', () => {
    const dawn = new Date('2026-08-14T06:05:00').getTime();
    expect(formatTimeRange(dawn, finished)).toBe('06:05–19:30');
  });

  /**
   * A range with one end missing would have to invent the other, and the
   * caller shows the duration line as `Unfinished` instead.
   */
  it('is null while a session is unfinished', () => {
    expect(formatTimeRange(started, null)).toBeNull();
  });
});

describe('formatMeasure', () => {
  it('uses the unit where the metric has one', () => {
    expect(formatMeasure(30, { name: 'Hold', unit: 's' })).toBe('30 s');
  });

  // A count stores no unit, because `Reps` is already the word for one.
  it('falls back to the metric name where there is no unit', () => {
    expect(formatMeasure(9, { name: 'Reps', unit: null })).toBe('9 reps');
  });

  /**
   * The records row already carries the name in its own column, so the fallback
   * printed it twice — `Reps · 12 reps`. Nothing stops a metric being named
   * `20`, and there it read `20 · 21 20`, which is where this was noticed.
   */
  it('drops the name fallback when the caller has already named the metric', () => {
    expect(formatMeasure(21, { name: '20', unit: null }, { bare: true })).toBe(
      '21',
    );
    expect(formatMeasure(9, { name: 'Reps', unit: null }, { bare: true })).toBe(
      '9',
    );
  });

  // The unit is not a repeat of the label — `42` alone does not say seconds.
  it('keeps the unit when bare, because the label does not carry it', () => {
    expect(formatMeasure(42, { name: 'Hold', unit: 's' }, { bare: true })).toBe(
      '42 s',
    );
  });
});

describe('formatClock', () => {
  it('pads seconds so the figure does not change width as it counts', () => {
    expect(formatClock(5_000)).toBe('0:05');
    expect(formatClock(65_000)).toBe('1:05');
    expect(formatClock(600_000)).toBe('10:00');
  });

  /**
   * Rounding up, so a 30-second timer reads 0:30 for its first moment instead
   * of flicking to 0:29 the instant it starts.
   */
  it('rounds up, so a full duration reads as itself', () => {
    expect(formatClock(30_000)).toBe('0:30');
    expect(formatClock(29_001)).toBe('0:30');
  });

  it('reads zero only when the time is genuinely gone', () => {
    expect(formatClock(1)).toBe('0:01');
    expect(formatClock(0)).toBe('0:00');
  });

  /** `remainingMs` clamps, but nothing should depend on that to render. */
  it('never renders a negative clock', () => {
    expect(formatClock(-5_000)).toBe('0:00');
  });
});

describe('formatSlotTally', () => {
  it('is absent at zero, so unchosen rows carry nothing', () => {
    expect(formatSlotTally(0)).toBeUndefined();
  });

  it('counts rather than toggling, because a duplicate slot is legitimate', () => {
    expect(formatSlotTally(1)).toBe('× 1');
    expect(formatSlotTally(3)).toBe('× 3');
  });
});

describe('formatMetricSummary', () => {
  it('appends a unit that says something the name does not', () => {
    expect(formatMetricSummary([{ name: 'Hold', unit: 's' }])).toBe('Hold (s)');
  });

  it('drops a unit that only repeats the name', () => {
    expect(formatMetricSummary([{ name: 'Reps', unit: 'reps' }])).toBe('Reps');
  });

  it('ignores case when deciding that a unit repeats the name', () => {
    expect(formatMetricSummary([{ name: 'Reps', unit: 'REPS' }])).toBe('Reps');
  });

  it('omits a unit that was never recorded', () => {
    expect(formatMetricSummary([{ name: 'Cues', unit: null }])).toBe('Cues');
  });

  it('joins several metrics in the order given', () => {
    expect(
      formatMetricSummary([
        { name: 'Hold', unit: 's' },
        { name: 'Cues', unit: null },
      ]),
    ).toBe('Hold (s) · Cues');
  });

  // The caller passes this straight to `ListRow`, which omits the subtitle
  // entirely rather than rendering a blank line under the name.
  it('is undefined when an exercise records nothing', () => {
    expect(formatMetricSummary([])).toBeUndefined();
  });
});

describe('formatSetValues', () => {
  const reps = { id: 'm1', name: 'Reps', unit: null, type: 'number' } as const;
  const hold = { id: 'm2', name: 'Hold', unit: 's', type: 'duration' } as const;
  const notes = { id: 'm3', name: 'Cues', unit: null, type: 'notes' } as const;

  it('omits an unrecorded metric by default, as the session screen wants', () => {
    expect(formatSetValues([reps, hold], new Map([['m1', 10]]))).toBe(
      '10 reps',
    );
  });

  /**
   * Exit criterion 1 — a completed session reads back exactly as logged. With
   * the metric simply dropped, `10 reps` and `10 reps plus a note never
   * written` are the same line.
   */
  it('shows the dash when history asks for it', () => {
    expect(
      formatSetValues([reps, hold], new Map([['m1', 10]]), {
        missing: 'dash',
      }),
    ).toBe('10 reps · —');
  });

  /**
   * The dash says something is missing without saying what. On a screen listing
   * every set an exercise ever recorded, that means counting positions against
   * the metric list above — so the reading surfaces name it instead.
   */
  it('names the metric that went unrecorded', () => {
    expect(
      formatSetValues([reps, hold], new Map([['m1', 10]]), {
        missing: 'name',
      }),
    ).toBe('10 reps · hold not recorded');
  });

  it('still says a set happened when nothing at all was recorded', () => {
    expect(formatSetValues([reps], new Map())).toBe('Recorded');
  });

  /**
   * The observed bug: with a dash for every metric, a set that measured nothing
   * read `— · —` rather than saying an effort happened. `Recorded` was already
   * the right answer and was unreachable the moment a caller asked for the
   * dash.
   */
  it('says a set happened rather than a row of dashes', () => {
    expect(
      formatSetValues([reps, hold], new Map(), { missing: 'dash' }),
    ).toBe('Recorded');

    expect(
      formatSetValues([reps, hold], new Map(), { missing: 'name' }),
    ).toBe('Recorded');
  });

  /**
   * The bug the naming mode would otherwise have introduced. A note lives in
   * `value_text`, which this function never reads, so every note looked
   * unrecorded — harmless while the mode dropped it, a false statement the
   * moment the mode started naming it.
   */
  it('never speaks for a note, written or not', () => {
    expect(
      formatSetValues([reps, notes], new Map([['m1', 10]]), {
        missing: 'name',
      }),
    ).toBe('10 reps');

    expect(
      formatSetValues([notes], new Map(), { missing: 'name' }),
    ).toBe('Recorded');
  });

  /** A null is a recorded row holding no value, and reads the same as absent. */
  it('treats an explicit null as unrecorded', () => {
    expect(
      formatSetValues([reps, hold], new Map([['m1', null]]), {
        missing: 'dash',
      }),
    ).toBe('Recorded');
  });
});

describe('formatSetNote', () => {
  const reps = { id: 'm1', name: 'Reps', unit: null, type: 'number' } as const;
  const notes = { id: 'm2', name: 'Cues', unit: null, type: 'notes' } as const;

  it('reads the note back', () => {
    expect(
      formatSetNote([reps, notes], new Map([['m2', 'grip went first']])),
    ).toBe('grip went first');
  });

  // Null, not `—`: the value line above already accounts for what was measured.
  it('is null when nothing was written', () => {
    expect(formatSetNote([reps, notes], new Map())).toBeNull();
    expect(formatSetNote([reps, notes], new Map([['m2', null]]))).toBeNull();
    expect(formatSetNote([reps, notes], new Map([['m2', '  ']]))).toBeNull();
  });

  it('ignores text stored against a metric that is not a note', () => {
    expect(formatSetNote([reps], new Map([['m1', 'stray']]))).toBeNull();
  });
});

describe('formatMetricDetail', () => {
  it('names the metric logged first, since position alone does not say it', () => {
    expect(formatMetricDetail({ type: 'duration', unit: 's' }, true)).toBe(
      'Logged first · seconds',
    );
  });

  it('says only what the others measure', () => {
    expect(formatMetricDetail({ type: 'duration', unit: 's' }, false)).toBe(
      'seconds',
    );
  });

  // A count's name is its unit, so it stores none — see lib/metrics.ts.
  it('describes a count without inventing a unit for it', () => {
    expect(formatMetricDetail({ type: 'number', unit: null }, false)).toBe(
      'a count',
    );
  });

  it('describes a metric no preset covers rather than calling it invalid', () => {
    expect(formatMetricDetail({ type: 'number', unit: 'm' }, false)).toBe(
      'a number in m',
    );
  });
});

describe('formatDayRange', () => {
  const day = (month: number, date: number) =>
    new Date(2026, month, date).getTime();

  // The month is stated once where both ends share it — `8 Aug–11 Aug` repeats
  // a word the reader has already had.
  it('states the month once across a range inside it', () => {
    expect(formatDayRange(day(7, 8), day(7, 11))).toBe('8–11 Aug');
  });

  it('reads as one date when the range is a single day', () => {
    expect(formatDayRange(day(7, 9), day(7, 9))).toBe('9 Aug');
  });

  /** Both months are needed, and the parts are long enough to want the space. */
  it('names both months across a boundary', () => {
    expect(formatDayRange(day(6, 28), day(7, 3))).toBe('28 Jul – 3 Aug');
  });

  it('names both months across a year, without stating the year', () => {
    // Six days. Crossing a New Year does not make the year worth saying.
    expect(formatDayRange(day(11, 28), new Date(2027, 0, 3).getTime())).toBe(
      '28 Dec – 3 Jan',
    );
  });

  it('states the year once the range is longer than one', () => {
    /*
      Found on a database holding nineteen years, where the grid's caption read
      `18 Jun – 14 Aug` and the first of those dates was in 2007.
    */
    expect(
      formatDayRange(new Date(2007, 5, 18).getTime(), day(7, 14)),
    ).toBe('18 Jun 2007 – 14 Aug 2026');
  });

  it('leaves a long range inside one year alone', () => {
    // 300 days, one year, unambiguous without it.
    expect(formatDayRange(day(0, 6), day(10, 2))).toBe('6 Jan – 2 Nov');
  });

  it('states the year at the boundary, not a day before it', () => {
    const from = new Date(2025, 7, 14).getTime();

    // Exactly 365 days is still one year; 366 is more than one.
    expect(formatDayRange(from, day(7, 14))).toBe('14 Aug – 14 Aug');
    expect(formatDayRange(from, day(7, 15))).toBe(
      '14 Aug 2025 – 15 Aug 2026',
    );
  });
});

describe('formatShortDate', () => {
  it('drops the weekday a session date carries', () => {
    expect(formatShortDate(new Date(2026, 4, 6, 19).getTime())).toBe('6 May');
  });

  it('does not pad the day', () => {
    expect(formatShortDate(new Date(2026, 7, 3).getTime())).toBe('3 Aug');
  });
});

describe('formatMonth', () => {
  // Sentence case at the source; the label treatment uppercases it (§2.5).
  it('is the short month in sentence case', () => {
    expect(formatMonth(new Date(2026, 4, 1).getTime())).toBe('May');
  });
});

describe('formatTrainingWindow', () => {
  it('states the fixed window once history runs past it', () => {
    expect(
      formatTrainingWindow(new Date(2026, 6, 19).getTime(), true, 28),
    ).toBe('last 28 days');
  });

  // A window wider than the history states days of nothing that never
  // happened — the app did not exist for them.
  it('shortens to the history when the history is younger', () => {
    expect(
      formatTrainingWindow(new Date(2026, 7, 16).getTime(), false, 28),
    ).toBe('since 16 Aug');
  });
});

describe('formatLastTrained', () => {
  it('gives the date and the gap, never one alone', () => {
    expect(formatLastTrained(new Date(2026, 4, 6).getTime(), 101)).toBe(
      '6 May · 101 days',
    );
  });

  it('does not say 1 days', () => {
    expect(formatLastTrained(new Date(2026, 7, 14).getTime(), 1)).toBe(
      '14 Aug · 1 day',
    );
  });
});

describe('formatSetSeries', () => {
  const reps = { name: 'Reps', unit: null };
  const hold = { name: 'Hold', unit: 's' };

  it('reads a session as one line', () => {
    expect(formatSetSeries([10, 9, 9, 7], reps)).toBe('10 · 9 · 9 · 7');
  });

  // The column is mono, so repeating the unit costs alignment nothing, and
  // `31 · 42 · 38 s` reads as three numbers with a stray letter.
  it('carries the unit on every figure', () => {
    expect(formatSetSeries([31, 42, 38], hold)).toBe('31 s · 42 s · 38 s');
  });

  /** A set where this metric went unmeasured did not score zero. */
  it('shows an unrecorded set as a dash', () => {
    expect(formatSetSeries([12, null, 9], reps)).toBe('12 · — · 9');
  });
});

describe('formatRecordsWhat', () => {
  const reps = { name: 'Reps', type: 'number' } as const;
  const hold = { name: 'Hold', type: 'duration' } as const;
  const notes = { name: 'Cues', type: 'notes' } as const;

  // In metric order, so the first named is the one logged first.
  it('names what an exercise measures, in order', () => {
    expect(formatRecordsWhat([hold, reps])).toBe('records seconds, reps');
  });

  /** A unit symbol inside prose reads as an abbreviation of the wrong word. */
  it('says seconds rather than s', () => {
    expect(formatRecordsWhat([hold])).toBe('records seconds');
  });

  it('names a note as notes, whatever the metric is called', () => {
    expect(formatRecordsWhat([reps, notes])).toBe('records reps, notes');
  });

  it('is undefined when an exercise records nothing', () => {
    expect(formatRecordsWhat([])).toBeUndefined();
  });
});

describe('formatVolume', () => {
  it('counts both, and neither is stored', () => {
    expect(formatVolume(63, 18)).toBe('63 sets over 18 sessions');
  });

  it('is singular where it should be', () => {
    expect(formatVolume(1, 1)).toBe('1 set over 1 session');
  });

  // `0 sets over 0 sessions` is a sentence about nothing.
  it('is undefined before anything is logged', () => {
    expect(formatVolume(0, 0)).toBeUndefined();
  });
});

describe('formatPlanSummary', () => {
  const aug9 = new Date(2026, 7, 9).getTime();

  it('says what a plan holds and when it last ran', () => {
    expect(formatPlanSummary(4, 14, aug9)).toBe(
      '4 exercises · 14 sets · last run Sun 9 Aug',
    );
  });

  /**
   * A slot with no target sets means "as many as you do" (§5.1), so it adds
   * nothing to the total — and a plan made entirely of those must not claim a
   * total it does not have.
   */
  it('omits the set count when the plan asks for no particular number', () => {
    expect(formatPlanSummary(3, 0, aug9)).toBe('3 exercises · last run Sun 9 Aug');
  });

  // Stated rather than omitted: a blank there reads as missing data, and a
  // plan built but not yet used is an ordinary, temporary state.
  it('says a plan has never run', () => {
    expect(formatPlanSummary(2, 6, null)).toBe('2 exercises · 6 sets · never run');
  });

  it('says an empty plan is empty', () => {
    expect(formatPlanSummary(0, 0, null)).toBe('No exercises · never run');
  });
});

describe('formatTarget', () => {
  const seconds = { name: 'Hold', unit: 's' };

  it('reads a plan as sets by measure', () => {
    expect(
      formatTarget(
        { targetSets: 10, targetValue: 60, restSeconds: null },
        seconds,
      ),
    ).toBe('10 × 60 s');
  });

  it('appends rest to the plan it qualifies', () => {
    expect(
      formatTarget({ targetSets: 10, targetValue: 60, restSeconds: 15 }, seconds),
    ).toBe('10 × 60 s · 15s rest');
  });

  it('treats a missing rest and no rest as the same silence', () => {
    const plan = { targetSets: 5, targetValue: 40 };

    expect(formatTarget({ ...plan, restSeconds: null }, seconds)).toBe(
      formatTarget(plan, seconds),
    );
  });

  /*
    Zero is a rest of no length, which is a thing that can be asked for and is
    not the same answer as null. It has to survive being formatted, or the
    display would quietly agree with a slot that says something else.
  */
  it('states a zero rest rather than reading it as none', () => {
    expect(
      formatTarget({ targetSets: 3, targetValue: 30, restSeconds: 0 }, seconds),
    ).toBe('3 × 30 s · 0s rest');
  });

  it('never lets rest stand in for a plan it is qualifying', () => {
    expect(
      formatTarget(
        { targetSets: null, targetValue: null, restSeconds: 15 },
        seconds,
      ),
    ).toBe('No target');
  });

  it('carries rest on a set count with nothing measured', () => {
    expect(
      formatTarget(
        { targetSets: 4, targetValue: null, restSeconds: 90 },
        undefined,
      ),
    ).toBe('4 sets · 90s rest');
  });
});
