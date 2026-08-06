import { describe, expect, it } from 'vitest';

import { describeMeasure, presetFor, presetsNotOn } from './metrics';

describe('presetFor', () => {
  it('identifies a metric by what it stores, not by its name', () => {
    expect(presetFor({ type: 'duration', unit: 's' })?.key).toBe('hold');
    expect(presetFor({ type: 'number', unit: null })?.key).toBe('reps');
    expect(presetFor({ type: 'notes', unit: null })?.key).toBe('notes');
  });

  it('matches nothing for a pair no preset covers', () => {
    expect(presetFor({ type: 'number', unit: 'm' })).toBeUndefined();
  });

  /**
   * Added load is removed (§15), but migration 0004 only soft-deletes the
   * metrics — a database restored from an export, or one where the migration
   * has not run yet, can still hold one. It must describe rather than break.
   */
  it('no longer matches added load, which is gone', () => {
    expect(presetFor({ type: 'number', unit: 'kg' })).toBeUndefined();
  });
});

describe('describeMeasure', () => {
  it('uses the words the metric was chosen with', () => {
    expect(describeMeasure({ type: 'number', unit: null })).toBe('a count');
    expect(describeMeasure({ type: 'duration', unit: 's' })).toBe('seconds');
    expect(describeMeasure({ type: 'notes', unit: null })).toBe('text');
  });

  // Migrated rows may hold anything; describing beats claiming it is invalid.
  it('falls back for a unit no preset knows', () => {
    expect(describeMeasure({ type: 'number', unit: 'm' })).toBe('a number in m');
    expect(describeMeasure({ type: 'duration', unit: null })).toBe('seconds');
  });

  /** A load metric that outlived the feature still reads as something. */
  it('describes a leftover added load rather than breaking on it', () => {
    expect(describeMeasure({ type: 'number', unit: 'kg' })).toBe(
      'a number in kg',
    );
  });
});

describe('presetsNotOn', () => {
  it('offers only what the exercise does not already record', () => {
    const keys = presetsNotOn([{ type: 'number', unit: null }]).map(
      (preset) => preset.key,
    );

    expect(keys).toEqual(['hold', 'notes']);
  });

  it('offers nothing once all three are present', () => {
    expect(
      presetsNotOn([
        { type: 'number', unit: null },
        { type: 'duration', unit: 's' },
        { type: 'notes', unit: null },
      ]),
    ).toEqual([]);
  });

  // An unrecognised metric blocks nothing — it is not one of the three. A
  // leftover added load is exactly this case.
  it('still offers everything alongside a metric no preset covers', () => {
    expect(presetsNotOn([{ type: 'number', unit: 'm' }])).toHaveLength(3);
    expect(presetsNotOn([{ type: 'number', unit: 'kg' }])).toHaveLength(3);
  });
});
