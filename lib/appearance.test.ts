import { describe, expect, it } from 'vitest';

import { APPEARANCES, parseAppearance } from './appearance';

describe('parseAppearance', () => {
  it('accepts each of the three', () => {
    for (const option of APPEARANCES) {
      expect(parseAppearance(option)).toBe(option);
    }
  });

  it('falls back to the system setting rather than throwing', () => {
    // Read before the first frame. A throw here is a blank launch, and the
    // stored value can be anything — hand-edited, or written by a later
    // version of the application.
    expect(parseAppearance(null)).toBe('system');
    expect(parseAppearance(undefined)).toBe('system');
    expect(parseAppearance('')).toBe('system');
    expect(parseAppearance('sepia')).toBe('system');
    expect(parseAppearance('Dark')).toBe('system');
  });
});
