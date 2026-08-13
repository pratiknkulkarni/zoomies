import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { BackButton } from '@/components/ui/back-button';
import { DoneAction, FormActions } from '@/components/ui/form-actions';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { updateExercise, updateMetric } from '@/db/mutations/exercises';
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
              <Text className="px-2xl pt-2xl text-body text-text-2">
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

  /**
   * Renames typed into the metric rows below and not yet saved.
   *
   * A ref for the values and a count for the render: the guard needs to know
   * *whether* anything is pending on every render, and *what* is pending only
   * when it saves. Keeping the names themselves out of state stops a keystroke
   * in one row re-rendering every other one.
   */
  const renames = useRef(new Map<string, string>());
  const [pendingRenames, setPendingRenames] = useState(0);

  const trackRename = useCallback((metricId: string, name: string | null) => {
    if (name === null) {
      renames.current.delete(metricId);
    } else {
      renames.current.set(metricId, name);
    }

    setPendingRenames(renames.current.size);
  }, []);

  const save = async () => {
    if (dirty && named) {
      await updateExercise(exercise.id, {
        name: values.name.trim(),
        family: toNullable(values.family),
        notes: toNullable(values.notes),
      });
    }

    for (const [metricId, name] of renames.current) {
      await updateMetric(metricId, { name });
    }

    renames.current.clear();
    setPendingRenames(0);
  };

  const { requestExit, saveAndLeave } = useDraftExit({
    // Anything typed and unsaved, wherever on the screen it was typed.
    dirty: (dirty && named) || pendingRenames > 0,
    onSave: save,
    onDiscard: () => setValues(stored),
  });

  return (
    <>
      <BackButton onPress={requestExit} />

      <Text className="px-2xl pt-sm font-sans-semibold text-display text-text">
        Edit
      </Text>

      <View className="gap-2xl px-2xl pb-xl pt-2xl">
        <ExerciseForm values={values} onChange={setValues} />
        <FormActions
          dirty={dirty}
          valid={named}
          onDiscard={() => setValues(stored)}
          onSave={saveAndLeave}
          saveLabel="Save details"
        />
      </View>

      {/* Adding, reordering and removing commit as you act on them; only a
          rename is drafted, and it reports itself to the guard above. */}
      <MetricEditor
        exerciseId={exercise.id}
        metrics={metrics}
        onPendingRename={trackRename}
      />

      <View className="px-2xl pt-xl">
        <DoneAction onPress={requestExit} />
      </View>
    </>
  );
}
