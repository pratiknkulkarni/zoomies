/**
 * Figures derived from a session, computed at read time (FEATURES.md §9).
 *
 * Pure, and separate from `db/queries/history.ts` for the reason
 * `lib/completion.ts` is separate from its query: the runner cannot open
 * `expo-sqlite`, so anything living beside a query is untestable. Session
 * length is this phase's second exit criterion, which makes it exactly the
 * thing that should not be inlined into a component.
 */

type SessionTiming = {
  startedAt: number;
  completedAt: number | null;
  accumulatedPauseMs: number;
};

/**
 * How long a session actually took.
 *
 * `completed_at − started_at − accumulated_pause_ms`. Pausing is an explicit
 * statement that training stopped (§6.2), so the time it covers is not training
 * time — a duration that counted it would be a lie told by arithmetic, and the
 * longer the break the bigger the lie.
 *
 * A pause still open at completion is folded in by `completeSession`, which
 * resumes before it writes, so `paused_at` never needs consulting here.
 *
 * **Null while a session is unfinished.** There is no length yet, and zero
 * would claim one (invariant 2).
 */
export function sessionLengthMs(session: SessionTiming): number | null {
  if (session.completedAt === null) {
    return null;
  }

  return Math.max(
    0,
    session.completedAt - session.startedAt - session.accumulatedPauseMs,
  );
}
