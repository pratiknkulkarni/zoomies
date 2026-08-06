import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useLocalSearchParams } from 'expo-router';
import { Minus } from 'lucide-react-native';
import { useMemo } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { BackButton } from '@/components/ui/back-button';
import { EmptyState } from '@/components/ui/empty-state';
import { iconWithClassName } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { addSlot, removeSlot } from '@/db/mutations/templates';
import {
  activeExercises,
  allMetrics,
  indexMetricsByExercise,
  type Exercise,
  type ExerciseMetric,
} from '@/db/queries/exercises';
import { slotsForTemplate, type TemplateSlot } from '@/db/queries/templates';
import {
  formatMetricSummary,
  formatSlotCount,
  formatSlotTally,
} from '@/lib/format';

const MinusIcon = iconWithClassName(Minus);

/**
 * Picking exercises to add to a template.
 *
 * Offers `activeExercises` only — §3.5 puts archived exercises out of pickers.
 * A slot that already names an archived exercise still renders on the template;
 * lookup and offering are different jobs.
 *
 * Tapping adds and stays here, because a template is usually built several
 * exercises at a time and bouncing back after each would cost a round trip per
 * exercise.
 *
 * **The same exercise may legitimately appear twice** — pull-ups to open and
 * again as a finisher — so this counts rather than toggling. It used to say the
 * count in the header was acknowledgement enough, which was wrong twice over:
 * the header is at the top of the screen while the thumb is at the bottom, and
 * it says *something* was added rather than *which*. The tally and its `−` sit
 * on the row, so a stray double-tap is visible and undoable where it happened.
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

  /** Slots per exercise, in template order, so `−` can drop the last one. */
  const slotsByExercise = useMemo(() => {
    const byExercise = new Map<string, TemplateSlot[]>();

    for (const slot of slots) {
      const existing = byExercise.get(slot.exerciseId);
      if (existing) {
        existing.push(slot);
      } else {
        byExercise.set(slot.exerciseId, [slot]);
      }
    }

    return byExercise;
  }, [slots]);

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
          <PickerRow
            templateId={id}
            exercise={item}
            metrics={metricsByExercise.get(item.id) ?? []}
            chosen={slotsByExercise.get(item.id) ?? []}
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

/**
 * Built out rather than reaching for `ListRow`, for the reason `SlotList` gives:
 * a row cannot be wholly pressable when it carries a control of its own. The
 * name adds; the `−` removes.
 */
function PickerRow({
  templateId,
  exercise,
  metrics,
  chosen,
}: {
  templateId: string;
  exercise: Exercise;
  metrics: ExerciseMetric[];
  chosen: TemplateSlot[];
}) {
  const tally = formatSlotTally(chosen.length);
  const summary = formatMetricSummary(metrics);

  // The last one added is the one a stray tap created, so it is the one to
  // take back.
  const newest = chosen.at(-1);

  return (
    <View className="min-h-row flex-row items-center gap-md pr-md">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Add ${exercise.name}`}
        onPress={() => void addSlot(templateId, exercise.id)}
        className="min-h-row flex-1 justify-center py-md pl-xl active:bg-muted"
      >
        <Text className="font-sans-semibold text-heading text-text">
          {exercise.name}
        </Text>
        {summary ? (
          <Text className="pt-xs text-caption text-text-2">{summary}</Text>
        ) : null}
      </Pressable>

      {tally ? (
        <Text className="font-mono text-metricSm text-text-2">{tally}</Text>
      ) : null}

      {newest ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove one ${exercise.name}`}
          onPress={() => void removeSlot(templateId, newest.id)}
          className="min-h-touch min-w-touch items-center justify-center active:bg-muted"
        >
          <MinusIcon size={24} strokeWidth={1.5} className="text-text-3" />
        </Pressable>
      ) : (
        // Keeps the name column the same width whether or not the row carries a
        // control, so the list does not shift as exercises are added.
        <View className="min-w-touch" />
      )}
    </View>
  );
}
