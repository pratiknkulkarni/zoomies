import { describe, expect, it } from 'vitest';

import { beatenOn, bestValue } from './completion';

describe('beatenOn', () => {
  it('needs a majority, not a single lucky set', () => {
    expect(beatenOn([10, 7, 6], 8)).toBe(false);
    expect(beatenOn([10, 10, 6], 8)).toBe(true);
  });

  /** Half is not a majority. Two of four is a session that went both ways. */
  it('does not treat exactly half as a majority', () => {
    expect(beatenOn([10, 10, 8, 7], 8)).toBe(false);
  });

  it('counts every set, including the ones that beat it', () => {
    expect(beatenOn([9, 9, 9], 8)).toBe(true);
  });

  // Hitting the target is what the target is for. Raising on a tie would mean
  // a target could never be met, only exceeded or failed.
  it('does not count a tie as a beat', () => {
    expect(beatenOn([8, 8, 8], 8)).toBe(false);
    expect(beatenOn([8, 8, 9], 8)).toBe(false);
  });

  /**
   * A set with this metric unrecorded still happened (invariant 2). Dropping
   * it would let two measured sets out of five carry a raise.
   */
  it('counts an unrecorded set without letting it beat anything', () => {
    expect(beatenOn([10, 10, null, null, null], 8)).toBe(false);
    expect(beatenOn([10, 10, 10, null, null], 8)).toBe(true);
  });

  it('offers nothing for an exercise that logged nothing', () => {
    expect(beatenOn([], 8)).toBe(false);
    expect(beatenOn([null, null], 8)).toBe(false);
  });

  /** Durations are targets too — a 30-second hold held for 45. */
  it('works on seconds as readily as on reps', () => {
    expect(beatenOn([45, 42, 31], 30)).toBe(true);
  });
});

describe('bestValue', () => {
  it('is the best of what was logged, which is what a raise offers', () => {
    expect(bestValue([8, 11, 9])).toBe(11);
  });

  it('ignores unrecorded sets rather than reading them as zero', () => {
    expect(bestValue([null, 9, null])).toBe(9);
  });

  it('is null when nothing was recorded, because zero would be a claim', () => {
    expect(bestValue([])).toBeNull();
    expect(bestValue([null, null])).toBeNull();
  });
});
