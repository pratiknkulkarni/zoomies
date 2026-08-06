import { describe, expect, it } from 'vitest';

import {
  formatClock,
  formatMetricDetail,
  formatMetricSummary,
  formatSlotTally,
} from './format';

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
        { name: 'Reps', unit: 'reps' },
        { name: 'Added load', unit: 'kg' },
      ]),
    ).toBe('Reps · Added load (kg)');
  });

  // The caller passes this straight to `ListRow`, which omits the subtitle
  // entirely rather than rendering a blank line under the name.
  it('is undefined when an exercise records nothing', () => {
    expect(formatMetricSummary([])).toBeUndefined();
  });
});

describe('formatMetricDetail', () => {
  it('names the metric logged first, since position alone does not say it', () => {
    expect(formatMetricDetail({ type: 'duration', unit: 's' }, true)).toBe(
      'Logged first · seconds',
    );
  });

  it('says only what the others measure', () => {
    expect(formatMetricDetail({ type: 'number', unit: 'kg' }, false)).toBe(
      'kilograms',
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
