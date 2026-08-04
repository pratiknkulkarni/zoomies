import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, View } from 'react-native';

import { BackButton } from '@/components/ui/back-button';
import { EmptyState } from '@/components/ui/empty-state';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import {
  allMetrics,
  archivedExercises,
  indexMetricsByExercise,
} from '@/db/queries/exercises';
import { formatMetricSummary } from '@/lib/format';

/**
 * What has been archived (FEATURES.md §3.5), and the only way back from it.
 *
 * Deliberately its own screen rather than a section of the Exercises tab:
 * archived exercises are meant to be out of the way, and the tab only offers a
 * way here while there is something to see. Rows open the ordinary detail
 * screen, which already carries `Unarchive`.
 */
export default function ArchivedExercisesScreen() {
  const { data: archived } = useLiveQuery(archivedExercises());
  const { data: metrics } = useLiveQuery(allMetrics());

  const metricsByExercise = useMemo(
    () => indexMetricsByExercise(metrics),
    [metrics],
  );

  return (
    <Screen bleed>
      <FlatList
        data={archived}
        keyExtractor={(exercise) => exercise.id}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={
          <View>
            <BackButton />
            <Text className="px-xl pb-xl pt-sm font-sans-semibold text-display text-text">
              Archived
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ListRow
            title={item.name}
            subtitle={formatMetricSummary(metricsByExercise.get(item.id) ?? [])}
            onPress={() =>
              router.push({
                pathname: '/exercise/[id]',
                params: { id: item.id },
              })
            }
          />
        )}
        // Reachable only by unarchiving the last one without leaving.
        ListEmptyComponent={
          <View className="px-xl">
            <EmptyState
              title="Your archive"
              body="Exercises you archive land here. They leave your library and pickers, and keep every set logged against them."
            />
          </View>
        }
      />
    </Screen>
  );
}
