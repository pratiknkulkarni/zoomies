import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Alert, FlatList, Pressable, View } from 'react-native';

import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { SectionLabel } from '@/components/ui/section-label';
import { Text } from '@/components/ui/text';
import { deleteExercise, unarchiveExercise } from '@/db/mutations/exercises';
import { archivedExercises, type Exercise } from '@/db/queries/exercises';
import {
  lastTrainedByExercise,
  setCountByExercise,
  trainedAtRefs,
} from '@/db/queries/history';
import { formatSessionDate } from '@/lib/format';

/**
 * What has been archived (FEATURES.md §3.5), and the only way back from it.
 *
 * Deliberately its own screen rather than a section of the Exercises tab:
 * archived exercises are meant to be out of the way, and the tab offers a way
 * here only while there is something to see.
 *
 * **Archive is the exit, not deletion.** Every row keeps its sets and stays
 * readable in history, which is the whole reason archiving exists — a movement
 * that got too easy is usually a graduation (§3.3). Only something with no
 * history at all can actually be removed, and the screen says which.
 */
export default function ArchivedExercisesScreen() {
  const { data: archived } = useLiveQuery(archivedExercises());
  const { data: trained } = useLiveQuery(trainedAtRefs());

  const setCounts = useMemo(() => setCountByExercise(trained), [trained]);
  const lastTrained = useMemo(() => lastTrainedByExercise(trained), [trained]);

  const untrained = archived.filter(
    (exercise) => (setCounts.get(exercise.id) ?? 0) === 0,
  );

  const confirmDelete = (exercise: Exercise) => {
    Alert.alert(
      `Delete ${exercise.name}?`,
      'It has no sets logged against it, so nothing is lost. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void deleteExercise(exercise.id),
        },
      ],
    );
  };

  return (
    <Screen bleed>
      <FlatList
        data={archived}
        keyExtractor={(exercise) => exercise.id}
        ListHeaderComponent={
          <View>
            <BackButton />
            <Text className="px-2xl pt-sm font-sans-semibold text-display text-text">
              Archived
            </Text>
            <Text className="px-2xl pt-xs text-bodySm text-text-3">
              Out of the pickers and out of your library. History is untouched
              and still counts.
            </Text>

            {archived.length > 0 ? (
              <SectionLabel className="px-2xl pb-sm pt-xl">
                {archived.length === 1
                  ? 'Exercises · 1'
                  : `Exercises · ${archived.length}`}
              </SectionLabel>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <Row
            exercise={item}
            sets={setCounts.get(item.id) ?? 0}
            lastAt={lastTrained.get(item.id)}
          />
        )}
        // Reachable only by unarchiving the last one without leaving.
        ListEmptyComponent={
          <View className="px-2xl">
            <EmptyState
              title="Your archive"
              body="Exercises you put away land here. They keep their history and stay out of the pickers."
            />
          </View>
        }
        ListFooterComponent={
          /*
            One callout rather than a Delete on every row. Deletion is available
            to exactly the things that would lose nothing by it, and saying so
            once is what stops the row control reading as the ordinary way out
            of here — which is Restore.
          */
          untrained.length > 0 ? (
            <View className="mx-2xl mt-2xl gap-md rounded-card border border-rule p-lg">
              <Text className="text-bodySm text-text-2">
                {untrained.length === 1 && untrained[0]
                  ? `${untrained[0].name} has no history. It is the only thing here that can be deleted outright.`
                  : `${untrained.length} of these have no history, and are the only things here that can be deleted outright.`}
              </Text>
              {untrained.map((exercise) => (
                <Button
                  key={exercise.id}
                  variant="danger"
                  className="w-full"
                  onPress={() => confirmDelete(exercise)}
                >
                  <Text>Delete {exercise.name}</Text>
                </Button>
              ))}
            </View>
          ) : null
        }
        contentContainerClassName="pb-3xl"
      />
    </Screen>
  );
}

/**
 * One archived exercise, with what it did and the way back.
 *
 * `Restore` sits on the row rather than behind the detail screen: this screen
 * exists to answer "where did that go", and the answer is only useful with the
 * undo attached to it.
 */
function Row({
  exercise,
  sets,
  lastAt,
}: {
  exercise: Exercise;
  sets: number;
  lastAt: number | undefined;
}) {
  const history =
    sets === 0
      ? 'Never trained'
      : [
          sets === 1 ? '1 set' : `${sets} sets`,
          lastAt === undefined ? null : `last ${formatSessionDate(lastAt)}`,
        ]
          .filter(Boolean)
          .join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${exercise.name}, ${history}`}
      onPress={() =>
        router.push({ pathname: '/exercise/[id]', params: { id: exercise.id } })
      }
      className="min-h-touch flex-row items-center gap-lg px-2xl py-md active:bg-muted"
    >
      <View className="flex-1 gap-xs">
        <Text className="font-sans-semibold text-heading text-text">
          {exercise.name}
        </Text>
        <Text className="font-mono text-metricXs text-text-4">{history}</Text>
      </View>

      <Button
        variant="secondary"
        onPress={() => void unarchiveExercise(exercise.id)}
      >
        <Text>Restore</Text>
      </Button>
    </Pressable>
  );
}
