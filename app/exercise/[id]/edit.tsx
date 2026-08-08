import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { BackButton } from '@/components/ui/back-button';
import { DoneAction, FormActions } from '@/components/ui/form-actions';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { updateExercise } from '@/db/mutations/exercises';
import { exerciseById, metricsForExercise } from '@/db/queries/exercises';
import type { Exercise, ExerciseMetric } from '@/db/queries/exercises';
import {
  ExerciseForm,
  toNullable,
  type ExerciseFormValues,
} from '@/features/exercises/exercise-form';
import { MetricEditor } from '@/features/exercises/metric-editor';
import { useDraftExit } from '@/lib/use-draft-exit';

/**
 * Editing an exercise — a **mixed screen** (FEATURES.md §18).
 *
 * The fields at the top are a draft saved on demand. The metrics below are not:
 * each add, reorder and removal is an individual act and commits as you make
 * it.
 *
 * **The split has to be visible, and it used not to be.** A single `Save` sat
 * under the whole screen, so it appeared to own the metric list too — pressing
 * it after adding a metric implied that metric had been pending, when it was
 * already on disk. Now the draft's actions sit inside the draft's own section,
 * under a heading that says what they cover, and the metric list ends with a
 * `Done` that only navigates.
 */
export default function EditExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: found, updatedAt } = useLiveQuery(exerciseById(id), [id]);
  const { data: metrics } = useLiveQuery(metricsForExercise(id), [id]);

  const exercise = found.at(0);
  const settled = updatedAt !== undefined;

  return (
    <Screen bleed>
      <ScrollView
        contentContainerClassName="pb-3xl"
        keyboardShouldPersistTaps="handled"
      >
        {!exercise ? (
          <>
            <BackButton />
            {settled ? (
              <Text className="px-xl pt-xl text-body text-text-2">
                This exercise is no longer here.
              </Text>
            ) : null}
          </>
        ) : (
          /*
            Keyed on the row so the draft initialises from props and is never
            synced afterwards. Re-filling it on every live update would
            overwrite what is being typed the moment a metric below changes.
          */
          <Draft key={exercise.id} exercise={exercise} metrics={metrics} />
        )}
      </ScrollView>
    </Screen>
  );
}

function Draft({
  exercise,
  metrics,
}: {
  exercise: Exercise;
  metrics: ExerciseMetric[];
}) {
  const stored: ExerciseFormValues = {
    name: exercise.name,
    family: exercise.family ?? '',
    notes: exercise.notes ?? '',
  };

  const [values, setValues] = useState<ExerciseFormValues>(stored);

  const dirty =
    values.name !== stored.name ||
    values.family !== stored.family ||
    values.notes !== stored.notes;

  // An exercise has to be called something, so an empty name never saves.
  const named = values.name.trim().length > 0;

  const save = () =>
    updateExercise(exercise.id, {
      name: values.name.trim(),
      family: toNullable(values.family),
      notes: toNullable(values.notes),
    });

  const { requestExit, saveAndLeave } = useDraftExit({
    dirty: dirty && named,
    onSave: save,
    onDiscard: () => setValues(stored),
  });

  return (
    <>
      <BackButton onPress={requestExit} />

      <Text className="px-xl pt-sm font-sans-semibold text-display text-text">
        Edit
      </Text>

      <View className="gap-xl px-xl pb-2xl pt-xl">
        <ExerciseForm values={values} onChange={setValues} />
        <FormActions
          dirty={dirty}
          valid={named}
          onDiscard={() => setValues(stored)}
          onSave={saveAndLeave}
          saveLabel="Save details"
        />
      </View>

      {/* Everything below commits as you act on it, so it ends in Done. */}
      <MetricEditor exerciseId={exercise.id} metrics={metrics} />

      <View className="px-xl pt-2xl">
        <DoneAction onPress={requestExit} />
      </View>
    </>
  );
}
