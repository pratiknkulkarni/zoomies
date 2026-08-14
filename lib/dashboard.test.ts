import { describe, expect, it } from 'vitest';

import {
  daysTrainedGrid,
  longestSinceTrained,
  recentRecords,
  trainingCounts,
  type RankedRow,
} from './dashboard';

const at = (
  year: number,
  month: number,
  day: number,
  hour = 12,
): number => new Date(year, month - 1, day, hour).getTime();

/** 15 August 2026 is a Saturday. Its Monday is the 10th. */
const NOW = at(2026, 8, 15, 10);

describe('daysTrainedGrid', () => {
  it('is null with nothing logged', () => {
    expect(daysTrainedGrid([], NOW)).toBeNull();
  });

  it('is thirteen columns wide while the history is narrower', () => {
    const week = daysTrainedGrid([at(2026, 8, 12)], NOW);

    // The *column* never depends on how long the app has been in use. It did,
    // and week two got two columns to fill a phone with.
    expect(week?.rows).toHaveLength(7);
    expect(week?.rows[0]).toHaveLength(13);

    expect(week?.fromMs).toBe(at(2026, 8, 12, 0));
    expect(week?.toMs).toBe(at(2026, 8, 15, 0));
  });

  it('grows a column a week past the floor, rather than forgetting', () => {
    const years = daysTrainedGrid([at(2024, 1, 1), at(2026, 8, 12)], NOW);

    // 1 Jan 2024 is a Monday, 136 weeks before the week of 10 Aug 2026 — so
    // 137 columns, both ends included. Thirteen was a cap until Phase 11 and
    // everything before this column was simply unreachable.
    expect(years?.rows[0]).toHaveLength(137);
    expect(years?.leading).toBe(0);
    expect(years?.rows[0]?.[0]?.state).toBe('trained');
  });

  it('meets the floor and the span at the same column', () => {
    // The week of 18 May 2026 is the thirteenth column back from the week of
    // 10 Aug. One more week of history is one more column, not a scroll into
    // held-open blank.
    const thirteen = daysTrainedGrid([at(2026, 5, 18)], NOW);
    const fourteen = daysTrainedGrid([at(2026, 5, 11)], NOW);

    expect(thirteen?.rows[0]).toHaveLength(13);
    expect(thirteen?.leading).toBe(0);
    expect(fourteen?.rows[0]).toHaveLength(14);
    expect(fourteen?.leading).toBe(0);
  });

  it('draws nothing before the first session, and says how much', () => {
    const grid = daysTrainedGrid([at(2026, 8, 12)], NOW);

    // Twelve columns of held-open width, then the week of the 10th.
    expect(grid?.leading).toBe(12);
    expect(grid?.rows[0]?.[0]?.state).toBe('before');
    expect(grid?.rows[6]?.[11]?.state).toBe('before');
  });

  it('draws from the first session to the day, not to the week', () => {
    // 12 August is a Wednesday. Monday and Tuesday of that week are days the
    // app knew nothing about, and an outlined square would report them as
    // skipped.
    const grid = daysTrainedGrid([at(2026, 8, 12)], NOW);

    expect(grid?.rows[0]?.at(-1)?.state).toBe('before');
    expect(grid?.rows[1]?.at(-1)?.state).toBe('before');
    expect(grid?.rows[2]?.at(-1)?.state).toBe('trained');
  });

  it('gives back a column of width a week', () => {
    const grid = daysTrainedGrid([at(2026, 7, 29)], NOW);

    // Weeks of 27 Jul, 3 Aug and 10 Aug are drawn; the other ten are not.
    expect(grid?.leading).toBe(10);
  });

  it('holds no blank column once the history is wider than the floor', () => {
    const grid = daysTrainedGrid([at(2024, 1, 1), at(2026, 8, 12)], NOW);

    // `leading` pads a young grid out to a screen's width and then stops
    // mattering, which is what lets one number serve both cases.
    expect(grid?.leading).toBe(0);
    expect(grid?.rows[0]?.[0]?.state).not.toBe('before');
  });

  it('labels the range by the first session, all of which is now drawn', () => {
    const grid = daysTrainedGrid([at(2024, 1, 1), at(2026, 8, 12)], NOW);

    // This used to name the left edge of the cap rather than the first session,
    // because everything earlier was unreachable. Nothing is unreachable now,
    // so the honest label and the drawn one are the same date.
    expect(grid?.fromMs).toBe(at(2024, 1, 1, 0));
  });

  it('fills the day a set was performed and only that day', () => {
    const grid = daysTrainedGrid([at(2026, 8, 12, 19)], NOW);

    // 12 August is a Wednesday: row index 2, Monday first, in the last column.
    expect(grid?.rows[2]?.at(-1)?.state).toBe('trained');
    expect(grid?.rows[3]?.at(-1)?.state).toBe('rest');
  });

  it('folds several sets on one day into one square', () => {
    const grid = daysTrainedGrid(
      [at(2026, 8, 12, 7), at(2026, 8, 12, 19), at(2026, 8, 12, 22)],
      NOW,
    );

    expect(grid?.rows[2]?.at(-1)?.state).toBe('trained');
  });

  it('marks days after today as future, never as rest', () => {
    const grid = daysTrainedGrid([at(2026, 8, 12)], NOW);

    // Saturday is today; Sunday has not happened.
    expect(grid?.rows[5]?.at(-1)?.state).toBe('rest');
    expect(grid?.rows[6]?.at(-1)?.state).toBe('future');
  });

  it('treats today itself as a day that has happened', () => {
    const grid = daysTrainedGrid([at(2026, 8, 15, 9)], NOW);

    expect(grid?.rows[5]?.at(-1)?.state).toBe('trained');
  });

  it('spans months by the column their Monday falls in', () => {
    const grid = daysTrainedGrid([at(2026, 7, 29)], NOW);

    // Weeks of 27 Jul, 3 Aug, 10 Aug — the first belongs to July even though
    // five of its days are in August.
    expect(grid?.months).toEqual([
      { monthMs: at(2026, 7, 1, 0), columns: 1 },
      { monthMs: at(2026, 8, 1, 0), columns: 2 },
    ]);
  });

  it('carries no total, no run and no reset', () => {
    const grid = daysTrainedGrid([at(2026, 8, 10), at(2026, 8, 12)], NOW);

    // §11.6. The shape of the return type is the guarantee: squares and a
    // range, and nowhere to put a streak even if someone wanted one.
    expect(Object.keys(grid ?? {}).sort()).toEqual([
      'fromMs',
      'leading',
      'months',
      'rows',
      'toMs',
    ]);
  });
});

