import { describe, expect, it } from 'vitest';

import { describeMeasure, presetFor, presetsNotOn } from './metrics';

describe('presetFor', () => {
  it('identifies a metric by what it stores, not by its name', () => {
    expect(presetFor({ type: 'duration', unit: 's' })?.key).toBe('hold');
    expect(presetFor({ type: 'number', unit: 'kg' })?.key).toBe('load');
    expect(presetFor({ type: 'number', unit: null })?.key).toBe('reps');
  });

  /**
   * The failure that started this: `number` covers both a count and a load, so
   * the type alone cannot say which. The unit is the other half of the pair.
   */
  it('tells a count apart from a load, which share a type', () => {
    expect(presetFor({ type: 'number', unit: null })?.key).not.toBe(
      presetFor({ type: 'number', unit: 'kg' })?.key,
    );
  });

  it('matches nothing for a pair no preset covers', () => {
    expect(presetFor({ type: 'number', unit: 'm' })).toBeUndefined();
  });
});

describe('describeMeasure', () => {
  it('uses the words the metric was chosen with', () => {
    expect(describeMeasure({ type: 'number', unit: null })).toBe('a count');
    expect(describeMeasure({ type: 'number', unit: 'kg' })).toBe('kilograms');
    expect(describeMeasure({ type: 'duration', unit: 's' })).toBe('seconds');
    expect(describeMeasure({ type: 'notes', unit: null })).toBe('text');
  });

  // Migrated rows may hold anything; describing beats claiming it is invalid.
  it('falls back for a unit no preset knows', () => {
    expect(describeMeasure({ type: 'number', unit: 'm' })).toBe('a number in m');
    expect(describeMeasure({ type: 'duration', unit: null })).toBe('seconds');
  });
});

describe('presetsNotOn', () => {
  it('offers only what the exercise does not already record', () => {
    const keys = presetsNotOn([
      { type: 'number', unit: null },
      { type: 'number', unit: 'kg' },
    ]).map((preset) => preset.key);

    expect(keys).toEqual(['hold', 'notes']);
  });

  it('offers nothing once all four are present', () => {
    expect(
      presetsNotOn([
        { type: 'number', unit: null },
        { type: 'number', unit: 'kg' },
        { type: 'duration', unit: 's' },
        { type: 'notes', unit: null },
      ]),
    ).toEqual([]);
  });

  // An unrecognised metric blocks nothing — it is not one of the four.
  it('still offers everything alongside a metric no preset covers', () => {
    expect(presetsNotOn([{ type: 'number', unit: 'm' }])).toHaveLength(4);
  });
});
