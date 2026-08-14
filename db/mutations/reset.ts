import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { db, sqlite } from '../client';
import migrations from '../migrations/migrations';
import { seedIfNeeded } from '../seed';
import { RESET_ORDER } from '@/lib/reset';
import { databaseReplaced } from '@/lib/restart';

/**
 * The factory reset (FEATURES.md §12.3).
 *
 * **The schema is dropped and rebuilt, not emptied.** That is not a stylistic
 * preference — `DELETE` crashed the application, natively, every time.
 *
 * `db/client.ts` opens the database with `enableChangeListener: true`, which
 * registers SQLite's update hook. `expo-sqlite` emits one event **per row
 * changed**:
 *
 * ```kotlin
 * database.ref.enableUpdateHook { databaseName, tableName, operationType, rowID ->
 *   sendEvent("onDatabaseChange", bundleOf(…))
 * }
 * ```
 *
 * Every one of those crosses JNI and takes a global reference. A reset on a
 * long history deletes something like 126,000 rows — values, sets, entries,
 * sessions — and the JNI global reference table holds 51,200. It aborted less
 * than half way through with `global reference table overflow`, which is a
 * native crash rather than an exception, so nothing in JavaScript could have
 * caught it.
 *
 * Raising the row count was never going to be the answer either: those events
 * drive every `useLiveQuery` in the application, so even a history small enough
 * to survive would have re-run every mounted query tens of thousands of times.
 *
 * `DROP TABLE` is DDL. It removes the rows without visiting them, so the update
 * hook never fires and no events are emitted at all.
 */

/**
 * Drop everything, rebuild the schema, then let the catalogue come back.
 *
 * **Foreign keys off, and outside the transaction.** With them on, `DROP TABLE`
 * performs an implicit row-by-row delete to check constraints — which is the
 * thing being avoided. `PRAGMA foreign_keys` is also a no-op *inside* a
 * transaction, so it has to be set before the `BEGIN`. That is the same pragma
 * whose silent failure broke the previous version of this function; here it is
 * issued on the connection directly, where it takes effect.
 *
 * **The drops are still atomic.** DDL is transactional in SQLite, so a kill
 * mid-reset rolls back to a whole schema rather than half of one. The order
 * `RESET_ORDER` states no longer matters with constraints off, and it is kept
 * because a list that is checked against the schema by a test is still the way
 * this stays complete when a table is added.
 *
 * `__drizzle_migrations` goes too, which is what lets `migrate` rebuild from
 * nothing on the connection that is already open — no reopening, no relaunch,
 * and no window where a screen holds a handle to a file that is gone.
 *
 * **`meta` goes with everything else**, which re-arms the seed: the flag
 * `seedIfNeeded` guards on is a row in it. The appearance preference is in there
 * too and is meant to go — a factory reset means the application you first
 * opened, and that one followed the system.
 */
export async function resetEverything(): Promise<void> {
  sqlite.execSync('PRAGMA foreign_keys = OFF');

  try {
    sqlite.execSync('BEGIN');

    try {
      for (const table of [...RESET_ORDER, '__drizzle_migrations']) {
        // The names come from a literal in `lib/reset.ts` and from Drizzle's
        // own bookkeeping table, never from input; quoted so a table called
        // `sets` cannot collide with a keyword.
        sqlite.execSync(`DROP TABLE IF EXISTS "${table}"`);
      }

      sqlite.execSync('COMMIT');
    } catch (cause: unknown) {
      sqlite.execSync('ROLLBACK');
      throw cause;
    }
  } finally {
    // Restored whatever happened above. Leaving them off would silently
    // disable every cascade in the application for the rest of the session.
    sqlite.execSync('PRAGMA foreign_keys = ON');
  }

  await migrate(db, migrations);
  await seedIfNeeded();

  /*
    Announced last, once the schema is back and the catalogue with it, so what
    remounts reads a finished database rather than a half-seeded one.

    Necessary because of the trade above: dropping the tables is what stops the
    native crash, and it is also what leaves every mounted `useLiveQuery` with
    no reason to re-read. Without this the rows are gone and Home still lists
    three plans until the application is killed.
  */
  databaseReplaced();
}
