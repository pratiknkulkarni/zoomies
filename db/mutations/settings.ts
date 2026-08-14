import { sql } from 'drizzle-orm';

import { db } from '../client';
import { meta } from '../schema';
import { APPEARANCE_KEY, type Appearance } from '@/lib/appearance';
import { LAST_EXPORT_KEY } from '@/lib/export';

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

/**
 * Note that an export succeeded, for the reset's second confirmation (§12.3).
 *
 * **Called only after the file is written**, never before and never on failure.
 * The value's whole job is to answer "is there a copy of this anywhere", and a
 * timestamp written optimistically would answer it wrongly at the one moment
 * the answer decides whether training is destroyed.
 *
 * Stored as millis in text, because `meta.value` is text. Nothing parses it but
 * `lastExportAt`.
 */
export async function recordExport(now: number): Promise<void> {
  await db
    .insert(meta)
    .values({ key: LAST_EXPORT_KEY, value: String(now) })
    .onConflictDoUpdate({
      target: meta.key,
      set: { value: String(now), updatedAt: sql`(unixepoch() * 1000)` },
    });
}
