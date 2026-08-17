import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { BackButton } from '@/components/ui/back-button';
import { EmptyState } from '@/components/ui/empty-state';
import { ProgressTrack } from '@/components/ui/progress-track';
import { Screen } from '@/components/ui/screen';
import { SetMarks } from '@/components/ui/set-marks';
import { Text } from '@/components/ui/text';
import {
  allLiveExercises,
  allMetrics,
  indexExercisesById,
  indexMetricsById,
  type ExerciseMetric,
} from '@/db/queries/exercises';
import { valuesForSession } from '@/db/queries/history';
import {
  entriesForSession,
  indexSetsByEntry,
  indexValuesBySet,
  sessionById,
  setsForSession,
  type ExerciseEntry,
  type LoggedSet,
  type Session,
  type SetMetricValue,
} from '@/db/queries/sessions';
import {
  DiscardSession,
  SessionControls,
} from '@/features/session/session-controls';
import {
  formatClock,
  formatSetCount,
  formatSetSeries,
  formatTarget,
} from '@/lib/format';
import { elapsedSessionMs } from '@/lib/history';

/** How often the elapsed figure repaints. It never accumulates — see below. */
const TICK_MS = 1000;

/**
 * The session screen (FEATURES.md §7.1).
 *
 * Every row carries its `2 / 4` counter **and a mark per set**, so a glance
 * from the floor shows what is outstanding without opening the exercise or
 * reading a number. That element is the fix for the problem this application
 * exists for — sets getting forgotten when tired — which is why the counters
 * are live rather than computed once on entry.
 *
 * **The row you are on is lifted, not moved.** Pinning the current exercise to
 * the top was the alternative; plan order won, because you look for the
 * movement you are doing rather than for the top of a list, and a list that
 * reorders itself under your thumb is the opposite of glanceable.
 *
 * DESIGN.md §10 rule 4 gives this screen the least chrome of any: no header
 * actions, no tab bar, nothing decorative. The clock and the two controls are
 * the whole of it.
 *
 * Five queries rather than joins: `useLiveQuery` watches only the root table,
 * and the counter has to move the instant a set is logged.
 */
