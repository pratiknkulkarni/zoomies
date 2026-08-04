import { describe, expect, it } from 'vitest';

import {
  formatMetricDetail,
  formatMetricRole,
  formatMetricSummary,
} from './format';

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

describe('formatMetricRole', () => {
  // The editor makes name and unit fields, so its caption can only describe
  // what is fixed.
  it('describes only what cannot be edited', () => {
    expect(formatMetricRole('duration', true)).toBe('Primary · Duration');
    expect(formatMetricRole('number', false)).toBe('Number');
  });
});

describe('formatMetricDetail', () => {
  it('names the primary metric, since position alone does not say it', () => {
    expect(formatMetricDetail({ type: 'duration', unit: 's' }, true)).toBe(
      'Primary · Duration · s',
    );
  });

  it('says nothing extra about the others', () => {
    expect(formatMetricDetail({ type: 'number', unit: 'kg' }, false)).toBe(
      'Number · kg',
    );
  });

  it('leaves out a unit that was never recorded', () => {
    expect(formatMetricDetail({ type: 'notes', unit: null }, false)).toBe(
      'Notes',
    );
  });
});
