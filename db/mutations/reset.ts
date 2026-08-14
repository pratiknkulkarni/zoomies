import { sql } from 'drizzle-orm';

import { db } from '../client';
import * as schema from '../schema';
import { seedIfNeeded } from '../seed';
import { exportedTableNames } from '@/lib/export';

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
 * **The table list is discovered from the schema**, exactly as the export's is
 * and for the same reason: a list kept by hand works until someone adds a
 * table, and then the reset quietly stops being one. A reset that leaves rows
 * behind is worse than the export's equivalent failure — the user is told the
 * application is factory-fresh, and the leftovers are invisible.
 *
 * **`PRAGMA defer_foreign_keys` is what makes discovery safe.** `db/client.ts`
 * turns foreign keys on, so deleting `exercises` before the metrics pointing at
 * it would fail; deferring the checks to commit means the order the schema
 * happens to enumerate its tables in cannot matter. The constraints are still
 * enforced — at commit, against an empty database, where they hold trivially.
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
    await tx.run(sql`PRAGMA defer_foreign_keys = ON`);

    for (const table of exportedTableNames(schema)) {
      // The name comes from the schema and never from input; quoted so a table
      // called `sets` cannot collide with a keyword.
      await tx.run(sql.raw(`DELETE FROM "${table}"`));
    }
  });

  await seedIfNeeded();
}
