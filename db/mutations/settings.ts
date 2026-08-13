import { sql } from 'drizzle-orm';

import { db } from '../client';
import { meta } from '../schema';
import { APPEARANCE_KEY, type Appearance } from '@/lib/appearance';

/**
 * The one preference write (FEATURES.md §13).
 *
 * An upsert rather than a read-then-write: the row does not exist until the
 * first time the default is changed, and `meta` is keyed on `key`, so the
 * database can decide which of the two it is.
 *
 * Not soft-deleted and not versioned. `meta` is the documented exception to the
 * UUID and lifecycle rules — it is a key/value store, not user data, and the
 * previous value of a preference is not a record of anything.
 */
export async function setAppearance(appearance: Appearance): Promise<void> {
  await db
    .insert(meta)
    .values({ key: APPEARANCE_KEY, value: appearance })
    .onConflictDoUpdate({
      target: meta.key,
      set: { value: appearance, updatedAt: sql`(unixepoch() * 1000)` },
    });
}
