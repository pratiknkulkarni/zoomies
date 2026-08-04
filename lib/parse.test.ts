import { describe, expect, it } from 'vitest';

import { fromNullableNumber, toNullableFloat, toNullableInt } from './parse';

describe('toNullableInt', () => {
  it('reads a number', () => {
    expect(toNullableInt('60')).toBe(60);
  });

  // Invariant 2. A rest timer of 0 and no rest timer at all are different
  // instructions, and this is the boundary where they could be confused.
  it('keeps zero distinct from not recorded', () => {
    expect(toNullableInt('0')).toBe(0);
    expect(toNullableInt('')).toBeNull();
  });

  it('treats whitespace as not recorded', () => {
    expect(toNullableInt('   ')).toBeNull();
  });

  it('ignores surrounding whitespace', () => {
    expect(toNullableInt(' 8 ')).toBe(8);
  });

  it('truncates rather than rounding, since the column is an integer', () => {
    expect(toNullableInt('8.9')).toBe(8);
  });

  it('reads unparseable input as not recorded rather than guessing', () => {
    expect(toNullableInt('abc')).toBeNull();
    expect(toNullableInt('Infinity')).toBeNull();
  });
});

describe('toNullableFloat', () => {
  it('keeps a fractional measurement, because 2.5 kg is a real load', () => {
    expect(toNullableFloat('2.5')).toBe(2.5);
  });

  it('keeps zero distinct from not recorded', () => {
    expect(toNullableFloat('0')).toBe(0);
    expect(toNullableFloat('')).toBeNull();
  });

  it('reads unparseable input as not recorded', () => {
    expect(toNullableFloat('kg')).toBeNull();
  });
});

describe('fromNullableNumber', () => {
  it('shows an empty field for what was never recorded', () => {
    expect(fromNullableNumber(null)).toBe('');
  });

  it('shows zero as zero', () => {
    expect(fromNullableNumber(0)).toBe('0');
  });

  it('round-trips through the parser', () => {
    expect(toNullableInt(fromNullableNumber(60))).toBe(60);
    expect(toNullableInt(fromNullableNumber(null))).toBeNull();
  });
});
