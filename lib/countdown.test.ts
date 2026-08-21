import { describe, expect, it } from 'vitest';

import { cueDue, FINAL_MARK } from './countdown';
import { formatClock } from './format';

const s = (seconds: number) => seconds * 1000;

/**
 * Walks a countdown down from `from` at `step` intervals, collecting what it
 * announced — the shape the components use it in, where the only state carried
 * between repaints is the last mark made.
 */
function run(from: number, step = 200, to = 0): number[] {
  const marks: number[] = [];
  let announced: number | null = null;

  for (let left = from; left >= to; left -= step) {
    const due = cueDue(left, announced);

    if (due) {
      announced = due.mark;
      marks.push(due.mark);
    }
  }

  return marks;
}

describe('cueDue', () => {
  it('says nothing until three seconds are left', () => {
    expect(cueDue(s(60), null)).toBeNull();
    expect(cueDue(s(4), null)).toBeNull();
    expect(cueDue(s(3) + 1, null)).toBeNull();
  });

  it('counts three, two, one and stops', () => {
    expect(run(s(10))).toEqual([s(3), s(2), s(1)]);
  });

  it('makes each mark once, however often it is asked', () => {
    expect(cueDue(s(3), null)?.mark).toBe(s(3));
    expect(cueDue(s(3) - 200, s(3))).toBeNull();
    expect(cueDue(s(2) + 200, s(3))).toBeNull();
  });

  it('ends on a different sound to the two that count', () => {
    expect(cueDue(s(3), null)?.cue).toBe('tick');
    expect(cueDue(s(2), s(3))?.cue).toBe('tick');
    expect(cueDue(s(1), s(2))?.cue).toBe('final');
  });

  /**
   * A rest of two seconds is a real slot setting. It gets the seconds it has
   * rather than none at all.
   */
  it('starts mid-count when the countdown is shorter than three seconds', () => {
    expect(run(s(2))).toEqual([s(2), s(1)]);
    expect(run(s(1))).toEqual([s(1)]);
  });

  /**
   * FEATURES.md §8.1 — the figure is derived from a timestamp, so returning
   * after two minutes away lands straight on a finished countdown. The seconds
   * before it are gone and replaying them would announce time that is not
   * there; the end itself still gets said, because that one is a fact about the
   * set.
   */
  it('skips marks that went by while the app was away, but never the last', () => {
    expect(cueDue(0, null)).toEqual({ mark: FINAL_MARK, cue: 'final' });
    expect(run(0, 200, -s(90))).toEqual([s(1)]);
    expect(cueDue(s(1) - 900, null)?.cue).toBe('final');
  });

  it('announces nothing more once the end has been announced', () => {
    expect(cueDue(0, FINAL_MARK)).toBeNull();
    expect(cueDue(-s(30), FINAL_MARK)).toBeNull();
  });

  /**
   * The point of the marks being a second apart: each is announced during the
   * second the display spends reading that figure, because `formatClock` rounds
   * up. Three beeps and `3`, `2`, `1` on the screen are the same count.
   */
  it('announces each mark while the figure reads it', () => {
    let announced: number | null = null;

    for (const [left, reads] of [
      [s(3), '0:03'],
      [s(2), '0:02'],
      [s(1), '0:01'],
    ] as const) {
      const due = cueDue(left, announced);

      expect(formatClock(left)).toBe(reads);
      expect(due?.mark).toBe(left);
      announced = due?.mark ?? announced;
    }
  });

  /**
   * A repaint every 200ms is what the components run; a slower one must not
   * lose a mark it stepped over.
   */
  it('does not drop a mark at a coarser repaint', () => {
    expect(run(s(5), 700)).toEqual([s(3), s(2), s(1)]);
    expect(run(s(5), 950)).toEqual([s(3), s(2), s(1)]);
  });
});
