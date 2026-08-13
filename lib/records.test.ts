import { describe, expect, it } from 'vitest';

import {
  groupSetsBySession,
  personalRecords,
  recordSetIds,
  type RankedMetric,
  type RankedSet,
  type RankedValue,
} from './records';

/**
 * PLAN.md Phase 8 exit criterion 2: the record queries pass unit tests,
 * **including ties and nulls**. Those two are the whole reason this is a pure
 * function — a record that treats an unrecorded value as zero, or that moves to
 * the newest set every time it is equalled, is wrong in a way no screen makes
 * obvious.
 */

const REPS: RankedMetric = { id: 'm-reps', type: 'number' };
const HOLD: RankedMetric = { id: 'm-hold', type: 'duration' };
const FEEL: RankedMetric = { id: 'm-feel', type: 'notes' };

/** Distinct, ordered timestamps so `performedAt` ties are always deliberate. */
const JUN = 1_717_200_000_000;
const JUL = 1_719_792_000_000;
const AUG = 1_722_470_400_000;

function set(id: string, sessionId: string, performedAt: number): RankedSet {
  return { id, sessionId, performedAt };
}

function value(
  setId: string,
  exerciseMetricId: string,
  valueNum: number | null,
): RankedValue {
  return { setId, exerciseMetricId, valueNum };
}

describe('personalRecords', () => {
  it('has no records without sets', () => {
    expect(personalRecords([], [], [REPS]).size).toBe(0);
  });

  it('takes the single set as the record', () => {
    const records = personalRecords(
      [set('s1', 'sess-1', JUN)],
      [value('s1', 'm-reps', 9)],
      [REPS],
    );

    expect(records.get('m-reps')).toEqual({
      metricId: 'm-reps',
      value: 9,
      setId: 's1',
      sessionId: 'sess-1',
      performedAt: JUN,
    });
  });

  it('takes the highest value, not the most recent', () => {
    const records = personalRecords(
      [set('s1', 'sess-1', JUN), set('s2', 'sess-2', AUG)],
      [value('s1', 'm-reps', 12), value('s2', 'm-reps', 8)],
      [REPS],
    );

    expect(records.get('m-reps')?.value).toBe(12);
    expect(records.get('m-reps')?.setId).toBe('s1');
  });

  it('leaves the record with the earlier set when it is equalled', () => {
    const records = personalRecords(
      [set('s1', 'sess-1', JUN), set('s2', 'sess-2', AUG)],
      [value('s1', 'm-reps', 10), value('s2', 'm-reps', 10)],
      [REPS],
    );

    // Matching your best is not beating it. The record was set in June.
    expect(records.get('m-reps')?.setId).toBe('s1');
    expect(records.get('m-reps')?.performedAt).toBe(JUN);
  });

  it('never treats an unrecorded value as zero', () => {
    const records = personalRecords(
      [set('s1', 'sess-1', JUN), set('s2', 'sess-2', AUG)],
      [value('s1', 'm-reps', null), value('s2', 'm-reps', 5)],
      [REPS],
    );

    expect(records.get('m-reps')?.value).toBe(5);
  });

  it('has no record for a metric that was never recorded', () => {
    const records = personalRecords(
      [set('s1', 'sess-1', JUN)],
      [value('s1', 'm-reps', null)],
      [REPS],
    );

    expect(records.has('m-reps')).toBe(false);
  });

  it('treats zero as a value, unlike null', () => {
    const records = personalRecords(
      [set('s1', 'sess-1', JUN)],
      [value('s1', 'm-reps', 0)],
      [REPS],
    );

    // Invariant 2 from the other side: zero means zero. Someone logged it.
    expect(records.get('m-reps')?.value).toBe(0);
  });

  it('ranks each metric independently', () => {
    const records = personalRecords(
      [set('s1', 'sess-1', JUN), set('s2', 'sess-2', AUG)],
      [
        value('s1', 'm-reps', 12),
        value('s1', 'm-hold', 20),
        value('s2', 'm-reps', 8),
        value('s2', 'm-hold', 42),
      ],
      [REPS, HOLD],
    );

    // A duration record and a rep record are separate (§11.5), and the best of
    // each came from a different session.
    expect(records.get('m-reps')?.setId).toBe('s1');
    expect(records.get('m-hold')?.setId).toBe('s2');
  });

  it('gives a notes metric no record', () => {
    const records = personalRecords(
      [set('s1', 'sess-1', JUN)],
      [value('s1', 'm-feel', 3)],
      [FEEL],
    );

    expect(records.has('m-feel')).toBe(false);
  });

  it('ignores a metric the exercise no longer has', () => {
    const records = personalRecords(
      [set('s1', 'sess-1', JUN)],
      [value('s1', 'm-removed', 99)],
      [REPS],
    );

    expect(records.size).toBe(0);
  });

  it('ignores a measurement whose set is not in the list', () => {
    const records = personalRecords(
      [set('s1', 'sess-1', JUN)],
      [value('s1', 'm-reps', 9), value('s-deleted', 'm-reps', 40)],
      [REPS],
    );

    expect(records.get('m-reps')?.value).toBe(9);
  });

  it('gives the same answer whatever order the rows arrive in', () => {
    const sets = [
      set('s1', 'sess-1', JUN),
      set('s2', 'sess-2', JUL),
      set('s3', 'sess-3', AUG),
    ];
    const values = [
      value('s1', 'm-reps', 10),
      value('s2', 'm-reps', 10),
      value('s3', 'm-reps', 9),
    ];

    const forwards = personalRecords(sets, values, [REPS]);
    const backwards = personalRecords(
      [...sets].reverse(),
      [...values].reverse(),
      [REPS],
    );

    expect(backwards.get('m-reps')).toEqual(forwards.get('m-reps'));
    expect(forwards.get('m-reps')?.setId).toBe('s1');
  });

  it('falls back to the id when two sets share a timestamp', () => {
    const records = personalRecords(
      [set('s2', 'sess-1', JUN), set('s1', 'sess-1', JUN)],
      [value('s2', 'm-reps', 10), value('s1', 'm-reps', 10)],
      [REPS],
    );

    // Ids are UUID v7, so the smaller one is the older one.
    expect(records.get('m-reps')?.setId).toBe('s1');
  });
});

