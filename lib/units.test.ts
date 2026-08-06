import { describe, expect, it } from 'vitest';

import { unitsFor } from './units';

describe('unitsFor', () => {
  it('offers kg to a number and seconds to a duration, never the reverse', () => {
    expect(unitsFor('number', [])).toEqual(['kg']);
    expect(unitsFor('duration', [])).toEqual(['s']);
  });

  it('offers a count nothing, since Reps is its own unit', () => {
    expect(unitsFor('notes', [])).toEqual([]);
  });

  it('keeps a deliberately created unit, after the canonical ones', () => {
    expect(unitsFor('number', ['m'])).toEqual(['kg', 'm']);
  });

  it('does not repeat a canonical unit that is also in use', () => {
    expect(unitsFor('number', ['kg', 'm'])).toEqual(['kg', 'm']);
    expect(unitsFor('duration', ['s'])).toEqual(['s']);
  });

  /**
   * The failure this whole design exists to prevent: units in use are no longer
   * the source of the list, so nothing from another type leaks in.
   */
  it('ignores units in use by a different metric type', () => {
    expect(unitsFor('duration', [])).not.toContain('kg');
  });
});
