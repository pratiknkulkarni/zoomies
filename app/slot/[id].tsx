import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { BackButton } from '@/components/ui/back-button';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { SectionLabel } from '@/components/ui/section-label';
import { Text } from '@/components/ui/text';
import { setSlotTarget, updateSlot } from '@/db/mutations/templates';
import {
  exerciseById,
  metricsForExercise,
  type ExerciseMetric,
} from '@/db/queries/exercises';
import { slotById, type TemplateSlot } from '@/db/queries/templates';
import { describeMeasure } from '@/lib/metrics';
import { fromNullableNumber, toNullableFloat, toNullableInt } from '@/lib/parse';
import { cn } from '@/lib/utils';

/**
 * What a slot plans: how many sets, of what, with how much rest (§5.1).
 *
 * Its own screen because the slot row already carries three controls and four
 * more fields would not fit under a thumb. Reached by id alone — slot ids are
 * UUID v7 and globally unique, so the route needs no template to scope it.
 *
 * **Every field here is nullable and each null means something.** No target
 * sets shows the completed count with nothing to reach; no rest seconds means
 * no timer, which is what lets handstand practice run uninterrupted. Emptying a
 * field is a decision, not a failure to decide, so it is written as null rather
 * than defaulted back.
 */
export default function SlotScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: found, updatedAt } = useLiveQuery(slotById(id), [id]);
  const slot = found.at(0);
  const settled = updatedAt !== undefined;

  return (
    <Screen bleed>
      <ScrollView
        contentContainerClassName="pb-3xl"
        keyboardShouldPersistTaps="handled"
      >
        <BackButton />

        {!slot ? (
          settled ? (
            <Text className="px-xl pt-xl text-body text-text-2">
              This exercise is no longer in the template.
            </Text>
          ) : null
        ) : (
          <Editor key={slot.id} slot={slot} />
        )}
      </ScrollView>
    </Screen>
  );
}

/**
 * Keyed on the slot so the fields initialise from props once. The query is
 * live, and a field reading straight from props would be reset mid-edit
 * whenever a sibling field committed.
 */
function Editor({ slot }: { slot: TemplateSlot }) {
  const { data: exercise } = useLiveQuery(exerciseById(slot.exerciseId), [
    slot.exerciseId,
  ]);
  const { data: metrics } = useLiveQuery(metricsForExercise(slot.exerciseId), [
    slot.exerciseId,
  ]);

  const [sets, setSets] = useState(fromNullableNumber(slot.targetSets));
  const [value, setValue] = useState(fromNullableNumber(slot.targetValue));
  const [rest, setRest] = useState(fromNullableNumber(slot.restSeconds));
  const [metricId, setMetricId] = useState(slot.targetMetricId);

  /**
   * **Written on every keystroke, not on blur.**
   *
   * Blur never fires if the screen is left with the field still focused, and
   * with `keyboardShouldPersistTaps="handled"` on the ScrollView a tap on Back
   * goes straight to the button without dismissing the keyboard first. So
   * typing `45` into Rest and tapping Back wrote nothing, and the slot kept the
   * 60 that `addSlot` had defaulted it to.
   *
   * Committing as you type is also what invariant 1 asks for everywhere else:
   * writes land before any UI transition. These are single integers against
   * local SQLite, so the cost of a write per keystroke is not worth a debounce
   * — and a debounce reintroduces the same question about what happens when the
   * screen goes away mid-wait.
   */
  const changeSets = (next: string) => {
    setSets(next);
    void updateSlot(slot.id, { targetSets: toNullableInt(next) });
  };

  const changeRest = (next: string) => {
    setRest(next);
    void updateSlot(slot.id, { restSeconds: toNullableInt(next) });
  };

  const changeValue = (next: string) => {
    setValue(next);
    commitTarget(metricId, next);
  };

  /**
   * Metric and value travel together: a value with no metric does not say what
   * `8` counts, and a metric with no value states nothing. Either being absent
   * clears both.
   */
  const commitTarget = (nextMetricId: string | null, nextValue: string) => {
    const parsed = toNullableFloat(nextValue);

    void setSlotTarget(
      slot.id,
      nextMetricId !== null && parsed !== null
        ? { metricId: nextMetricId, value: parsed }
        : null,
    );
  };

  const chooseMetric = (metric: ExerciseMetric) => {
    // Tapping the chosen one again clears the target rather than leaving no way
    // to undo it.
    const next = metricId === metric.id ? null : metric.id;
    setMetricId(next);
    commitTarget(next, value);
  };

  return (
    <>
      <Text className="px-xl pt-sm font-sans-semibold text-display text-text">
        {exercise.at(0)?.name ?? 'Exercise'}
      </Text>

      <View className="gap-xl px-xl pt-xl">
        <View className="gap-xs">
          <SectionLabel>Sets</SectionLabel>
          <Input
            value={sets}
            onChangeText={changeSets}
            accessibilityLabel="Target sets"
            keyboardType="number-pad"
            placeholder="No target"
          />
          <Text className="text-caption text-text-2">
            Left empty, the session counts the sets you do without one to reach.
          </Text>
        </View>

        <View className="gap-xs">
          <SectionLabel>Target</SectionLabel>

          {metrics.length === 0 ? (
            <Text className="text-bodySm text-text-2">
              This exercise records nothing yet, so there is nothing to target.
            </Text>
          ) : (
            <>
              <View className="flex-row flex-wrap gap-sm">
                {metrics.map((metric) => (
                  <MetricChip
                    key={metric.id}
                    label={metric.name}
                    hint={describeMeasure(metric)}
                    selected={metricId === metric.id}
                    onPress={() => chooseMetric(metric)}
                  />
                ))}
              </View>

              <Input
                value={value}
                onChangeText={changeValue}
                accessibilityLabel="Target value"
                keyboardType="decimal-pad"
                placeholder="No target"
                editable={metricId !== null}
              />
            </>
          )}
        </View>

        <View className="gap-xs">
          <SectionLabel>Rest</SectionLabel>
          <Input
            value={rest}
            onChangeText={changeRest}
            accessibilityLabel="Rest seconds"
            keyboardType="number-pad"
            placeholder="No rest timer"
          />
          <Text className="text-caption text-text-2">
            Seconds. Left empty there is no timer at all, so repeated attempts
            are never interrupted by a countdown.
          </Text>
        </View>
      </View>
    </>
  );
}

/** Same treatment as the metric type chips — §3.1 names `muted` as inactive. */
function MetricChip({
  label,
  hint,
  selected,
  onPress,
}: {
  label: string;
  hint: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}, ${hint}`}
      onPress={onPress}
      className={cn(
        'min-h-touch items-center justify-center rounded-full px-lg',
        selected ? 'border border-border bg-surface' : 'bg-muted',
      )}
    >
      <Text
        className={cn(
          'text-bodySm',
          selected ? 'font-sans-semibold text-text' : 'text-text-2',
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}