describe('recordSetIds', () => {
  it('collects the holder of every record', () => {
    const records = personalRecords(
      [set('s1', 'sess-1', JUN), set('s2', 'sess-2', AUG)],
      [
        value('s1', 'm-reps', 12),
        value('s2', 'm-hold', 42),
      ],
      [REPS, HOLD],
    );

    expect(recordSetIds(records)).toEqual(new Set(['s1', 's2']));
  });

  it('is empty when nothing ranks', () => {
    expect(recordSetIds(new Map())).toEqual(new Set());
  });
});

describe('groupSetsBySession', () => {
  it('groups without reordering', () => {
    const grouped = groupSetsBySession([
      { sessionId: 'b', id: 's1' },
      { sessionId: 'b', id: 's2' },
      { sessionId: 'a', id: 's3' },
    ]);

    expect(grouped.map((group) => group.sessionId)).toEqual(['b', 'a']);
    expect(grouped[0]?.sets).toHaveLength(2);
    expect(grouped[1]?.sets).toHaveLength(1);
  });

  it('reopens nothing when a session is interleaved', () => {
    const grouped = groupSetsBySession([
      { sessionId: 'a', id: 's1' },
      { sessionId: 'b', id: 's2' },
      { sessionId: 'a', id: 's3' },
    ]);

    // Sets arrive ordered by session, so this cannot happen in practice; the
    // grouping still has to answer, and two groups for one session would render
    // the same date header twice.
    expect(grouped).toHaveLength(2);
    expect(grouped[0]?.sets).toHaveLength(2);
  });

  it('groups nothing into nothing', () => {
    expect(groupSetsBySession([])).toEqual([]);
  });
});
