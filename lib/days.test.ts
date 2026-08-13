import { describe, expect, it } from 'vitest';

import {
  addDays,
  daysBetween,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from './days';

/** Local time, so the tests read as the calendar the app renders. */
const at = (
  year: number,
  month: number,
  day: number,
  hour = 12,
  minute = 0,
): number => new Date(year, month - 1, day, hour, minute).getTime();

describe('startOfDay', () => {
  it('snaps to midnight', () => {
    expect(startOfDay(at(2026, 8, 15, 23, 59))).toBe(at(2026, 8, 15, 0, 0));
  });

  it('leaves a midnight alone', () => {
    expect(startOfDay(at(2026, 8, 15, 0, 0))).toBe(at(2026, 8, 15, 0, 0));
  });
});

describe('addDays', () => {
  it('crosses a month boundary', () => {
    expect(addDays(at(2026, 7, 31), 1)).toBe(at(2026, 8, 1));
  });

  it('goes back across a year boundary', () => {
    expect(addDays(at(2026, 1, 1), -1)).toBe(at(2025, 12, 31));
  });

  it('lands on 29 February in a leap year', () => {
    expect(addDays(at(2028, 2, 28), 1)).toBe(at(2028, 2, 29));
  });
});

describe('startOfWeek', () => {
  it('leaves a Monday where it is', () => {
    // 10 August 2026 is a Monday.
    expect(startOfWeek(at(2026, 8, 10, 9, 30))).toBe(at(2026, 8, 10, 0, 0));
  });

  it('takes a Sunday back six days, not forward one', () => {
    // 16 August 2026 is a Sunday: the week it ends, not the one it precedes.
    expect(startOfWeek(at(2026, 8, 16))).toBe(at(2026, 8, 10, 0, 0));
  });

  it('takes a midweek day back to its Monday', () => {
    expect(startOfWeek(at(2026, 8, 13))).toBe(at(2026, 8, 10, 0, 0));
  });
});

describe('startOfMonth', () => {
  it('snaps to the first at midnight', () => {
    expect(startOfMonth(at(2026, 8, 15, 23, 0))).toBe(at(2026, 8, 1, 0, 0));
  });
});

describe('daysBetween', () => {
  it('counts calendar boundaries, not elapsed hours', () => {
    // 23:59 to 00:01 is two minutes and one day.
    expect(daysBetween(at(2026, 8, 14, 23, 59), at(2026, 8, 15, 0, 1))).toBe(1);
  });

  it('is zero within one day', () => {
    expect(daysBetween(at(2026, 8, 15, 0, 1), at(2026, 8, 15, 23, 59))).toBe(0);
  });

  it('is negative going backwards', () => {
    expect(daysBetween(at(2026, 8, 15), at(2026, 8, 14))).toBe(-1);
  });

  it('survives a long span containing daylight-saving changes', () => {
    // 6 May to 15 August 2026 is 101 days, and in a zone that observes it the
    // clocks have moved in between. Dividing raw milliseconds would give
    // 100.958 or 101.042 and flooring it would give 100.
    expect(daysBetween(at(2026, 5, 6), at(2026, 8, 15))).toBe(101);
  });

  it('counts a whole year', () => {
    expect(daysBetween(at(2026, 1, 1), at(2027, 1, 1))).toBe(365);
  });
});
