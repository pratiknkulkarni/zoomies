import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { Plus, X } from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, SectionList, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { iconWithClassName } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { SectionLabel } from '@/components/ui/section-label';
import { Text } from '@/components/ui/text';
import { activateExercise, dismissSuggestion } from '@/db/mutations/exercises';
import {
  activeExercises,
  allMetrics,
  archivedExercises,
  indexMetricsByExercise,
  suggestedExercises,
  type Exercise,
} from '@/db/queries/exercises';
import { lastTrainedByExercise, lastTrainedPerExercise } from '@/db/queries/history';
import { formatMeasures, formatSessionDate } from '@/lib/format';
import { matchesQuery } from '@/lib/search';

const PlusIcon = iconWithClassName(Plus);
const DismissIcon = iconWithClassName(X);

type Section = {
  kind: 'library' | 'suggested';
  title: string;
  data: Exercise[];
};

/**
 * The library, grouped by what a movement is, with FEATURES.md §3.3's Suggested
 * section beneath it.
 *
 * **Grouped rather than one alphabetical list.** You come here knowing roughly
 * what you want to train, not the first letter of its name — and the grouping
 * is `family`, which already exists to drive suggestions (§3.3). Search is
 * there for when you do know the name.
 *
 * Every row carries the two facts needed to pick one: what it measures, and
 * when it was last trained. The second is what makes neglect visible from here
 * rather than only from the dashboard.
 *
 * Five live queries rather than joins: `useLiveQuery` watches only the root
 * table of its query, so metrics and sets are read separately — joined in, a
 * metric edit or a logged set would never reach this screen.
 */
export default function ExercisesScreen() {
  const { data: library } = useLiveQuery(activeExercises());
  const { data: suggestions } = useLiveQuery(suggestedExercises());
  const { data: metrics } = useLiveQuery(allMetrics());
  const { data: trained } = useLiveQuery(lastTrainedPerExercise());
  // Read for its length alone: the way to the archive exists only while there
  // is something in it.
  const { data: archived } = useLiveQuery(archivedExercises());

  const [query, setQuery] = useState('');

  const metricsByExercise = useMemo(
    () => indexMetricsByExercise(metrics),
    [metrics],
  );
  const lastTrained = useMemo(
    () => lastTrainedByExercise(trained),
    [trained],
  );

  const matching = useMemo(
    () => library.filter((exercise) => matchesQuery(exercise.name, query)),
    [library, query],
  );

  /**
   * Groups in the order their first member appears, which is alphabetical —
   * so the order is stable across launches and does not need a second column
   * to decide it. Anything without a family lands together at the end; that is
   * a fact about the exercise, not a group of its own.
   */
  const sections: Section[] = useMemo(() => {
    const byFamily = new Map<string, Exercise[]>();

    for (const exercise of matching) {
      const key = exercise.family ?? '';
      const existing = byFamily.get(key);
      if (existing) {
        existing.push(exercise);
      } else {
        byFamily.set(key, [exercise]);
      }
    }

    const unfamilied = byFamily.get('');
    byFamily.delete('');

    const grouped: Section[] = [...byFamily].map(([title, data]) => ({
      kind: 'library' as const,
      title,
      data,
    }));

    if (unfamilied) {
      grouped.push({ kind: 'library', title: 'Everything else', data: unfamilied });
    }

    // Hidden entirely while searching and when there is nothing to suggest: an
    // empty header would imply something had gone missing, and a suggestion is
    // not a search result.
    if (suggestions.length > 0 && query.trim().length === 0) {
      grouped.push({ kind: 'suggested', title: 'Suggested', data: suggestions });
    }

    return grouped;
  }, [matching, suggestions, query]);

  const describe = (exercise: Exercise) =>
    [
      formatMeasures(metricsByExercise.get(exercise.id) ?? []),
      formatTrained(lastTrained.get(exercise.id)),
    ]
      .filter(Boolean)
      .join(' · ');

  return (
    <Screen bleed>
      <SectionList
        sections={sections}
        keyExtractor={(exercise) => exercise.id}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            <View className="flex-row items-center justify-between pl-2xl pr-md pt-2xl">
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

            {library.length > 0 ? (
              <View className="px-2xl pt-md">
                <Input
                  value={query}
                  onChangeText={setQuery}
                  accessibilityLabel="Search exercises"
                  placeholder={
                    library.length === 1
                      ? 'Search 1 exercise'
                      : `Search ${library.length} exercises`
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            ) : null}
          </>
        }
        renderSectionHeader={({ section }) => (
          <SectionLabel className="px-2xl pb-sm pt-xl">
            {section.title}
          </SectionLabel>
        )}
        renderItem={({ item, section }) =>
          section.kind === 'library' ? (
            <Row
              name={item.name}
              detail={describe(item)}
              onPress={() =>
                router.push({
                  pathname: '/exercise/[id]',
                  params: { id: item.id },
                })
              }
            />
          ) : (
            <Row
              name={item.name}
              detail={describe(item)}
              quiet
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
                      className="text-text-4"
                    />
                  </IconButton>
                </View>
              }
            />
          )
        }
        ListEmptyComponent={
          query.trim().length > 0 ? (
            <Text className="px-2xl pt-xl text-bodySm text-text-3">
              Nothing matches “{query.trim()}”.
            </Text>
          ) : (
            <View className="px-2xl">
              <EmptyState
                title="Your library"
                body="Exercises you train live here. The built-in ones came with the app."
                action={{
                  label: 'New exercise',
                  onPress: () => router.push('/exercise/new'),
                }}
              />
            </View>
          )
        }
        ListFooterComponent={
          archived.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/exercise/archived')}
              className="min-h-touch justify-center px-2xl pt-xl active:bg-muted"
            >
              <Text className="text-bodySm text-text-3">
                Archived · {archived.length} ›
              </Text>
            </Pressable>
          ) : null
        }
      />
    </Screen>
  );
}

/**
 * When a movement was last done, or nothing at all.
 *
 * **Never trained is absent, not a date and not `never`.** A row already says
 * what it measures; adding a word for the absence of history to every exercise
 * you have not got to yet turns the library into a list of omissions.
 */
function formatTrained(performedAt: number | undefined): string | undefined {
  return performedAt === undefined ? undefined : formatSessionDate(performedAt);
}

/**
 * One exercise: its name, and the two facts that let you choose it.
 *
 * `quiet` is the Suggested tone of §3.3 — visibly not yet owned, carried by ink
 * rather than by a badge saying so.
 */
function Row({
  name,
  detail,
  quiet = false,
  trailing,
  onPress,
}: {
  name: string;
  detail: string;
  quiet?: boolean;
  trailing?: ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${detail}`}
      onPress={onPress}
      disabled={!onPress}
      className="min-h-touch flex-row items-center gap-lg px-2xl py-md active:bg-muted"
    >
      <Text
        className={
          quiet
            ? 'flex-1 font-sans-semibold text-heading text-text-3'
            : 'flex-1 font-sans-semibold text-heading text-text'
        }
        numberOfLines={1}
      >
        {name}
      </Text>

      {detail ? (
        <Text className="font-mono text-metricXs text-text-4">{detail}</Text>
      ) : null}

      {trailing}
    </Pressable>
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
