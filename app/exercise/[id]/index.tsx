import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, ScrollView, View } from 'react-native';

import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { SectionLabel } from '@/components/ui/section-label';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import {
  archiveExercise,
  deleteExercise,
  unarchiveExercise,
} from '@/db/mutations/exercises';
import { exerciseById, metricsForExercise } from '@/db/queries/exercises';
import { formatMetricDetail } from '@/lib/format';

/**
 * One exercise: what it is and what it records. History and personal records
 * are Phase 8 and are deliberately absent — this screen exists now so the
 * metric configuration has somewhere to live.
 */
export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  // `[id]` as deps: `useLiveQuery` defaults to running its effect once, so
  // without this the screen would keep showing the first exercise it loaded.
  const { data: found, updatedAt } = useLiveQuery(exerciseById(id), [id]);
  const { data: metrics } = useLiveQuery(metricsForExercise(id), [id]);

  const exercise = found.at(0);

  // `data` starts as an empty array, so "no rows" and "not read yet" look
  // identical. `updatedAt` is undefined until the first result lands, and
  // without checking it the screen claims the exercise is gone for the frame
  // before its own query answers.
  const settled = updatedAt !== undefined;

  const confirmDelete = () => {
    if (!exercise) {
      return;
    }

    Alert.alert(
      `Delete ${exercise.name}?`,
      'Sets already logged against it are kept, and stay readable in history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteExercise(exercise.id).then(() => router.back());
          },
        },
      ],
    );
  };

  return (
    <Screen bleed>
      <ScrollView contentContainerClassName="pb-3xl">
        <BackButton />

        {!exercise ? (
          settled ? (
            <Text className="px-xl pt-xl text-body text-text-2">
              This exercise is no longer here.
            </Text>
          ) : null
        ) : (
          <>
            <Text className="px-xl pt-sm font-sans-semibold text-display text-text">
              {exercise.name}
            </Text>

            <View className="gap-lg px-xl pt-xl">
              <Field label="Family" value={exercise.family} />
              <Field label="Notes" value={exercise.notes} />
              {exercise.isArchived ? (
                <Field label="Status" value="Archived" />
              ) : null}
            </View>

            <SectionLabel className="px-xl pb-sm pt-2xl">Metrics</SectionLabel>

            {metrics.length === 0 ? (
              <Text className="px-xl text-bodySm text-text-2">
                Nothing is recorded for this exercise yet.
              </Text>
            ) : (
              metrics.map((metric, index) => (
                <View key={metric.id}>
                  {index > 0 ? <Separator /> : null}
                  <ListRow
                    title={metric.name}
                    subtitle={formatMetricDetail(metric, index === 0)}
                  />
                </View>
              ))
            )}

            <View className="gap-md px-xl pt-2xl">
              <Button
                variant="secondary"
                onPress={() =>
                  router.push({
                    pathname: '/exercise/[id]/edit',
                    params: { id: exercise.id },
                  })
                }
              >
                <Text>Edit</Text>
              </Button>
              <Button
                variant="secondary"
                onPress={() =>
                  void (exercise.isArchived
                    ? unarchiveExercise(exercise.id)
                    : archiveExercise(exercise.id))
                }
              >
                <Text>{exercise.isArchived ? 'Unarchive' : 'Archive'}</Text>
              </Button>
              <Button variant="danger" onPress={confirmDelete}>
                <Text>Delete</Text>
              </Button>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

/**
 * A labelled value in the §2.4 pairing. Null reads as `—`: not recorded is not
 * the same as empty, and the dash is how the difference shows.
 */
function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <View className="gap-xs">
      <SectionLabel>{label}</SectionLabel>
      <Text className={value ? 'text-body text-text' : 'text-body text-text-3'}>
        {value ?? '—'}
      </Text>
    </View>
  );
}
