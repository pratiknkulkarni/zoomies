import { describe, expect, it } from 'vitest';

import { matchesQuery } from './search';

describe('matchesQuery', () => {
  it('ignores case in both directions', () => {
    expect(matchesQuery('Pull-Up', 'pull')).toBe(true);
    expect(matchesQuery('pull-up', 'PULL')).toBe(true);
  });

  it('matches anywhere in the name, not just the start', () => {
    expect(matchesQuery('One-Arm Pull-Up', 'pull')).toBe(true);
  });

  /** An empty field means unfiltered, never no results. */
  it('matches everything when the query is empty or blank', () => {
    expect(matchesQuery('Pull-Up', '')).toBe(true);
    expect(matchesQuery('Pull-Up', '   ')).toBe(true);
  });

  it('ignores whitespace around the query', () => {
    expect(matchesQuery('Pull-Up', '  pull  ')).toBe(true);
  });

  it('does not match what is not there', () => {
    expect(matchesQuery('Pull-Up', 'squat')).toBe(false);
  });
});
