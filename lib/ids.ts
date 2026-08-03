import { uuidv7 } from 'uuidv7';

/**
 * The single call site for primary keys.
 *
 * v7, not v4: the timestamp prefix makes IDs sort chronologically, and they do
 * not collide across devices when sync arrives in v2. `crypto.randomUUID()`
 * produces v4 and is explicitly not used (TECH_STACK.md §4.3).
 */
export function newId(): string {
  return uuidv7();
}
