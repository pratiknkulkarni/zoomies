import { describe, expect, it } from 'vitest';

import { bestSetTrend, type TrendSet, type TrendValue } from './trend';

const at = (year: number, month: number, day: number, hour = 12): number =>
  new Date(year, month - 1, day, hour).getTime();

const REPS = 'metric-reps';
const HOLD = 'metric-hold';

/** A set and its one measurement, which is the shape most of these need. */
const logged = (
  id: string,
  sessionId: string,
  performedAt: number,
  value: number | null,
  metricId = REPS,
): { set: TrendSet; value: TrendValue } => ({
  set: { id, sessionId, performedAt },
  value: { setId: id, exerciseMetricId: metricId, valueNum: value },
});

const split = (rows: ReturnType<typeof logged>[]) => ({
  sets: rows.map((row) => row.set),
  values: rows.map((row) => row.value),
});

describe('bestSetTrend', () => {
  it('is null with nothing logged', () => {
    expect(bestSetTrend([], [], REPS)).toBeNull();
  });

  it('is null when the metric has no recorded value', () => {
    const { sets, values } = split([
      logged('s1', 'sess1', at(2026, 8, 12), 10, HOLD),
    ]);

    // Asking for a metric this exercise records nothing for. Drawing an empty
    // pair of axes would claim there was a trend and it was flat.
    expect(bestSetTrend(sets, values, REPS)).toBeNull();
  });

  it('is null when every value went unrecorded', () => {
    const { sets, values } = split([
      logged('s1', 'sess1', at(2026, 8, 12), null),
      logged('s2', 'sess1', at(2026, 8, 12), null),
    ]);

    // Invariant 2. Two sets happened and neither was measured, which is not the
    // same as two sets of zero.
    expect(bestSetTrend(sets, values, REPS)).toBeNull();
  });

  it('takes the best set of each session, one point apiece', () => {
    const { sets, values } = split([
      logged('s1', 'sess1', at(2026, 8, 3), 8),
      logged('s2', 'sess1', at(2026, 8, 3), 11),
      logged('s3', 'sess1', at(2026, 8, 3), 9),
      logged('s4', 'sess2', at(2026, 8, 10), 12),
    ]);

    const trend = bestSetTrend(sets, values, REPS);

    expect(trend?.points).toHaveLength(2);
    expect(trend?.points[0]?.value).toBe(11);
    expect(trend?.points[1]?.value).toBe(12);
  });

  it('ignores a set whose session is not in the record', () => {
    // The caller filters deleted sets and unfinished sessions. A value left over
    // here belongs to a set that is not on the screen.
    const trend = bestSetTrend(
      [{ id: 's1', sessionId: 'sess1', performedAt: at(2026, 8, 3) }],
      [
        { setId: 's1', exerciseMetricId: REPS, valueNum: 9 },
        { setId: 'gone', exerciseMetricId: REPS, valueNum: 99 },
      ],
      REPS,
    );

    expect(trend?.points).toHaveLength(1);
    expect(trend?.max).toBe(9);
  });

  it('never counts an unrecorded value as a low', () => {
    const { sets, values } = split([
      logged('s1', 'sess1', at(2026, 8, 3), 10),
      logged('s2', 'sess2', at(2026, 8, 10), null),
      logged('s3', 'sess2', at(2026, 8, 10), 12),
    ]);

    const trend = bestSetTrend(sets, values, REPS);

    // Invariant 2 again, and this is the one that would look plausible: a null
    // read as 0 would drag the axis to zero and put the second session at the
    // bottom of a chart it is at the top of.
    expect(trend?.min).toBe(10);
    expect(trend?.max).toBe(12);
  });

  it('keeps zero, which is a value someone entered', () => {
    const { sets, values } = split([
      logged('s1', 'sess1', at(2026, 8, 3), 0),
      logged('s2', 'sess2', at(2026, 8, 10), 6),
    ]);

    expect(bestSetTrend(sets, values, REPS)?.min).toBe(0);
  });

  it('scales the range from the low to the high', () => {
    const { sets, values } = split([
      logged('s1', 'sess1', at(2026, 8, 3), 6),
      logged('s2', 'sess2', at(2026, 8, 5), 9),
      logged('s3', 'sess3', at(2026, 8, 10), 12),
    ]);

    const trend = bestSetTrend(sets, values, REPS);

    expect(trend?.points.map((point) => point.y)).toEqual([0, 0.5, 1]);
  });

  it('centres a flat history rather than dividing by nothing', () => {
    const { sets, values } = split([
      logged('s1', 'sess1', at(2026, 8, 3), 10),
      logged('s2', 'sess2', at(2026, 8, 10), 10),
    ]);

    const trend = bestSetTrend(sets, values, REPS);

    // Range zero. Every answer to "where in the range" is equally true, and the
    // middle is the one that does not imply a high or a low.
    expect(trend?.points.map((point) => point.y)).toEqual([0.5, 0.5]);
    expect(trend?.min).toBe(10);
    expect(trend?.max).toBe(10);
  });

  it('draws one session as one dot, not a crash and not a line', () => {
    const { sets, values } = split([
      logged('s1', 'sess1', at(2026, 8, 12), 9),
    ]);

    const trend = bestSetTrend(sets, values, REPS);

    expect(trend?.points).toHaveLength(1);
    expect(trend?.points[0]?.y).toBe(0.5);

    /*
      The window ends on this session's *week*, so the dot sits near the right
      edge rather than on it — 12 Aug 2026 is a Wednesday, day 86 of the 91 the
      window covers, and the last column runs to the Sunday. Whole columns are
      what the month axis is laid out in, and a window that stopped on the day
      would put a Wednesday label where a month boundary is not.
    */
    expect(trend?.points[0]?.x).toBeCloseTo(86 / 90, 10);
    expect(trend?.weeks).toBe(13);
    expect(trend?.leading).toBe(12);
  });

  it('positions by date, so a gap is a gap', () => {
    const { sets, values } = split([
      logged('s1', 'sess1', at(2026, 7, 27), 8),
      logged('s2', 'sess2', at(2026, 8, 3), 9),
      // Three weeks later, not the next session along.
      logged('s3', 'sess3', at(2026, 8, 24), 10),
    ]);

    const trend = bestSetTrend(sets, values, REPS);
    const [one, two, three] = trend?.points ?? [];

    // Spaced one per session, the second gap would equal the first. The whole
    // reason the chart is dots is that it must not say that.
    const firstGap = (two?.x ?? 0) - (one?.x ?? 0);
    const secondGap = (three?.x ?? 0) - (two?.x ?? 0);

    expect(secondGap).toBeCloseTo(firstGap * 3, 10);
  });

  it('puts two sessions on one day at the same place', () => {
    const { sets, values } = split([
      logged('s1', 'sess1', at(2026, 8, 12, 7), 9),
      logged('s2', 'sess2', at(2026, 8, 12, 19), 11),
    ]);

    const trend = bestSetTrend(sets, values, REPS);

    expect(trend?.points).toHaveLength(2);
    expect(trend?.points[0]?.x).toBe(trend?.points[1]?.x);
    // Same column, different heights — which is what two sessions in a day is.
    expect(trend?.points.map((point) => point.y)).toEqual([0, 1]);
  });

  it('sits a session on the day it started, whichever set was best', () => {
    const { sets, values } = split([
      logged('s1', 'sess1', at(2026, 8, 12, 23), 9),
      // Past midnight, and the better set. The dot belongs to the 12th.
      logged('s2', 'sess1', at(2026, 8, 13, 1), 14),
    ]);

    const trend = bestSetTrend(sets, values, REPS);

    expect(trend?.points).toHaveLength(1);
    expect(trend?.points[0]?.value).toBe(14);
    expect(trend?.points[0]?.atMs).toBe(at(2026, 8, 12, 0));
  });

  it('is thirteen columns wide until the history is wider', () => {
    const short = split([
      logged('s1', 'sess1', at(2026, 8, 3), 9),
      logged('s2', 'sess2', at(2026, 8, 10), 10),
    ]);
    const long = split([
      logged('s1', 'sess1', at(2026, 1, 5), 9),
      logged('s2', 'sess2', at(2026, 8, 10), 10),
    ]);

    expect(bestSetTrend(short.sets, short.values, REPS)?.weeks).toBe(13);

    // 5 Jan 2026 is a Monday, 31 weeks before the week of 10 Aug.
    expect(bestSetTrend(long.sets, long.values, REPS)?.weeks).toBe(32);
    expect(bestSetTrend(long.sets, long.values, REPS)?.leading).toBe(0);
  });

  it('spans the months the columns fall in', () => {
    const { sets, values } = split([
      logged('s1', 'sess1', at(2026, 7, 29), 9),
      logged('s2', 'sess2', at(2026, 8, 10), 10),
    ]);

    const trend = bestSetTrend(sets, values, REPS);

    // Weeks of 27 Jul, 3 Aug, 10 Aug — the first belongs to July even though
    // five of its days are in August. Same rule as the day grid, same function.
    expect(trend?.months).toEqual([
      { monthMs: at(2026, 7, 1, 0), columns: 1 },
      { monthMs: at(2026, 8, 1, 0), columns: 2 },
    ]);
    expect(trend?.leading).toBe(10);
  });

  it('reads one metric at a time', () => {
    const { sets, values } = split([
      logged('s1', 'sess1', at(2026, 8, 3), 9, REPS),
      logged('s2', 'sess1', at(2026, 8, 3), 40, HOLD),
    ]);

    expect(bestSetTrend(sets, values, REPS)?.max).toBe(9);
    expect(bestSetTrend(sets, values, HOLD)?.max).toBe(40);
  });

  it('is order-independent', () => {
    const rows = [
      logged('s1', 'sess1', at(2026, 7, 29), 8),
      logged('s2', 'sess2', at(2026, 8, 5), 12),
      logged('s3', 'sess2', at(2026, 8, 5), 9),
      logged('s4', 'sess3', at(2026, 8, 12), 10),
    ];

    const forward = split(rows);
    const backward = split([...rows].reverse());

    expect(bestSetTrend(forward.sets, forward.values, REPS)).toEqual(
      bestSetTrend(backward.sets, backward.values, REPS),
    );
  });

  it('reports the span it drew, oldest first', () => {
    const { sets, values } = split([
      logged('s1', 'sess2', at(2026, 8, 10), 10),
      logged('s2', 'sess1', at(2026, 8, 3), 9),
    ]);

    const trend = bestSetTrend(sets, values, REPS);

    expect(trend?.fromMs).toBe(at(2026, 8, 3, 0));
    expect(trend?.toMs).toBe(at(2026, 8, 10, 0));
    expect(trend?.points.map((point) => point.sessionId)).toEqual([
      'sess1',
      'sess2',
    ]);
  });
});