describe('trainingCounts', () => {
  const session = (ms: number) => ({ completedAt: ms, isQuickLog: false });
  const quickLog = (ms: number) => ({ completedAt: ms, isQuickLog: true });

  it('counts sessions and quick logs apart', () => {
    const counts = trainingCounts(
      [
        session(at(2026, 8, 14)),
        session(at(2026, 8, 12)),
        quickLog(at(2026, 8, 13)),
      ],
      NOW,
    );

    expect(counts.sessions).toBe(2);
    expect(counts.quickLogs).toBe(1);
  });

  it('never folds a quick log into the sessions figure', () => {
    const counts = trainingCounts([quickLog(at(2026, 8, 14))], NOW);

    expect(counts.sessions).toBe(0);
    expect(counts.quickLogs).toBe(1);
  });

  it('excludes what falls outside the window', () => {
    const counts = trainingCounts(
      [session(at(2026, 8, 14)), session(at(2026, 6, 1))],
      NOW,
    );

    expect(counts.sessions).toBe(1);
  });

  it('includes today and the twenty-eighth day back', () => {
    const counts = trainingCounts(
      [session(at(2026, 8, 15, 9)), session(at(2026, 7, 19, 9))],
      NOW,
    );

    expect(counts.sessions).toBe(2);
  });

  it('ignores a session that is still running', () => {
    const counts = trainingCounts(
      [{ completedAt: null, isQuickLog: false }, session(at(2026, 8, 14))],
      NOW,
    );

    expect(counts.sessions).toBe(1);
  });

  it('shortens the window to the history when the history is younger', () => {
    const counts = trainingCounts([session(at(2026, 8, 12, 19))], NOW);

    expect(counts.wholeWindow).toBe(false);
    expect(counts.sinceMs).toBe(at(2026, 8, 12, 0));
  });

  it('keeps the full window once training runs past it', () => {
    const counts = trainingCounts(
      [session(at(2026, 8, 14)), session(at(2026, 5, 1))],
      NOW,
    );

    expect(counts.wholeWindow).toBe(true);
    expect(counts.sinceMs).toBe(at(2026, 7, 19, 0));
  });

  it('reports nothing rather than dividing by an absent history', () => {
    const counts = trainingCounts([], NOW);

    expect(counts).toMatchObject({ sessions: 0, quickLogs: 0, wholeWindow: true });
  });
});

