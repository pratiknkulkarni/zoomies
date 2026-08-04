import { describe, expect, it } from 'vitest';

import { movedOnePlace, renumber } from './ordering';

/** Collects what `renumber` would have written, in order. */
function recorder() {
  const writes: [string, number][] = [];
  return {
    writes,
    write: (id: string, displayOrder: number) => {
      writes.push([id, displayOrder]);
      return Promise.resolve();
    },
  };
}

const rows = (...pairs: [string, number][]) =>
  pairs.map(([id, displayOrder]) => ({ id, displayOrder }));

describe('renumber', () => {
  it('writes nothing when the order is already correct', async () => {
    const { writes, write } = recorder();
    const ordered = rows(['a', 0], ['b', 1], ['c', 2]);

    await renumber(ordered, ordered, write);

    expect(writes).toEqual([]);
  });

  it('writes only the rows whose index actually changed', async () => {
    const { writes, write } = recorder();
    const previous = rows(['a', 0], ['b', 1], ['c', 2]);

    // b and a swap; c is untouched at index 2.
    await renumber(previous, [{ id: 'b' }, { id: 'a' }, { id: 'c' }], write);

    expect(writes).toEqual([
      ['b', 0],
      ['a', 1],
    ]);
  });

  it('closes the gap a removed row leaves behind', async () => {
    const { writes, write } = recorder();
    const previous = rows(['a', 0], ['b', 1], ['c', 2]);

    await renumber(previous, [{ id: 'a' }, { id: 'c' }], write);

    expect(writes).toEqual([['c', 1]]);
  });

  // Renumbering the whole set rather than swapping two values is what makes
  // "the first one is primary" true rather than approximately true.
  it('heals an order left non-contiguous by an earlier delete', async () => {
    const { writes, write } = recorder();
    const previous = rows(['a', 0], ['c', 5], ['d', 9]);

    await renumber(previous, previous, write);

    expect(writes).toEqual([
      ['c', 1],
      ['d', 2],
    ]);
  });
});

describe('movedOnePlace', () => {
  const ordered = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('moves a row up one place', () => {
    expect(movedOnePlace(ordered, 'c', 'up')).toEqual([
      { id: 'a' },
      { id: 'c' },
      { id: 'b' },
    ]);
  });

  it('moves a row down one place', () => {
    expect(movedOnePlace(ordered, 'a', 'down')).toEqual([
      { id: 'b' },
      { id: 'a' },
      { id: 'c' },
    ]);
  });

  it('refuses to move the first row up', () => {
    expect(movedOnePlace(ordered, 'a', 'up')).toBeNull();
  });

  it('refuses to move the last row down', () => {
    expect(movedOnePlace(ordered, 'c', 'down')).toBeNull();
  });

  it('refuses to move a row that is not there', () => {
    expect(movedOnePlace(ordered, 'missing', 'up')).toBeNull();
  });

  it('does not mutate the array it was given', () => {
    const before = [...ordered];
    movedOnePlace(ordered, 'b', 'up');
    expect(ordered).toEqual(before);
  });
});
