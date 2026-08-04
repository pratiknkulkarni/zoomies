import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { iconWithClassName } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { updateExercise } from '@/db/mutations/exercises';
import { exerciseById, metricsForExercise } from '@/db/queries/exercises';
import type { Exercise } from '@/db/queries/exercises';
import {
  ExerciseForm,
  toNullable,
  type ExerciseFormValues,
} from '@/features/exercises/exercise-form';
import { MetricEditor } from '@/features/exercises/metric-editor';

const BackIcon = iconWithClassName(ChevronLeft);

/**
 * Editing an exercise. The fields are a draft held in memory and saved on
 * demand; the metrics below them are not — each reorder, addition and removal
 * commits immediately, because they are individual acts rather than a form.
 */
export default function EditExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: found, updatedAt } = useLiveQuery(exerciseById(id), [id]);
  const { data: metrics } = useLiveQuery(metricsForExercise(id), [id]);

  const exercise = found.at(0);
  const settled = updatedAt !== undefined;

  return (
    <Screen bleed>
      <ScrollView contentContainerClassName="pb-3xl">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          className="ml-md min-h-touch min-w-touch items-center justify-center self-start active:bg-muted"
        >
          <BackIcon size={24} strokeWidth={1.5} className="text-text-2" />
        </Pressable>

        {!exercise ? (
          settled ? (
            <Text className="px-xl pt-xl text-body text-text-2">
              This exercise is no longer here.
            </Text>
          ) : null
        ) : (
          <>
            <Text className="px-xl pt-sm font-sans-semibold text-display text-text">
              Edit
            </Text>

            {/*
              Keyed on the row so the draft initialises from props and is never
              synced afterwards. Re-filling it on every live update would
              overwrite what is being typed the moment a metric below changes.
            */}
            <Draft key={exercise.id} exercise={exercise} />

            <MetricEditor exerciseId={exercise.id} metrics={metrics} />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function Draft({ exercise }: { exercise: Exercise }) {
  const [values, setValues] = useState<ExerciseFormValues>({
    name: exercise.name,
    family: exercise.family ?? '',
    notes: exercise.notes ?? '',
  });

  const named = values.name.trim().length > 0;

  const save = () => {
    if (!named) {
      return;
    }

    void updateExercise(exercise.id, {
      name: values.name.trim(),
      family: toNullable(values.family),
      notes: toNullable(values.notes),
    }).then(() => router.back());
  };

  return (
    <View className="gap-xl px-xl pb-2xl pt-xl">
      <ExerciseForm values={values} onChange={setValues} />
      <Button variant="primary" disabled={!named} onPress={save}>
        <Text>Save</Text>
      </Button>
    </View>
  );
}