describe('longestSinceTrained', () => {
  it('sorts by the longest gap', () => {
    const result = longestSinceTrained(
      ['a', 'b', 'c'],
      new Map([
        ['a', at(2026, 8, 1)],
        ['b', at(2026, 5, 6)],
        ['c', at(2026, 7, 21)],
      ]),
      NOW,
    );

    expect(result.map((item) => item.exerciseId)).toEqual(['b', 'c', 'a']);
    expect(result.map((item) => item.days)).toEqual([101, 25, 14]);
  });

  it('omits an exercise that has never been trained', () => {
    const result = longestSinceTrained(
      ['a', 'never'],
      new Map([['a', at(2026, 5, 6)]]),
      NOW,
    );

    // Invariant 2: absent is not a very large number of days. Something added
    // yesterday and not yet done is not neglect.
    expect(result.map((item) => item.exerciseId)).toEqual(['a']);
  });

  it('omits anything trained inside the last week', () => {
    const result = longestSinceTrained(
      ['a', 'b'],
      new Map([
        ['a', at(2026, 8, 13)],
        ['b', at(2026, 7, 1)],
      ]),
      NOW,
    );

    expect(result.map((item) => item.exerciseId)).toEqual(['b']);
  });

  it('includes the exercise sitting exactly on the threshold', () => {
    const result = longestSinceTrained(
      ['a'],
      new Map([['a', at(2026, 8, 8)]]),
      NOW,
    );

    expect(result.map((item) => item.days)).toEqual([7]);
  });

  it('is empty when nothing has gone a week', () => {
    const result = longestSinceTrained(
      ['a', 'b'],
      new Map([
        ['a', at(2026, 8, 13)],
        ['b', at(2026, 8, 14)],
      ]),
      NOW,
    );

    expect(result).toEqual([]);
  });

  it('holds to five', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

    const result = longestSinceTrained(
      ids,
      new Map(ids.map((id, index) => [id, at(2026, 7, 1 + index)])),
      NOW,
    );

    expect(result).toHaveLength(5);
  });

  it('is order-independent', () => {
    const last = new Map([
      ['a', at(2026, 5, 6)],
      ['b', at(2026, 6, 6)],
    ]);

    expect(longestSinceTrained(['a', 'b'], last, NOW)).toEqual(
      longestSinceTrained(['b', 'a'], last, NOW),
    );
  });
});

describe('recentRecords, seeded with what came before', () => {
  const row = (
    setId: string,
    value: number,
    performedAt: number,
    metricId = 'hold',
    exerciseId = 'rsh',
  ): RankedRow => ({ exerciseId, metricId, setId, value, performedAt });

  const bar = (best: number) => new Map([['rsh hold', best]]);

  /*
    The caller used to hand over every measurement ever so this could find the
    bar by walking history. The bar is one number per exercise and metric, so it
    is now read in SQL and passed in — which is what lets the rows be only the
    window. These say the seeded number means exactly what the walk meant.
  */

  it('measures against the seeded bar, not only against the window', () => {
    // 40 is lower than the 44 reached before the window opened, so nothing was
    // beaten — where an empty seed would call it a record.
    expect(
      recentRecords([row('1', 40, at(2026, 8, 9))], bar(44), NOW),
    ).toEqual([]);
  });

  it('reports a record against a bar it never saw a row for', () => {
    const result = recentRecords([row('1', 46, at(2026, 8, 9))], bar(44), NOW);

    expect(result).toHaveLength(1);
    expect(result[0]?.value).toBe(46);
    expect(result[0]?.previous).toBe(44);
  });

  it('keeps a tie out, exactly as the walk did', () => {
    expect(
      recentRecords([row('1', 44, at(2026, 8, 9))], bar(44), NOW),
    ).toEqual([]);
  });

  it('still treats a first-ever set as a baseline', () => {
    // No seed for this pair means nothing came before it. An absent bar has to
    // stay absent rather than defaulting to zero, or month one is a wall of
    // records — the rule that made `previous` non-nullable in the first place.
    expect(recentRecords([row('1', 12, at(2026, 8, 9))], new Map(), NOW)).toEqual(
      [],
    );
  });

  it('lets the window overtake the bar and then itself', () => {
    const result = recentRecords(
      [row('1', 46, at(2026, 8, 5)), row('2', 48, at(2026, 8, 9))],
      bar(44),
      NOW,
    );

    // One per exercise and metric, the most recent — three raises in a month is
    // a good month, not three items.
    expect(result).toHaveLength(1);
    expect(result[0]?.value).toBe(48);
    expect(result[0]?.previous).toBe(46);
  });

  it('seeds each exercise and metric separately', () => {
    const result = recentRecords(
      [
        row('1', 20, at(2026, 8, 9), 'reps', 'pullup'),
        row('2', 40, at(2026, 8, 9)),
      ],
      new Map([['pullup reps', 19]]),
      NOW,
    );

    // The hold has no bar, so its 40 is a baseline; the pull-up beat 19.
    expect(result.map((record) => record.exerciseId)).toEqual(['pullup']);
  });
});

