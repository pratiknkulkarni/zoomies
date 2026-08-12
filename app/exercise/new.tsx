import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { createExercise } from '@/db/mutations/exercises';
import {
  EMPTY_EXERCISE,
  ExerciseForm,
  toNullable,
  type ExerciseFormValues,
} from '@/features/exercises/exercise-form';

/**
 * A custom exercise (FEATURES.md §3.4). Identical to a built-in once created.
 *
 * Metrics are not collected here. The exercise is created and the screen hands
 * straight over to its editor, so metric configuration has exactly one
 * implementation rather than a second one that only exists before the row does.
 */
export default function NewExerciseScreen() {
  const [values, setValues] = useState<ExerciseFormValues>(EMPTY_EXERCISE);

  const named = values.name.trim().length > 0;

  const create = () => {
    if (!named) {
      return;
    }

    void createExercise(
      {
        name: values.name.trim(),
        family: toNullable(values.family),
        notes: toNullable(values.notes),
      },
      [],
    ).then((id) => {
      router.replace({ pathname: '/exercise/[id]/edit', params: { id } });
    });
  };

  return (
    <Screen bleed>
      <ScrollView
        contentContainerClassName="pb-3xl"
        keyboardShouldPersistTaps="handled"
      >
        <BackButton />

        <Text className="px-2xl pt-sm font-sans-semibold text-display text-text">
          New exercise
        </Text>

        <View className="gap-2xl px-2xl pt-2xl">
          <ExerciseForm values={values} onChange={setValues} />
          <Button variant="primary" disabled={!named} onPress={create}>
            <Text>Create</Text>
          </Button>
        </View>
      </ScrollView>
    </Screen>
  );
}
