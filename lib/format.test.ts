import { describe, expect, it } from 'vitest';

import {
  formatClock,
  formatDuration,
  formatMeasure,
  formatMetricDetail,
  formatMetricSummary,
  formatSessionDate,
  formatSetValues,
  formatSlotTally,
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

describe('formatMeasure', () => {
  it('uses the unit where the metric has one', () => {
    expect(formatMeasure(30, { name: 'Hold', unit: 's' })).toBe('30 s');
  });

  // A count stores no unit, because `Reps` is already the word for one.
  it('falls back to the metric name where there is no unit', () => {
    expect(formatMeasure(9, { name: 'Reps', unit: null })).toBe('9 reps');
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
  const reps = { id: 'm1', name: 'Reps', unit: null };
  const notes = { id: 'm2', name: 'Cues', unit: null };

  it('omits an unrecorded metric by default, as the session screen wants', () => {
    expect(formatSetValues([reps, notes], new Map([['m1', 10]]))).toBe(
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
      formatSetValues([reps, notes], new Map([['m1', 10]]), { missing: '—' }),
    ).toBe('10 reps · —');
  });

  it('still says a set happened when nothing at all was recorded', () => {
    expect(formatSetValues([reps], new Map())).toBe('Recorded');
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
