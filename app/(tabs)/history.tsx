import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { SectionList, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { SectionLabel } from '@/components/ui/section-label';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import {
  allLiveExercises,
  indexExercisesById,
} from '@/db/queries/exercises';
import {
  completedSessions,
  indexEntriesBySession,
  liveEntryRefs,
} from '@/db/queries/history';
import type { Session } from '@/db/queries/sessions';
import { formatDuration, formatSessionDate } from '@/lib/format';
import { sessionLengthMs } from '@/lib/history';

type Day = {
  title: string;
  data: Session[];
};

/**
 * The timeline (FEATURES.md §9) — completed sessions, newest first.
 *
 * Two live queries rather than a join, as everywhere else: `useLiveQuery`
 * watches only its query's root table, so a joined exercise count would never
 * move when an entry was added or a session deleted. The counts are joined in
 * memory.
 *
 * Grouped by day rather than listed flat. Training clusters — two sessions and
 * a quick log on one day, then nothing for three — and a flat list makes the
 * gaps invisible, which is the shape of the record most worth seeing.
 */
export default function HistoryScreen() {
  const { data: history, updatedAt } = useLiveQuery(completedSessions());
  const { data: entryRefs } = useLiveQuery(liveEntryRefs());
  const { data: exercises } = useLiveQuery(allLiveExercises());

  const entriesBySession = useMemo(
    () => indexEntriesBySession(entryRefs),
    [entryRefs],
  );
  const exercisesById = useMemo(
    () => indexExercisesById(exercises),
    [exercises],
  );

  /**
   * Sessions are already newest first, so days fall out in order by walking
   * them once. Grouping on the formatted date rather than a computed day
   * boundary means the heading and the grouping can never disagree.
   */
  const days: Day[] = useMemo(() => {
    const grouped: Day[] = [];

    for (const session of history) {
      const title = formatSessionDate(session.completedAt ?? session.startedAt);
      const current = grouped.at(-1);

      if (current?.title === title) {
        current.data.push(session);
      } else {
        grouped.push({ title, data: [session] });
      }
    }

    return grouped;
  }, [history]);

  // `data` starts empty, so "nothing trained yet" and "not read yet" look
  // identical until `updatedAt` lands.
  const settled = updatedAt !== undefined;

  return (
    <Screen bleed>
      <SectionList
        sections={days}
        keyExtractor={(session) => session.id}
        ItemSeparatorComponent={Separator}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <Text className="px-xl pb-sm pt-xl font-sans-semibold text-display text-text">
            History
          </Text>
        }
        renderSectionHeader={({ section }) => (
          <View className="px-xl pb-sm pt-2xl">
            <SectionLabel>{section.title}</SectionLabel>
          </View>
        )}
        renderItem={({ item }) => (
          <ListRow
            title={titleFor(item, entriesBySession, exercisesById)}
            subtitle={describe(item, entriesBySession)}
            onPress={() =>
              router.push({
                pathname: '/history/[id]',
                params: { id: item.id },
              })
            }
          />
        )}
        ListEmptyComponent={
          settled ? (
            <View className="px-xl">
              <EmptyState
                title="Your training"
                body="Sessions appear here once you finish them. So do quick logs."
              />
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

/**
 * What a row is called.
 *
 * A session carries the template's name, copied at start so history still reads
 * as `Rings` after the template is renamed or deleted. **A quick log has no
 * name** (§6.1) — it was never planned — so it borrows its exercise's, which is
 * the only thing it was ever about.
 */
function titleFor(
  session: Session,
  entriesBySession: Map<string, string[]>,
  exercisesById: Map<string, { name: string }>,
): string {
  if (session.name) {
    return session.name;
  }

  const first = entriesBySession.get(session.id)?.at(0);
  const exercise = first ? exercisesById.get(first) : undefined;

  return exercise?.name ?? 'Session';
}

/**
 * The metadata line: `48m · 4 exercises`.
 *
 * **A quick log says so instead of giving a duration.** Its start and end are
 * the same instant, so a length would read `1m` and imply a very short session
 * rather than something that was never one. §11.5 keeps quick logs out of the
 * sessions figure on the dashboard; saying it here is what stops the timeline
 * making the same mistake by omission.
 */
function describe(
  session: Session,
  entriesBySession: Map<string, string[]>,
): string {
  const count = entriesBySession.get(session.id)?.length ?? 0;
  const exercises = count === 1 ? '1 exercise' : `${count} exercises`;

  if (session.isQuickLog) {
    return `Quick log · ${exercises}`;
  }

  const length = sessionLengthMs(session);

  return length === null
    ? exercises
    : `${formatDuration(length)} · ${exercises}`;
}
