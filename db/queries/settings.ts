import { eq } from 'drizzle-orm';

import { db, sqlite } from '../client';
import { meta } from '../schema';
import {
  APPEARANCE_KEY,
  parseAppearance,
  type Appearance,
} from '@/lib/appearance';

/**
 * The appearance preference (FEATURES.md §13), stored in `meta`.
 *
 * **No second store.** `TECH_STACK.md` §5.1 settled this: one enum does not
 * justify AsyncStorage, and a preference kept outside the database is a second
 * source of truth that can disagree with the first.
 */

/**
 * The stored choice, read synchronously.
 *
 * Sync because of when it is needed: `app/_layout.tsx` calls this before the
 * first frame, and a promise there is a frame rendered in the wrong theme. The
 * database is already open by then — the splash is held until migrations and
 * the seed resolve — and this is one indexed row.
 *
 * Anything unrecognised, or a table that has not been migrated yet, reads as
 * `system`. See `parseAppearance`: a preference must never cost a launch.
 */
export function storedAppearance(): Appearance {
  try {
    const row = sqlite.getFirstSync<{ value: string }>(
      'SELECT value FROM meta WHERE key = ?',
      APPEARANCE_KEY,
    );

    return parseAppearance(row?.value);
  } catch {
    return parseAppearance(null);
  }
}

/** The same row, live, so the settings screen shows what is stored. */
export function appearanceRow() {
  return db.select().from(meta).where(eq(meta.key, APPEARANCE_KEY));
}
