/**
 * Personal records, folded from rows (FEATURES.md §10, §11.5).
 *
 * Pure, and separate from `db/queries/records.ts` for the reason
 * `lib/completion.ts` and `lib/history.ts` are separate: `db/` imports the
 * client, the client imports `expo-sqlite`, and the runner cannot open it.
 *
 * PLAN.md §4.3 asked whether testing this needed a Node SQLite driver. It does
 * not. The queries fetch rows and the ranking happens here, where a fixture is
 * three lines and nothing native is installed. What that leaves untested is the
 * `isNull(deleted_at)` filtering in the queries themselves — recorded rather
 * than papered over.
 *
 * **Nothing here is stored.** A record is a fold over sets every time it is
 * read (invariant 3). There is no `personal_best` column and there must not be
 * one: it would be a second source of truth that a corrected set could not
 * reach.
 */

/** What ranking needs from a set. Deliberately not the whole row. */
export type RankedSet = {
  id: string;
  sessionId: string;
  performedAt: number;
};

/** What ranking needs from a measurement. */
export type RankedValue = {
  setId: string;
  exerciseMetricId: string;
  valueNum: number | null;
};

/** What ranking needs from a metric: whether it can be ordered at all. */
export type RankedMetric = {
  id: string;
  type: 'number' | 'duration' | 'notes';
};

/** The set that holds a record, and what it was. */
export type PersonalRecord = {
  metricId: string;
  value: number;
  setId: string;
  sessionId: string;
  performedAt: number;
};

/**
 * The best set for each metric, keyed by metric id.
 *
 * Four rules, each of which is a way of getting this wrong:
 *
 * 1. **A `notes` metric has no record.** Text has no ordering, so the longest
 *    note is not an achievement. §4 gives the three types; only two rank.
 * 2. **Null is never a candidate** (invariant 2). A set where Reps went
 *    unrecorded did not score zero reps — it recorded nothing. Zero *is* a
 *    candidate, because zero is a value someone entered.
 * 3. **A tie keeps the earlier holder.** Matching your best is not beating it;
 *    the record was set the first time and still stands. §6.6 already decided
 *    this for the raise prompt, and a record that jumped to the newest set
 *    every time it was equalled would report a date that means nothing.
 * 4. **A measurement whose set is absent is ignored.** The caller filters
 *    deleted sets and unfinished sessions; anything left over here belongs to a
 *    set that is not in the record.
 *
 * Order-independent: the same rows shuffled produce the same answer, so no
 * caller has to know what it was sorted by.
 */
export function personalRecords(
  sets: RankedSet[],
  values: RankedValue[],
  metrics: RankedMetric[],
): Map<string, PersonalRecord> {
  const rankable = new Set(
    metrics.filter((metric) => metric.type !== 'notes').map((metric) => metric.id),
  );

  const setById = new Map(sets.map((set) => [set.id, set]));
  const best = new Map<string, PersonalRecord>();

  for (const value of values) {
    if (value.valueNum === null || !rankable.has(value.exerciseMetricId)) {
      continue;
    }

    const set = setById.get(value.setId);
    if (!set) {
      continue;
    }

    const candidate: PersonalRecord = {
      metricId: value.exerciseMetricId,
      value: value.valueNum,
      setId: set.id,
      sessionId: set.sessionId,
      performedAt: set.performedAt,
    };

    const holder = best.get(candidate.metricId);
    if (!holder || beats(candidate, holder)) {
      best.set(candidate.metricId, candidate);
    }
  }

  return best;
}

/**
 * Whether one candidate displaces another.
 *
 * The id comparison is the last tiebreak and exists only so the result cannot
 * depend on row order — ids are UUID v7, so the smaller one is also the older
 * one, which is the same rule as the line above it.
 */
function beats(candidate: PersonalRecord, holder: PersonalRecord): boolean {
  if (candidate.value !== holder.value) {
    return candidate.value > holder.value;
  }

  if (candidate.performedAt !== holder.performedAt) {
    return candidate.performedAt < holder.performedAt;
  }

  return candidate.setId < holder.setId;
}

/** The set ids holding a record, for the marker in a list of sets. */
export function recordSetIds(records: Map<string, PersonalRecord>): Set<string> {
  return new Set([...records.values()].map((record) => record.setId));
}

/**
 * Sets grouped by the session they were performed in, input order preserved.
 *
 * §10 asks for both "every set ever logged" and "which sessions it appeared
 * in", which are one list read two ways rather than two queries.
 */
export function groupSetsBySession<S extends { sessionId: string }>(
  sets: S[],
): { sessionId: string; sets: S[] }[] {
  const groups: { sessionId: string; sets: S[] }[] = [];
  const bySession = new Map<string, S[]>();

  for (const set of sets) {
    const existing = bySession.get(set.sessionId);

    if (existing) {
      existing.push(set);
    } else {
      const started = [set];
      bySession.set(set.sessionId, started);
      groups.push({ sessionId: set.sessionId, sets: started });
    }
  }

  return groups;
}
