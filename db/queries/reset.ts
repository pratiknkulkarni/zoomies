import { sqlite } from '../client';
import { LAST_EXPORT_KEY } from '@/lib/export';
import type { Loss } from '@/lib/reset';

/**
 * What a factory reset would cost, read once when the button is pressed
 * (FEATURES.md §12.3).
 *
 * Not a `useLiveQuery` read. Nothing subscribes to this — it is answered at the
 * moment of asking, and a live count of every set in the database recomputing
 * on every keystroke of every session would be a real cost for a number that is
 * looked at twice in the life of the application.
 *
 * Synchronous, like `readAllTables`, and for the same reason: one press on a
 * screen with nothing else happening, against a local file.
 */

/**
 * Sessions and sets, **as the user would recognise them**.
 *
 * Soft-deleted rows are excluded here and nowhere else in this feature. The
 * reset destroys them too, but the sentence exists to be checked against what
 * the person believes they have, and History has never shown them a deleted
 * session. A figure that counted rows they cannot see would be unverifiable at
 * the one moment it has to be trusted.
 */
export function lossFromReset(): Loss {
  const count = (table: string) =>
    sqlite.getFirstSync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM "${table}" WHERE deleted_at IS NULL`,
    )?.n ?? 0;

  return { sessions: count('sessions'), sets: count('sets') };
}

/**
 * When an export last succeeded, or null if one never has.
 *
 * **Null and unparseable are the same answer**, and it is the cautious one: the
 * confirmation says there is no copy. A stored value that cannot be read is not
 * evidence that a backup exists, and this is the one figure where guessing
 * generously would cost someone their training.
 */
export function lastExportAt(): number | null {
  const row = sqlite.getFirstSync<{ value: string }>(
    'SELECT value FROM meta WHERE key = ?',
    LAST_EXPORT_KEY,
  );

  const parsed = Number(row?.value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
