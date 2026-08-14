import { sql } from 'drizzle-orm';

import { db } from '../client';
import { seedIfNeeded } from '../seed';
import { RESET_ORDER } from '@/lib/reset';

/**
 * The factory reset (FEATURES.md §12.3).
 *
 * **Rows, not the file.** Deleting `zoomies.db` would be simpler and is not
 * available: `db` in `db/client.ts` is a module-level singleton opened once at
 * startup, so removing the file underneath it leaves every screen holding a
 * handle to something that no longer exists, and nothing short of a relaunch
 * puts that right. Clearing the tables leaves the same open database, empty.
 */

/**
 * Empty every table, then let the catalogue come back.
 *
 * **Children before parents, in the order `RESET_ORDER` states.** `db/client.ts`
 * turns foreign keys on, so emptying `exercise_metrics` while `set_metric_values`
 * still points at it fails — which is exactly what shipped and what the user hit.
 * That first version discovered the tables from the schema alphabetically and
 * relied on `PRAGMA defer_foreign_keys` to make the order irrelevant; the pragma
 * did nothing through Drizzle's transaction and the whole reset failed on the
 * second table. `lib/reset.ts` carries the ordering and a test keeps it complete.
 *
 * **`meta` goes with everything else**, which is what re-arms the seed: the
 * flag `seedIfNeeded` guards on is a row in it. The appearance preference is in
 * there too and is meant to go — a factory reset means the application you
 * first opened, and that one followed the system.
 *
 * The seed runs in **its own transaction, afterwards**, and deliberately. It
 * is idempotent and guarded by the flag this just cleared, so a kill in between
 * leaves an empty database that re-seeds itself on the next launch — which is
 * the ordinary first-launch path, not a broken state.
 */
export async function resetEverything(): Promise<void> {
  await db.transaction(async (tx) => {
    for (const table of RESET_ORDER) {
      // The name comes from a literal in `lib/reset.ts`, never from input;
      // quoted so a table called `sets` cannot collide with a keyword.
      await tx.run(sql.raw(`DELETE FROM "${table}"`));
    }
  });

  await seedIfNeeded();
}
