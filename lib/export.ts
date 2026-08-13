/**
 * The export file (FEATURES.md §12).
 *
 * **With no cloud in v1 this is the only backup**, which sets every rule below.
 * A backup that quietly drops a column, an unrecorded value or a deleted row is
 * worse than none, because it is trusted.
 *
 * Pure, like every other `lib/` module: the rows arrive already read, and this
 * decides only what the file says about them. `db/queries/export.ts` does the
 * reading, and does it with `SELECT *` for the same reason this file exists —
 * a hand-written column list is a way to lose a column silently.
 */

import { getTableName, isTable } from 'drizzle-orm';

/** What SQLite hands back. No `undefined`: a missing value is `null`. */
export type SqlValue = string | number | null;

/** One row, exactly as stored — snake_case keys, every column present. */
export type ExportRow = Record<string, SqlValue>;

/** Every table, keyed by its **SQL** name. */
export type ExportTables = Record<string, ExportRow[]>;

/**
 * The file's shape. Version it from the first release, because the second one
 * cannot add a version to files already written.
 */
export type ExportFile = {
  format: 'zoomies-export';
  /** Bumped when the *file's* shape changes, never when the schema does. */
  version: number;
  exportedAt: number;
  /** Which migration the rows came from, so an importer knows their shape. */
  schemaVersion: number;
  tables: ExportTables;
};

export const EXPORT_FORMAT = 'zoomies-export';
export const EXPORT_VERSION = 1;

/**
 * Which tables an export covers, discovered from the schema module.
 *
 * **A table added to `db/schema.ts` joins the export by existing.** A list kept
 * by hand is the same defect as a column list kept by hand: it works until
 * someone adds a table, and then every backup taken before anyone notices is
 * silently incomplete. This is the single most important property of the file,
 * so it lives here where it can be tested — `db/schema.ts` imports no client
 * and is safe to load in the runner.
 *
 * Sorted by name, so two exports of the same database produce the same file and
 * a diff shows what changed rather than what moved.
 */
export function exportedTableNames(schema: Record<string, unknown>): string[] {
  return Object.values(schema)
    .filter((value) => isTable(value))
    .map((table) => getTableName(table))
    .sort();
}

/**
 * The file, from tables already read.
 *
 * **Rows go in exactly as stored, including soft-deleted ones.** Filtering
 * `deleted_at` here would make the export a view of the application rather than
 * a copy of the database, and a restore from it would silently drop everything
 * the user had deleted — which is a decision they made, recorded, and would
 * have no way of knowing had been thrown away.
 *
 * Nothing is aggregated and nothing is renamed. Invariant 3 says totals are not
 * stored; a total written into a backup file is stored. The keys are the SQL
 * names rather than the TypeScript ones because a later importer has to reach
 * the database, and the column names are the part that a refactor cannot move.
 */
export function buildExport(
  tables: ExportTables,
  meta: { now: number; schemaVersion: number },
): ExportFile {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: meta.now,
    schemaVersion: meta.schemaVersion,
    tables,
  };
}

/**
 * The file as text.
 *
 * **Two spaces, not none.** This is a backup a person may open, and the one
 * thing they will want to do is check their training is in it. The size costs
 * nothing at this volume — a year of daily sessions is a few hundred kilobytes
 * — and gzip is not involved because there is no upload.
 *
 * `JSON.stringify` drops `undefined` values silently, which would turn *not
 * recorded* into *no such column* and quietly break invariant 2 in the one file
 * that is supposed to preserve it. Nothing here can produce one — `SELECT *`
 * returns `null` — and `serialisationLosesNothing` is the test that says so.
 */
export function serialiseExport(file: ExportFile): string {
  return JSON.stringify(file, null, 2);
}

/**
 * `zoomies-2026-08-13.json`.
 *
 * Dated rather than timestamped: the file is picked out of a share sheet or a
 * downloads folder by eye, and `zoomies-2026-08-13T18-42-09.json` is harder to
 * read for the one case it helps with — two exports on the same day, where the
 * OS appends its own suffix anyway.
 *
 * ISO order, so a folder of them sorts chronologically by name.
 */
export function exportFileName(now: number): string {
  const date = new Date(now);
  const pad = (value: number) => String(value).padStart(2, '0');

  return `zoomies-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}.json`;
}

/**
 * `9 exercises, 41 sets` — what to say once the file is written.
 *
 * Counting the two things a person recognises rather than every table. `9
 * tables, 812 rows` describes the file; this describes the training, which is
 * what they are checking is in it.
 */
export function describeExport(tables: ExportTables): string {
  const count = (table: string) => tables[table]?.length ?? 0;

  const exercises = count('exercises');
  const sets = count('sets');

  return `${exercises} ${exercises === 1 ? 'exercise' : 'exercises'}, ${sets} ${
    sets === 1 ? 'set' : 'sets'
  }`;
}
