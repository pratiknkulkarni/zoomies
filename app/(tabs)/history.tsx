import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Tag } from '@/components/ui/tag';
import { Text } from '@/components/ui/text';
import { allLiveExercises, indexExercisesById } from '@/db/queries/exercises';
import {
  completedSessions,
  countBySession,
  indexEntriesBySession,
  liveEntryRefs,
  liveSetRefs,
} from '@/db/queries/history';
import type { Session } from '@/db/queries/sessions';
import {
  formatDayRange,
  formatDuration,
  formatSessionDate,
} from '@/lib/format';
import { gapsAfter, sessionLengthMs, type TrainingGap } from '@/lib/history';

/**
 * The timeline (FEATURES.md §9) — everything trained, newest first.
 *
 * **Flat, with the breaks drawn.** This was grouped under a heading per day,
 * which stated the days that exist and said nothing about the ones that do not.
 * Training clusters — two sessions and a quick log, then nothing for four days
 * — and the gap is part of the record. A rule reading `8–11 Aug · no training`
 * costs one hairline and says the thing a missing heading could not.
 *
 * Four live queries rather than joins, as everywhere else: `useLiveQuery`
 * watches only its query's root table, so a joined count would never move when
 * a set was logged or an entry removed.
 */
export default function HistoryScreen() {
  const { data: history, updatedAt } = useLiveQuery(completedSessions());
  const { data: entryRefs } = useLiveQuery(liveEntryRefs());
  const { data: setRefs } = useLiveQuery(liveSetRefs());
  const { data: exercises } = useLiveQuery(allLiveExercises());

  const entriesBySession = useMemo(
    () => indexEntriesBySession(entryRefs),
    [entryRefs],
  );
  const setsBySession = useMemo(() => countBySession(setRefs), [setRefs]);
  const exercisesById = useMemo(
    () => indexExercisesById(exercises),
    [exercises],
  );

  const gaps = useMemo(
    () =>
      gapsAfter(
        history.map((session) => session.completedAt ?? session.startedAt),
      ),
    [history],
  );

  // `data` starts empty, so "nothing trained yet" and "not read yet" look
  // identical until `updatedAt` lands.
  const settled = updatedAt !== undefined;

  return (
    <Screen bleed>
      <FlatList
        data={history}
        keyExtractor={(session) => session.id}
        ListHeaderComponent={
          <Text className="px-2xl pb-sm pt-2xl font-sans-semibold text-display text-text">
            History
          </Text>
        }
        renderItem={({ item, index }) => (
          <>
            <Row
              session={item}
              exercises={(entriesBySession.get(item.id) ?? []).map(
                (id) => exercisesById.get(id)?.name ?? 'Exercise',
              )}
              setCount={setsBySession.get(item.id) ?? 0}
            />
            <GapRule gap={gaps.get(index)} />
          </>
        )}
        ListEmptyComponent={
          settled ? (
            <View className="px-2xl">
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
 * One session, or one quick log.
 *
 * A session gives its name, when it ran and how long, then what was in it. A
 * quick log gives none of that — it has no name (§6.1), and its start and end
 * are the same instant, so a duration would read as a very short session rather
 * than as something that was never one. It says what it was instead, on one
 * line, behind a tag that classifies rather than warns.
 *
 * An ad-hoc session reads `No plan`, which is a fact about how it started and
 * not an absence: it was training, it just began without one.
 */
function Row({
  session,
  exercises,
  setCount,
}: {
  session: Session;
  exercises: string[];
  setCount: number;
}) {
  const date = formatSessionDate(session.completedAt ?? session.startedAt);
  const length = sessionLengthMs(session);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        router.push({ pathname: '/history/[id]', params: { id: session.id } })
      }
      className="min-h-touch justify-center gap-xs px-2xl py-md active:bg-muted"
    >
      <View className="flex-row items-baseline gap-lg">
        {session.isQuickLog ? (
          <View className="flex-1 flex-row items-center gap-sm">
            <Tag quiet>One-off</Tag>
            <Text
              className="shrink font-sans-semibold text-heading text-text"
              numberOfLines={1}
            >
              {exercises.at(0) ?? 'Exercise'}
            </Text>
          </View>
        ) : (
          <Text
            className="flex-1 font-sans-semibold text-heading text-text"
            numberOfLines={1}
          >
            {session.name ?? 'No plan'}
          </Text>
        )}

        <Text className="font-mono text-metricXs text-text-3">
          {session.isQuickLog || length === null
            ? date
            : `${date} · ${formatDuration(length)}`}
        </Text>
      </View>

      {/* What was in it. A quick log's title already says everything it holds. */}
      {session.isQuickLog ? null : (
        <Text className="font-mono text-metricXs text-text-5">
          {[...exercises, setCount === 1 ? '1 set' : `${setCount} sets`].join(
            ' · ',
          )}
        </Text>
      )}
    </Pressable>
  );
}

/**
 * `8–11 Aug · no training`, drawn between the two rows it separates.
 *
 * Centred between two rules rather than sharing the rows' left edge, because
 * anything on that edge is read as another row. It is the only thing in the
 * list that is not something you did.
 */
function GapRule({ gap }: { gap: TrainingGap | undefined }) {
  if (!gap) {
    return null;
  }

  return (
    <View className="flex-row items-center gap-md px-2xl py-md">
      <View className="h-hairline flex-1 bg-rule" />
      <Text className="font-mono text-metricXs text-text-5">
        {formatDayRange(gap.fromMs, gap.toMs)} · no training
      </Text>
      <View className="h-hairline flex-1 bg-rule" />
    </View>
  );
}
