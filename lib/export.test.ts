import { describe, expect, it } from 'vitest';

/*
  Relative, and it has to be: the runner has no `@/` alias, because nothing
  under test has ever needed to reach outside `lib/`. This does — the point of
  the assertion below is that it runs against the real schema rather than a
  copy of it. `db/schema.ts` imports `drizzle-orm/sqlite-core` and `lib/ids`
  and never the client, which is what makes it loadable here.
*/
import * as schema from '../db/schema';
import {
  buildExport,
  describeExport,
  exportFileName,
  exportedTableNames,
  serialiseExport,
  type ExportTables,
} from './export';

const NOW = new Date(2026, 7, 13, 18, 42).getTime();

/**
 * A database in miniature: an exercise, a metric, a session, an entry, a set,
 * and one recorded value beside one that was not.
 */
const tables: ExportTables = {
  exercises: [
    {
      id: '0191-a',
      name: 'Ring Support Hold',
      family: 'Support hold',
      notes: null,
      is_builtin: 1,
      is_active: 1,
      is_archived: 0,
      suggestion_dismissed_at: null,
      created_at: 1_754_000_000_000,
      updated_at: 1_754_000_000_000,
      deleted_at: null,
    },
    {
      id: '0191-b',
      name: 'Nordic Curl',
      family: 'Hamstring',
      notes: null,
      is_builtin: 0,
      is_active: 1,
      is_archived: 0,
      suggestion_dismissed_at: null,
      created_at: 1_754_000_000_000,
      updated_at: 1_754_000_000_000,
      // Deleted by the user, and still in the backup.
      deleted_at: 1_755_000_000_000,
    },
  ],
  sets: [
    { id: '0191-s1', set_index: 0, to_failure: 0, performed_at: NOW },
    { id: '0191-s2', set_index: 1, to_failure: 1, performed_at: NOW },
  ],
  set_metric_values: [
    { id: '0191-v1', set_id: '0191-s1', value_num: 42, value_text: null },
    { id: '0191-v2', set_id: '0191-s2', value_num: null, value_text: 'shaky' },
  ],
};

describe('exportedTableNames', () => {
  it('covers every table in the schema', () => {
    // The one property a backup cannot get wrong. Written against the real
    // schema rather than a fixture, so adding a table to `db/schema.ts`
    // without it reaching the export fails here.
    expect(exportedTableNames(schema)).toEqual([
      'exercise_entries',
      'exercise_metrics',
      'exercises',
      'meta',
      'sessions',
      'set_metric_values',
      'sets',
      'template_slots',
      'templates',
    ]);
  });

  it('ignores everything in the module that is not a table', () => {
    const names = exportedTableNames({
      ...schema,
      newId: () => 'not a table',
      SOME_CONSTANT: 7,
    });

    expect(names).toEqual(exportedTableNames(schema));
  });

  it('is sorted, so two exports of one database are the same file', () => {
    const names = exportedTableNames(schema);

    expect(names).toEqual([...names].sort());
  });
});

describe('buildExport', () => {
  it('carries a format and a version, so a later reader can tell what it has', () => {
    const file = buildExport(tables, { now: NOW, schemaVersion: 5 });

    expect(file.format).toBe('zoomies-export');
    expect(file.version).toBe(1);
    expect(file.schemaVersion).toBe(5);
    expect(file.exportedAt).toBe(NOW);
  });

  it('keeps soft-deleted rows', () => {
    const file = buildExport(tables, { now: NOW, schemaVersion: 5 });

    // Every other read in the application filters these out. A backup that did
    // would drop everything the user deleted, without saying so.
    expect(file.tables.exercises).toHaveLength(2);
    expect(file.tables.exercises?.[1]?.deleted_at).toBe(1_755_000_000_000);
  });

  it('renames nothing and aggregates nothing', () => {
    const file = buildExport(tables, { now: NOW, schemaVersion: 5 });

    // Invariant 3: a total written into a file is a total stored.
    expect(Object.keys(file.tables).sort()).toEqual([
      'exercises',
      'set_metric_values',
      'sets',
    ]);
    expect(file.tables.sets?.[0]).toEqual({
      id: '0191-s1',
      set_index: 0,
      to_failure: 0,
      performed_at: NOW,
    });
  });
});

describe('serialiseExport', () => {
  it('round-trips every row unchanged', () => {
    const file = buildExport(tables, { now: NOW, schemaVersion: 5 });

    expect(JSON.parse(serialiseExport(file))).toEqual(file);
  });

  it('keeps an unrecorded value as an explicit null', () => {
    const file = buildExport(tables, { now: NOW, schemaVersion: 5 });
    const back = JSON.parse(serialiseExport(file)) as typeof file;

    // Invariant 2 in the one file that exists to preserve it. `undefined` is
    // dropped silently by `JSON.stringify`, which would turn *not recorded*
    // into *no such column* — indistinguishable from a metric never added.
    const value = back.tables.set_metric_values?.[1];

    expect(value).toHaveProperty('value_num');
    expect(value?.value_num).toBeNull();
    expect(value?.value_text).toBe('shaky');
  });

  it('never writes a zero where nothing was recorded', () => {
    const back = JSON.parse(
      serialiseExport(buildExport(tables, { now: NOW, schemaVersion: 5 })),
    ) as { tables: ExportTables };

    expect(back.tables.set_metric_values?.[1]?.value_num).not.toBe(0);
  });

  it('survives an empty database', () => {
    const file = buildExport({}, { now: NOW, schemaVersion: 0 });

    expect(JSON.parse(serialiseExport(file))).toEqual(file);
  });

  it('is readable, because someone will open it to check', () => {
    const text = serialiseExport(buildExport(tables, { now: NOW, schemaVersion: 5 }));

    expect(text).toContain('\n');
    expect(text).toContain('"Ring Support Hold"');
  });
});

describe('exportFileName', () => {
  it('is dated in ISO order, so a folder of them sorts by name', () => {
    expect(exportFileName(NOW)).toBe('zoomies-2026-08-13.json');
  });

  it('pads a single-digit month and day', () => {
    expect(exportFileName(new Date(2026, 0, 5, 9).getTime())).toBe(
      'zoomies-2026-01-05.json',
    );
  });
});

describe('describeExport', () => {
  it('counts the two things a person recognises', () => {
    expect(describeExport(tables)).toBe('2 exercises, 2 sets');
  });

  it('says nothing rather than nothing at all', () => {
    expect(describeExport({})).toBe('0 exercises, 0 sets');
  });

  it('is singular where it should be', () => {
    expect(
      describeExport({ exercises: [{ id: 'a' }], sets: [{ id: 'b' }] }),
    ).toBe('1 exercise, 1 set');
  });
});