export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: found, updatedAt } = useLiveQuery(sessionById(id), [id]);
  const { data: entries } = useLiveQuery(entriesForSession(id), [id]);
  const { data: setRows } = useLiveQuery(setsForSession(id), [id]);
  const { data: valueRows } = useLiveQuery(valuesForSession(id), [id]);
  const { data: exercises } = useLiveQuery(allLiveExercises());
  const { data: metrics } = useLiveQuery(allMetrics());

  const setsByEntry = useMemo(() => indexSetsByEntry(setRows), [setRows]);
  const valuesBySet = useMemo(() => indexValuesBySet(valueRows), [valueRows]);
  const exercisesById = useMemo(
    () => indexExercisesById(exercises),
    [exercises],
  );
  const metricsById = useMemo(() => indexMetricsById(metrics), [metrics]);
  const metricsByExercise = useMemo(() => {
    const byExercise = new Map<string, ExerciseMetric[]>();

    for (const metric of metrics) {
      const existing = byExercise.get(metric.exerciseId);
      if (existing) {
        existing.push(metric);
      } else {
        byExercise.set(metric.exerciseId, [metric]);
      }
    }

    return byExercise;
  }, [metrics]);

  const session = found.at(0);
  const settled = updatedAt !== undefined;

  /**
   * The exercise you are almost certainly on: among everything still short of
   * its target, whichever one carries the most recently logged set. Falls
   * back to plan order for entries nobody has touched yet, so a session that
   * has not started still lifts its first row. Falls through to nothing once
   * the whole plan is complete, which is correct: there is no live row when
   * there is nothing left to do.
   */
  const liveEntryId = useMemo(() => {
    const incomplete = entries.filter((entry) => {
      const done = setsByEntry.get(entry.id)?.length ?? 0;
      return entry.targetSets === null ? done === 0 : done < entry.targetSets;
    });

    let mostRecentEntry: ExerciseEntry | undefined = incomplete[0];
    let mostRecentAt = -Infinity;

    for (const entry of incomplete) {
      const lastPerformedAt = (setsByEntry.get(entry.id) ?? []).reduce(
        (max, set) => Math.max(max, set.performedAt),
        -Infinity,
      );

      if (lastPerformedAt > mostRecentAt) {
        mostRecentAt = lastPerformedAt;
        mostRecentEntry = entry;
      }
    }

    return mostRecentEntry?.id;
  }, [entries, setsByEntry]);

  const planned = entries.reduce(
    (total, entry) => total + (entry.targetSets ?? 0),
    0,
  );
  const logged = setRows.length;

  return (
    <Screen bleed>
      <FlatList
        data={entries}
        keyExtractor={(entry) => entry.id}
        ListHeaderComponent={
          <View>
            <BackButton />
            {session ? (
              <>
                <Header session={session} logged={logged} planned={planned} />
                <SessionControls session={session} />
              </>
            ) : settled ? (
              <Text className="px-2xl pt-2xl text-body text-text-2">
                This session is no longer here.
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <EntryRow
            entry={item}
            name={exercisesById.get(item.exerciseId)?.name ?? 'Exercise'}
            metrics={metricsByExercise.get(item.exerciseId) ?? []}
            targetMetric={
              item.targetMetricId
                ? metricsById.get(item.targetMetricId)
                : undefined
            }
            performed={setsByEntry.get(item.id) ?? []}
            valuesBySet={valuesBySet}
            live={item.id === liveEntryId}
            onPress={() =>
              router.push({ pathname: '/entry/[id]', params: { id: item.id } })
            }
          />
        )}
        ListEmptyComponent={
          session ? (
            <View className="px-2xl">
              <EmptyState
                title="Nothing planned"
                body="This session has no exercises yet. Add one to start logging."
              />
            </View>
          ) : null
        }
        ListFooterComponent={
          session ? (
            <View className="pb-3xl">
              <DiscardSession session={session} />
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

/**
 * The session's name, its elapsed clock, and what it has done so far.
 *
 * The interval below drives *repainting only*. Every figure is re-derived from
 * `started_at` by `elapsedSessionMs`, which is what makes a minute spent in
 * another app cost nothing (invariant 4). Deleting the interval would freeze
 * the display, not the timing.
 */
function Header({
  session,
  logged,
  planned,
}: {
  session: Session;
  logged: number;
  planned: number;
}) {
  const [now, setNow] = useState(() => Date.now());
  // FIX #6
  // In a nutshell, this local now (local to component) was holding an older value of Date.now()
  // which was before the pause accumulation happened. Now, we need to start back from the place
  // after the pause was complete, so we need to add accumulateMs. This happened after the TICK_MS
  // So sync updating now right after the paused had been updated.
  const [pausedAtSeen, setPausedAtSeen] = useState(session.pausedAt);

  // if the pausedAt value changes, then update.
  if (session.pausedAt !== pausedAtSeen) {
    setPausedAtSeen(session.pausedAt);
    setNow(() => Date.now());
  }

  useEffect(() => {
    if (session.pausedAt !== null) {
      return;
    }
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [session.pausedAt]);

  const started = new Date(session.startedAt).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const percent = planned > 0 ? Math.round((logged / planned) * 100) : null;

  return (
    <View className="px-2xl pt-sm">
      <View className="flex-row items-baseline gap-lg">
        <Text
          className="flex-1 font-sans-semibold text-display text-text"
          numberOfLines={1}
        >
          {session.name ?? 'No plan'}
        </Text>
        <Text className="font-mono text-metric text-text">
          {formatClock(elapsedSessionMs(session, now))}
        </Text>
      </View>

      <Text className="pt-xs font-mono text-metricXs text-text-3">
        {`Started ${started} · `}
        {planned === 0
          ? logged === 1
            ? '1 set'
            : `${logged} sets`
          : `${logged} of ${planned} sets (${percent}%)`}
        {session.pausedAt === null ? '' : ' · paused'}
      </Text>

      {planned > 0 ? (
        <View className="pt-xs">
          <ProgressTrack progress={logged / planned} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * One exercise in the session, answering "what is left" without being opened.
 *
 * A completed exercise recedes — its marks and its counter drop a step of ink —
 * rather than disappearing or being ticked. It is still part of the session and
 * you may still add to it (§6.5 allows exceeding a target); it just no longer
 * needs your attention.
 */
function EntryRow({
  entry,
  name,
  metrics,
  targetMetric,
  performed,
  valuesBySet,
  live,
  onPress,
}: {
  entry: ExerciseEntry;
  name: string;
  metrics: ExerciseMetric[];
  targetMetric: ExerciseMetric | undefined;
  performed: LoggedSet[];
  valuesBySet: Map<string, SetMetricValue[]>;
  live: boolean;
  onPress: () => void;
}) {
  const done = performed.length;
  const complete = entry.targetSets !== null && done >= entry.targetSets;

  const primary = metrics.find((metric) => metric.type !== 'notes');
  const values = primary
    ? formatSetSeries(
        performed.map(
          (set) =>
            valuesBySet
              .get(set.id)
              ?.find((value) => value.exerciseMetricId === primary.id)
              ?.valueNum ?? null,
        ),
        primary,
      )
    : '';

  const hasTarget = entry.targetSets !== null || entry.targetValue !== null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${formatSetCount(done, entry.targetSets)}`}
      onPress={onPress}
      className={
        live
          ? 'gap-sm border-y border-border bg-surface px-2xl py-lg active:bg-muted'
          : 'gap-sm px-2xl py-lg active:bg-muted'
      }
    >
      <View className="flex-row items-baseline gap-lg">
        <Text
          className={
            complete
              ? 'flex-1 font-sans-semibold text-heading text-text-4'
              : 'flex-1 font-sans-semibold text-heading text-text'
          }
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text
          className={
            complete
              ? 'font-mono text-metricSm text-text-4'
              : 'font-mono text-metricSm text-text'
          }
        >
          {formatSetCount(done, entry.targetSets)}
        </Text>
      </View>

      <View className="flex-row items-center gap-lg">
        <View className="flex-1">
          <SetMarks
            done={done}
            target={entry.targetSets}
            muted={complete}
          />
        </View>

        {/* What you have done, or — before anything is logged — what you came
            to do. Never both: the row has one thing to say at a time. */}
        <Text className="font-mono text-metricXs text-text-3">
          {done > 0
            ? values
            : hasTarget
              ? `Target ${formatTarget(entry, targetMetric)}`
              : ''}
        </Text>
      </View>

      {entry.notes ? (
        <Text className="text-bodySm text-text-2">{entry.notes}</Text>
      ) : null}
    </Pressable>
  );
}
