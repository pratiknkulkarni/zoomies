import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, View } from 'react-native';

import { BackButton } from '@/components/ui/back-button';
import { EmptyState } from '@/components/ui/empty-state';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import {
  allLiveExercises,
  allMetrics,
  indexExercisesById,
  indexMetricsById,
} from '@/db/queries/exercises';
import {
  entriesForSession,
  indexSetsByEntry,
  sessionById,
  setsForSession,
  type ExerciseEntry,
} from '@/db/queries/sessions';
import { formatSetCount, formatTarget } from '@/lib/format';

/**
 * The session screen (FEATURES.md §7.1).
 *
 * Every row carries its `2 / 4` counter, so a glance shows what is outstanding
 * **without opening the exercise**. That specific element is the fix for the
 * problem this application exists for — sets getting forgotten when tired — and
 * it is why the counters are read live rather than computed once on entry.
 *
 * Four queries rather than one join: `useLiveQuery` watches only the root
 * table, and the counter has to move the instant a set is logged.
 */
export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: found, updatedAt } = useLiveQuery(sessionById(id), [id]);
  const { data: entries } = useLiveQuery(entriesForSession(id), [id]);
  const { data: setRows } = useLiveQuery(setsForSession(id), [id]);
  const { data: exercises } = useLiveQuery(allLiveExercises());
  const { data: metrics } = useLiveQuery(allMetrics());

  const setsByEntry = useMemo(() => indexSetsByEntry(setRows), [setRows]);
  const exercisesById = useMemo(
    () => indexExercisesById(exercises),
    [exercises],
  );
  const metricsById = useMemo(() => indexMetricsById(metrics), [metrics]);

  const session = found.at(0);
  const settled = updatedAt !== undefined;

  const describe = (entry: ExerciseEntry) =>
    formatTarget(
      entry,
      entry.targetMetricId ? metricsById.get(entry.targetMetricId) : undefined,
    );

  return (
    <Screen bleed>
      <FlatList
        data={entries}
        keyExtractor={(entry) => entry.id}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={
          <View>
            <BackButton />
            {session ? (
              <Text className="px-xl pb-xl pt-sm font-sans-semibold text-display text-text">
                {session.name ?? 'Session'}
              </Text>
            ) : settled ? (
              <Text className="px-xl pt-xl text-body text-text-2">
                This session is no longer here.
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const done = setsByEntry.get(item.id)?.length ?? 0;

          return (
            <ListRow
              title={exercisesById.get(item.exerciseId)?.name ?? 'Exercise'}
              subtitle={describe(item)}
              trailing={
                <Text className="font-mono text-metricSm text-text-2">
                  {formatSetCount(done, item.targetSets)}
                </Text>
              }
              // Rows are not tappable yet: the logging screen arrives in step
              // 4, and typed routes fail the typecheck on an href that goes
              // nowhere.
            />
          );
        }}
        ListEmptyComponent={
          session ? (
            <View className="px-xl">
              <EmptyState
                title="Nothing planned"
                body="This session has no exercises yet. Add one to start logging."
              />
            </View>
          ) : null
        }
      />
    </Screen>
  );
}
