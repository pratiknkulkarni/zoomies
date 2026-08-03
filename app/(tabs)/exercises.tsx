import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { Plus, X } from 'lucide-react-native';
import { useMemo, type ReactNode } from 'react';
import { Pressable, SectionList, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { iconWithClassName } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { SectionLabel } from '@/components/ui/section-label';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { activateExercise, dismissSuggestion } from '@/db/mutations/exercises';
import {
  activeExercises,
  allMetrics,
  indexMetricsByExercise,
  suggestedExercises,
  type Exercise,
} from '@/db/queries/exercises';

const PlusIcon = iconWithClassName(Plus);
const DismissIcon = iconWithClassName(X);

type Section = {
  kind: 'library' | 'suggested';
  title: string;
  data: Exercise[];
};

/**
 * The active library, with FEATURES.md §3.3's Suggested section beneath it.
 *
 * Three live queries rather than one join: `useLiveQuery` watches only the root
 * table of its query, so metrics are read separately — joined in, a metric edit
 * would never reach this screen. See `db/queries/exercises.ts`.
 */
export default function ExercisesScreen() {
  const { data: library } = useLiveQuery(activeExercises());
  const { data: suggestions } = useLiveQuery(suggestedExercises());
  const { data: metrics } = useLiveQuery(allMetrics());

  const metricsByExercise = useMemo(
    () => indexMetricsByExercise(metrics),
    [metrics],
  );

  const describe = (exercise: Exercise) =>
    metricsByExercise
      .get(exercise.id)
      ?.map((metric) => metric.name)
      .join(' · ');

  const sections: Section[] = [
    { kind: 'library', title: 'Library', data: library },
    // Hidden entirely when there is nothing to suggest. An empty section
    // header would imply something had gone missing.
    ...(suggestions.length > 0
      ? [{ kind: 'suggested' as const, title: 'Suggested', data: suggestions }]
      : []),
  ];

  return (
    <Screen bleed>
      <SectionList
        sections={sections}
        keyExtractor={(exercise) => exercise.id}
        stickySectionHeadersEnabled={false}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={
          <View className="flex-row items-center justify-between pl-xl pr-md pt-xl">
            <Text className="font-sans-semibold text-display text-text">
              Exercises
            </Text>
            <IconButton
              label="New exercise"
              onPress={() => router.push('/exercise/new')}
            >
              <PlusIcon size={24} strokeWidth={1.5} className="text-text-2" />
            </IconButton>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <SectionLabel className="px-xl pb-sm pt-2xl">
            {section.title}
          </SectionLabel>
        )}
        renderItem={({ item, section }) =>
          section.kind === 'library' ? (
            <ListRow
              title={item.name}
              subtitle={describe(item)}
              onPress={() =>
                router.push({
                  pathname: '/exercise/[id]',
                  params: { id: item.id },
                })
              }
            />
          ) : (
            <ListRow
              title={item.name}
              subtitle={describe(item)}
              tone="suggested"
              trailing={
                <View className="flex-row items-center">
                  <IconButton
                    label={`Add ${item.name}`}
                    onPress={() => void activateExercise(item.id)}
                  >
                    <PlusIcon
                      size={24}
                      strokeWidth={1.5}
                      className="text-text-2"
                    />
                  </IconButton>
                  <IconButton
                    label={`Dismiss ${item.name}`}
                    onPress={() => void dismissSuggestion(item.id)}
                  >
                    <DismissIcon
                      size={24}
                      strokeWidth={1.5}
                      className="text-text-3"
                    />
                  </IconButton>
                </View>
              }
            />
          )
        }
        ListEmptyComponent={
          <View className="px-xl">
            <EmptyState
              title="Your library"
              body="Exercises you train live here. The built-in ones came with the app."
              action={{
                label: 'New exercise',
                onPress: () => router.push('/exercise/new'),
              }}
            />
          </View>
        }
      />
    </Screen>
  );
}

/**
 * §9 puts a 48×48 floor under every target. The glyph is 24, so the padding is
 * what makes the control reachable rather than the icon itself.
 */
function IconButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="min-h-touch min-w-touch items-center justify-center active:bg-muted"
    >
      {children}
    </Pressable>
  );
}