describe('recentRecords', () => {
  const row = (
    setId: string,
    value: number,
    performedAt: number,
    metricId = 'hold',
    exerciseId = 'rsh',
  ): RankedRow => ({ exerciseId, metricId, setId, value, performedAt });

  it('reports what a set beat', () => {
    const result = recentRecords(
      [
        row('1', 38, at(2026, 7, 20)),
        row('2', 42, at(2026, 8, 9)),
      ],
      new Map(),
      NOW,
    );

    expect(result).toEqual([
      {
        exerciseId: 'rsh',
        metricId: 'hold',
        value: 42,
        previous: 38,
        performedAt: at(2026, 8, 9),
      },
    ]);
  });

  it('does not call a first-ever set a record', () => {
    expect(recentRecords([row('1', 42, at(2026, 8, 9))], new Map(), NOW)).toEqual([]);
  });

  it('does not call an equalled best a record', () => {
    const result = recentRecords(
      [row('1', 42, at(2026, 7, 20)), row('2', 42, at(2026, 8, 9))],
      new Map(),
      NOW,
    );

    expect(result).toEqual([]);
  });

  it('reports what it beat at the time, not the best of the same day', () => {
    const result = recentRecords(
      [
        row('1', 38, at(2026, 7, 20)),
        row('2', 42, at(2026, 8, 9, 18)),
        row('3', 40, at(2026, 8, 9, 19)),
      ],
      new Map(),
      NOW,
    );

    expect(result[0]?.previous).toBe(38);
  });

  it('excludes a record set before the window', () => {
    const result = recentRecords(
      [row('1', 38, at(2026, 5, 1)), row('2', 42, at(2026, 6, 1))],
      new Map(),
      NOW,
    );

    expect(result).toEqual([]);
  });

  it('keeps a record whose later sets fell short', () => {
    const result = recentRecords(
      [
        row('1', 38, at(2026, 7, 20)),
        row('2', 42, at(2026, 8, 9)),
        row('3', 31, at(2026, 8, 14)),
      ],
      new Map(),
      NOW,
    );

    expect(result[0]?.value).toBe(42);
    expect(result[0]?.performedAt).toBe(at(2026, 8, 9));
  });

  it('gives one row per exercise and metric, the most recent raise', () => {
    const result = recentRecords(
      [
        row('1', 8, at(2026, 7, 20)),
        row('2', 9, at(2026, 8, 3)),
        row('3', 10, at(2026, 8, 12)),
      ],
      new Map(),
      NOW,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ value: 10, previous: 9 });
  });

  it('ranks a duration and a count separately', () => {
    const result = recentRecords(
      [
        row('1', 38, at(2026, 7, 20), 'hold'),
        row('2', 42, at(2026, 8, 9), 'hold'),
        row('3', 8, at(2026, 7, 20), 'reps'),
        row('4', 12, at(2026, 8, 12), 'reps'),
      ],
      new Map(),
      NOW,
    );

    expect(result.map((record) => record.metricId)).toEqual(['reps', 'hold']);
  });

  it('separates two exercises sharing a metric id shape', () => {
    const result = recentRecords(
      [
        row('1', 8, at(2026, 7, 20), 'reps', 'pull-up'),
        row('2', 12, at(2026, 8, 12), 'reps', 'pull-up'),
        row('3', 20, at(2026, 8, 1), 'reps', 'push-up'),
      ],
      new Map(),
      NOW,
    );

    expect(result.map((record) => record.exerciseId)).toEqual(['pull-up']);
  });

  it('treats zero as a value someone entered', () => {
    // Invariant 2 in the other direction: zero is a candidate, so beating it
    // is a record like any other.
    const result = recentRecords(
      [row('1', 0, at(2026, 7, 20)), row('2', 3, at(2026, 8, 9))],
      new Map(),
      NOW,
    );

    expect(result[0]).toMatchObject({ value: 3, previous: 0 });
  });

  it('is newest first', () => {
    const result = recentRecords(
      [
        row('1', 8, at(2026, 7, 20), 'reps', 'a'),
        row('2', 12, at(2026, 8, 3), 'reps', 'a'),
        row('3', 20, at(2026, 7, 20), 'reps', 'b'),
        row('4', 25, at(2026, 8, 12), 'reps', 'b'),
      ],
      new Map(),
      NOW,
    );

    expect(result.map((record) => record.exerciseId)).toEqual(['b', 'a']);
  });

  it('is order-independent', () => {
    const rows = [
      row('1', 38, at(2026, 7, 20)),
      row('2', 42, at(2026, 8, 9)),
      row('3', 40, at(2026, 8, 12)),
    ];

    expect(recentRecords(rows, new Map(), NOW)).toEqual(
      recentRecords([...rows].reverse(), new Map(), NOW),
    );
  });
});
