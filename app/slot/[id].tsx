import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { BackButton } from '@/components/ui/back-button';
import { FormActions } from '@/components/ui/form-actions';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { SectionLabel } from '@/components/ui/section-label';
import { Text } from '@/components/ui/text';
import { setSlotPlan } from '@/db/mutations/templates';
import {
  exerciseById,
  metricsForExercise,
  type ExerciseMetric,
} from '@/db/queries/exercises';
import { slotById, type TemplateSlot } from '@/db/queries/templates';
import { describeMeasure } from '@/lib/metrics';
import { fromNullableNumber, toNullableFloat, toNullableInt } from '@/lib/parse';
import { useDraftExit } from '@/lib/use-draft-exit';
import { cn } from '@/lib/utils';

/**
 * What a slot plans: how many sets, of what, and how long you rest between them
 * (§5.1, §8.2).
 *
 * Its own screen because the slot row already carries three controls and these
 * fields would not fit under a thumb beside them. Reached by id alone — slot
 * ids are UUID v7 and globally unique, so the route needs no template to scope
 * it.
 *
 * **Every field here is nullable and each null means something.** No target
 * sets shows the completed count with nothing to reach; no target metric means
 * no measurement to beat; no rest means no countdown between sets at all.
 * Emptying a field is a decision, not a failure to decide, so it is written as
 * null rather than defaulted back.
 *
 * A **draft screen** (§18, Pattern A). It used to write on every keystroke and
 * carry no button at all, which meant the only way to leave was to press Back
 * and hope.
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
        {!slot ? (
          <>
            <BackButton />
            {settled ? (
              <Text className="px-2xl pt-2xl text-body text-text-2">
                This exercise is no longer in the template.
              </Text>
            ) : null}
          </>
        ) : (
          <Editor key={slot.id} slot={slot} />
        )}
      </ScrollView>
    </Screen>
  );
}

/**
 * Keyed on the slot so the fields initialise from props once. The query is
 * live, and a draft re-filled from props would be overwritten mid-edit.
 */
function Editor({ slot }: { slot: TemplateSlot }) {
  const { data: exercise } = useLiveQuery(exerciseById(slot.exerciseId), [
    slot.exerciseId,
  ]);
  const { data: metrics } = useLiveQuery(metricsForExercise(slot.exerciseId), [
    slot.exerciseId,
  ]);

  const stored = {
    sets: fromNullableNumber(slot.targetSets),
    value: fromNullableNumber(slot.targetValue),
    metricId: slot.targetMetricId,
    rest: fromNullableNumber(slot.restSeconds),
  };

  const [sets, setSets] = useState(stored.sets);
  const [value, setValue] = useState(stored.value);
  const [metricId, setMetricId] = useState(stored.metricId);
  const [rest, setRest] = useState(stored.rest);

  const dirty =
    sets !== stored.sets ||
    value !== stored.value ||
    metricId !== stored.metricId ||
    rest !== stored.rest;

  const discard = () => {
    setSets(stored.sets);
    setValue(stored.value);
    setMetricId(stored.metricId);
    setRest(stored.rest);
  };

  /**
   * Whether this plan will run as a cycle (§8.2) rather than as a countdown you
   * restart by hand — which changes what the caption below has to warn about.
   *
   * The same four conditions the entry screen checks, asked of the draft rather
   * than of the stored row, so the caption describes what Save is about to
   * mean.
   */
  const cycles =
    metrics.at(0)?.type === 'duration' &&
    metricId === metrics.at(0)?.id &&
    toNullableFloat(value) !== null &&
    toNullableInt(sets) !== null &&
    toNullableInt(rest) !== null;

  /**
   * One write for the whole screen, which is what makes the fields a plan
   * rather than four independent settings. Metric and value in particular have
   * always had to travel together — a value with no metric does not say what
   * `8` counts — and now they cannot even briefly disagree. Rest hangs off the
   * same pair, and `setSlotPlan` clears it when they go.
   */
  const save = () => {
    const targetValue = toNullableFloat(value);

    return setSlotPlan(slot.id, {
      targetSets: toNullableInt(sets),
      target:
        metricId !== null && targetValue !== null
          ? { metricId, value: targetValue }
          : null,
      restSeconds: toNullableInt(rest),
    });
  };

  const { requestExit, saveAndLeave } = useDraftExit({
    dirty,
    onSave: save,
    onDiscard: discard,
  });

  const chooseMetric = (metric: ExerciseMetric) =>
    // Tapping the chosen one again clears the target rather than leaving no way
    // to undo it.
    setMetricId((current) => (current === metric.id ? null : metric.id));

  return (
    <>
      <BackButton onPress={requestExit} />

      <Text className="px-2xl pt-sm font-sans-semibold text-display text-text">
        {exercise.at(0)?.name ?? 'Exercise'}
      </Text>

      <View className="gap-2xl px-2xl pt-2xl">
        <View className="gap-xs">
          <SectionLabel>Sets</SectionLabel>
          <Input
            value={sets}
            onChangeText={setSets}
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
                onChangeText={setValue}
                accessibilityLabel="Target value"
                keyboardType="number-pad"
                placeholder="No target"
                editable={metricId !== null}
              />
            </>
          )}
        </View>

        {/*
          §8.2 — rest is offered only once there is a target, in the same way
          the target value is offered only once there is a metric. A countdown
          between sets of nothing measured is a timer with no exercise attached,
          and `setSlotPlan` clears this alongside the target for the same
          reason.

          Empty is the default and means no rest, so a slot that says nothing
          about rest behaves exactly as it did before this existed.
        */}
        {metrics.length > 0 ? (
          <View className="gap-xs">
            <SectionLabel>Rest</SectionLabel>
            <Input
              value={rest}
              onChangeText={setRest}
              accessibilityLabel="Rest between sets, in seconds"
              keyboardType="number-pad"
              placeholder="No rest"
              editable={metricId !== null}
            />
            <Text className="text-caption text-text-2">
              {metricId === null
                ? 'Choose a target first.'
                : cycles
                  ? 'Seconds to rest after every set of this exercise. The next set starts counting down on its own when it ends.'
                  : 'Seconds to rest after every set of this exercise.'}
            </Text>
          </View>
        ) : null}

        <FormActions
          dirty={dirty}
          onDiscard={discard}
          onSave={saveAndLeave}
        />
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
