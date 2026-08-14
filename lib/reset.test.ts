import { describe, expect, it } from 'vitest';

/*
  Relative, and it has to be — the runner has no `@/` alias. Same reason
  `export.test.ts` reaches for it this way: the assertion below is only worth
  anything if it runs against the real schema rather than a copy.
*/
import * as schema from '../db/schema';
import { exportedTableNames } from './export';
import {
  describeLastExport,
  describeLoss,
  describeReset,
  RESET_ORDER,
} from './reset';

const at = (year: number, month: number, day: number, hour = 12): number =>
  new Date(year, month - 1, day, hour).getTime();

const NOW = at(2026, 8, 14, 10);

describe('RESET_ORDER', () => {
  it('covers every table in the schema', () => {
    // The property the discovered version had for free and this one has to be
    // told: a table added to `db/schema.ts` and not placed here would survive a
    // reset, invisibly, while the user is told the app is factory-fresh.
    expect([...RESET_ORDER].sort()).toEqual(exportedTableNames(schema));
  });

  it('names each table once', () => {
    expect(new Set(RESET_ORDER).size).toBe(RESET_ORDER.length);
  });

  it('deletes a child before whatever it points at', () => {
    /*
      The dependencies that matter, read off `db/schema.ts`. This is the rule
      the first implementation tried to get from `PRAGMA defer_foreign_keys` —
      the pragma did nothing inside Drizzle's transaction, and the reset failed
      on `DELETE FROM exercise_metrics` with `set_metric_values` still pointing
      at it.
    */
    const references: Record<string, string[]> = {
      set_metric_values: ['sets', 'exercise_metrics'],
      sets: ['exercise_entries'],
      exercise_entries: [
        'sessions',
        'exercises',
        'template_slots',
        'exercise_metrics',
      ],
      sessions: ['templates'],
      template_slots: ['templates', 'exercises', 'exercise_metrics'],
      exercise_metrics: ['exercises'],
    };

    const position = (table: string) => RESET_ORDER.indexOf(table as never);

    for (const [child, parents] of Object.entries(references)) {
      for (const parent of parents) {
        expect(
          position(child),
          `${child} must be emptied before ${parent}`,
        ).toBeLessThan(position(parent));
      }
    }
  });
});

describe('describeLoss', () => {
  it('counts rather than rounds', () => {
    // The sentence exists to be checked against what someone believes they
    // have, which `a lot of training` cannot be.
    expect(describeLoss({ sessions: 139, sets: 1827 })).toBe(
      '139 sessions and 1,827 sets',
    );
  });

  it('is singular where it should be', () => {
    expect(describeLoss({ sessions: 1, sets: 1 })).toBe('1 session and 1 set');
  });

  it('says nothing rather than nothing at all', () => {
    expect(describeLoss({ sessions: 0, sets: 0 })).toBe('0 sessions and 0 sets');
  });

  it('groups a four-digit figure, unlike every other number in the app', () => {
    // Those are mono at metric sizes and two or three digits. This one sits
    // inside a sentence, where `1827` reads as a year.
    expect(describeLoss({ sessions: 2, sets: 12_400 })).toContain('12,400 sets');
  });
});

describe('describeLastExport', () => {
  it('states plainly that there is no copy', () => {
    // The only case where cancelling is probably right, so it is not softened
    // and it is not buried behind the count.
    expect(describeLastExport(null, NOW)).toBe(
      'You have never exported, so there is no copy of any of it.',
    );
  });

  it('reads today as today', () => {
    expect(describeLastExport(at(2026, 8, 14, 9), NOW)).toBe(
      'You exported today.',
    );
  });

  it('reads yesterday as yesterday', () => {
    expect(describeLastExport(at(2026, 8, 13, 22), NOW)).toBe(
      'You last exported yesterday.',
    );
  });

  it('says how stale the copy is, not only when it was taken', () => {
    // How much training is missing from the backup is the useful figure at the
    // moment of deciding; the date alone is not.
    expect(describeLastExport(at(2026, 7, 11), NOW)).toBe(
      'You last exported 34 days ago, on 11 Jul.',
    );
  });

  it('counts calendar days, not elapsed hours', () => {
    // An export at 23:00 last night and a reset at 10:00 today is yesterday,
    // not eleven hours. `daysBetween` snaps both ends to midnight.
    expect(describeLastExport(at(2026, 8, 13, 23), NOW)).toBe(
      'You last exported yesterday.',
    );
  });

  it('does not read a future timestamp as a huge gap', () => {
    // A clock moved backwards would otherwise produce `-3 days ago`.
    expect(describeLastExport(at(2026, 8, 17), NOW)).toBe('You exported today.');
  });
});

describe('describeReset', () => {
  it('states the loss, then the backup, then that it is final', () => {
    const message = describeReset({ sessions: 12, sets: 41 }, null, NOW);
    const [loss, backup, final] = message.split('\n\n');

    expect(loss).toContain('12 sessions and 41 sets');
    expect(backup).toContain('never exported');
    expect(final).toBe('It cannot be undone.');
  });

  it('ends on the irreversibility, which is what should still be in mind', () => {
    const message = describeReset(
      { sessions: 12, sets: 41 },
      at(2026, 8, 13),
      NOW,
    );

    expect(message.endsWith('It cannot be undone.')).toBe(true);
  });

  it('names what goes beyond sessions and sets', () => {
    const message = describeReset({ sessions: 3, sets: 9 }, null, NOW);

    expect(message).toContain('every exercise you have added');
    expect(message).toContain('every template');
  });
});
