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
import { addSlot } from '@/db/mutations/templates';
import {
  activeExercises,
  allMetrics,
  indexMetricsByExercise,
} from '@/db/queries/exercises';
import { slotsForTemplate } from '@/db/queries/templates';
import { formatMetricSummary, formatSlotCount } from '@/lib/format';

/**
 * Picking exercises to add to a template.
 *
 * Offers `activeExercises` only — §3.5 puts archived exercises out of pickers.
 * A slot that already names an archived exercise still renders on the template;
 * lookup and offering are different jobs.
 *
 * Tapping adds and stays here, because a template is usually built several
 * exercises at a time and bouncing back after each would cost a round trip per
 * exercise. The count in the header is the acknowledgement — an "added" mark on
 * the row would be a lie, since the same exercise may legitimately appear twice
 * in one template.
 */
export default function AddExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: library } = useLiveQuery(activeExercises());
  const { data: metrics } = useLiveQuery(allMetrics());
  const { data: slots } = useLiveQuery(slotsForTemplate(id), [id]);

  const metricsByExercise = useMemo(
    () => indexMetricsByExercise(metrics),
    [metrics],
  );

  return (
    <Screen bleed>
      <FlatList
        data={library}
        keyExtractor={(exercise) => exercise.id}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={
          <View>
            <BackButton />
            <Text className="px-xl pt-sm font-sans-semibold text-display text-text">
              Add an exercise
            </Text>
            <Text className="px-xl pb-xl pt-xs text-bodySm text-text-2">
              {formatSlotCount(slots.length)} in this template
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ListRow
            title={item.name}
            subtitle={formatMetricSummary(metricsByExercise.get(item.id) ?? [])}
            onPress={() => void addSlot(id, item.id)}
          />
        )}
        ListEmptyComponent={
          <View className="px-xl">
            <EmptyState
              title="Nothing to add"
              body="Your library is empty. Exercises come from the Exercises tab."
            />
          </View>
        }
      />
    </Screen>
  );
}
