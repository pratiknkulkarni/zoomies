import { sqlite } from '../client';
import * as schema from '../schema';
import {
  exportedTableNames,
  type ExportRow,
  type ExportTables,
} from '@/lib/export';

/**
 * The read behind export (FEATURES.md §12).
 *
 * Every other query file selects the columns its screen needs. This one selects
 * everything, from every table, because it is the only backup and the failure
 * mode of a narrower read is a column that quietly stops being saved.
 *
 * Not a `useLiveQuery` read. Nothing subscribes to an export — it is taken once,
 * when a button is pressed, and a live query over every table would recompute
 * the whole database on every keystroke of every session.
 */

/**
 * Every row of every table, exactly as stored.
 *
 * `SELECT *` rather than a Drizzle select, deliberately. Drizzle maps columns to
 * the TypeScript field names, and the file has to carry the SQL ones — those are
 * what an importer writes back, and what a rename in the schema file cannot
 * move out from under a file already on disk. It also means a column present in
 * the database but missing from the schema still gets backed up, which is the
 * direction the risk runs during a migration.
 *
 * **Soft-deleted rows included.** The filtering every other read does is what
 * makes the application show a deleted set as gone; doing it here would make it
 * gone from the backup too, which is a different and much larger claim.
 *
 * Synchronous. It is one press on a screen with nothing else happening, the
 * database is a local file, and `getAllSync` avoids interleaving a write
 * between two tables' reads — a set landing between `sets` and
 * `set_metric_values` would export an effort with no values under it.
 */
export function readAllTables(): ExportTables {
  const tables: ExportTables = {};

  for (const name of exportedTableNames(schema)) {
    // The name comes from the schema, never from input; quoted so a table
    // called `sets` cannot collide with a keyword.
    tables[name] = sqlite.getAllSync<ExportRow>(`SELECT * FROM "${name}"`);
  }

  return tables;
}

/**
 * How many migrations the exported rows have been through.
 *
 * Read from `drizzle-orm`'s own bookkeeping table rather than counted from the
 * migrations folder: the folder says what exists, and this says what has
 * actually been applied to these rows.
 *
 * A **count**, not the table's `id`. Drizzle creates that column as
 * `SERIAL PRIMARY KEY`, which SQLite does not recognise — it is not the exact
 * `INTEGER PRIMARY KEY` spelling that aliases the rowid — so the column is
 * simply null on every row and `MAX(id)` would report `0` forever. The row
 * count is the journal index, which is the number an importer wants.
 *
 * `__drizzle_migrations` is not itself exported: it is not in the schema, and a
 * database restored from this file applies its own migrations.
 */
export function schemaVersion(): number {
  try {
    const row = sqlite.getFirstSync<{ applied: number }>(
      'SELECT COUNT(*) AS applied FROM __drizzle_migrations',
    );

    return row?.applied ?? 0;
  } catch {
    // The table is created by the first migration run. Before that there is
    // nothing to export anyway, and a failed export is worse than an unknown
    // version number.
    return 0;
  }
}
