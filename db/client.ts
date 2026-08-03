import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

/**
 * The source of truth. Not a cache, not a mirror — every interaction completes
 * against this file and nothing else (TECH_STACK.md §4.1).
 */
const sqlite = openDatabaseSync('zoomies.db', { enableChangeListener: true });

// SQLite leaves foreign keys off by default. Deletion is soft almost
// everywhere, but the places history is genuinely removed — discarding an
// unfinished session, deleting a completed one — rely on the cascades declared
// in the schema.
sqlite.execSync('PRAGMA foreign_keys = ON;');

export const db = drizzle(sqlite, { schema });

export { sqlite };
