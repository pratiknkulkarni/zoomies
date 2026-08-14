/**
 * A signal that the database underneath the application has been replaced.
 *
 * **Exists because of a trade the factory reset had to make.** The reset drops
 * and rebuilds the schema rather than deleting rows, because `DELETE` emits one
 * change event per row through JNI and a long history overflowed the global
 * reference table — a native abort, not a catchable error (`db/mutations/reset.ts`).
 *
 * `DROP TABLE` emits nothing, which is the point. But those same events are what
 * `useLiveQuery` subscribes to, so removing them also removes every screen's
 * reason to re-read. The rows were gone and Home still listed three plans until
 * the application was killed and reopened.
 *
 * So the one thing a reset cannot signal through the database, it signals
 * directly: every mounted screen is thrown away and rebuilt, which makes each
 * live query run again on mount. Not a state library and not a store — a set of
 * callbacks and one integer, because the only thing anyone needs to know is
 * *that* it happened.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

/** Subscribe. Returns the unsubscribe, for an effect's cleanup. */
export function onDatabaseReplaced(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/**
 * Announce it. Called once, after the schema is rebuilt and the catalogue is
 * back, so that what remounts reads a finished database rather than a
 * half-seeded one.
 */
export function databaseReplaced(): void {
  for (const listener of listeners) {
    listener();
  }
}
