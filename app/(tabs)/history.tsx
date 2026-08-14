import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { SectionLabel } from '@/components/ui/section-label';
import { Tag } from '@/components/ui/tag';
import { Text } from '@/components/ui/text';
import { allLiveExercises, indexExercisesById } from '@/db/queries/exercises';
import {
  completedSessions,
  countBySession,
  indexEntriesBySession,
  liveEntryRefs,
  setCountsBySession,
} from '@/db/queries/history';
import type { Session } from '@/db/queries/sessions';
import {
  formatDayRange,
  formatDuration,
  formatMonthYear,
  formatSessionDate,
} from '@/lib/format';
import {
  gapsAfter,
  monthHeadings,
  sessionLengthMs,
  type TrainingGap,
} from '@/lib/history';
import { cn } from '@/lib/utils';

/**
 * The timeline (FEATURES.md §9) — everything trained, newest first.
 *
 * **Flat, with the breaks drawn.** This was grouped under a heading per day,
 * which stated the days that exist and said nothing about the ones that do not.
 * Training clusters — two sessions and a quick log, then nothing for four days
 * — and the gap is part of the record. A rule reading `8–11 Aug · no training`
 * costs one hairline and says the thing a missing heading could not.
 *
 * **Ruled, and regular.** Whitespace alone was not enough here, which is the
 * condition `DESIGN.md` §1.4 puts on adding a hairline: the rows are two
 * different heights by design, and a dozen of them with only air between read
 * as one column of loose text. Every row is ruled, every row is a fixed number
 * of lines, and nothing wraps.
 *
 * Four live queries rather than joins, as everywhere else: `useLiveQuery`
 * watches only its query's root table, so a joined count would never move when
 * a set was logged or an entry removed.
 */
export default function HistoryScreen() {
  const { data: history, updatedAt } = useLiveQuery(completedSessions());
  const { data: entryRefs } = useLiveQuery(liveEntryRefs());
  const { data: setRefs } = useLiveQuery(setCountsBySession());
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

  const when = useMemo(
    () => history.map((session) => session.completedAt ?? session.startedAt),
    [history],
  );

  const gaps = useMemo(() => gapsAfter(when), [when]);
  const months = useMemo(() => monthHeadings(when), [when]);

  // `data` starts empty, so "nothing trained yet" and "not read yet" look
  // identical until `updatedAt` lands.
  const settled = updatedAt !== undefined;

  return (
    <Screen bleed>
      <FlatList
        data={history}
        keyExtractor={(session) => session.id}
        /*
          Look back moved to a tab of its own; the rule stays, because it is
          what separates the title from the first session under it.
        */
        ListHeaderComponent={
          <View className="border-b border-rule px-2xl pb-md pt-2xl">
            <Text className="font-sans-semibold text-display text-text">
              History
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <>
            <MonthHeading monthMs={months.get(index)} first={index === 0} />
            <Row
              session={item}
              exercises={(entriesBySession.get(item.id) ?? []).map(
                (id) => exercisesById.get(id)?.name ?? 'Exercise',
              )}
              setCount={setsBySession.get(item.id) ?? 0}
              /*
                A rule under every row but the ones that already have something
                under them. A gap rule separates more loudly than a hairline
                does, and the last row is followed by nothing to be separated
                from — a trailing rule in open space reads as a row that failed
                to load.
              */
              divided={
                gaps.get(index) === undefined && index < history.length - 1
              }
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
 *
 * **Ruled, because the rows are not the same height.** A session is two lines
 * and a quick log is one, and a screen of them with only whitespace between
 * asks the eye to work out where each one ends — twelve entries read as one
 * column of loose text rather than twelve things. One hairline per row settles
 * it, and it is the same `rule-2` the session and dashboard lists already use.
 */
function Row({
  session,
  exercises,
  setCount,
  divided,
}: {
  session: Session;
  exercises: string[];
  setCount: number;
  divided: boolean;
}) {
  const date = formatSessionDate(session.completedAt ?? session.startedAt);
  const length = sessionLengthMs(session);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        router.push({ pathname: '/history/[id]', params: { id: session.id } })
      }
      className={cn(
        'min-h-touch justify-center gap-xs px-2xl py-md active:bg-muted',
        divided && 'border-b border-rule-2',
      )}
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

      {/*
        What was in it. A quick log's title already says everything it holds.

        One line, never two. A six-exercise session wrapped to three lines and
        made a single row taller than the two beside it put together, which is
        most of why this screen read as a heap rather than a list. Every session
        row is now exactly two lines high and every quick log exactly one.

        The names shrink and the set count does not: truncation should eat the
        detail and never the total, and `Pull-Up · Ring Dip · Ring Sup…` still
        says what the session was.
      */}
      {session.isQuickLog ? null : (
        <View className="flex-row items-baseline gap-sm">
          <Text
            className="shrink font-mono text-metricXs text-text-5"
            numberOfLines={1}
          >
            {exercises.join(' · ')}
          </Text>
          <Text className="font-mono text-metricXs text-text-5">
            {setCount === 1 ? '1 set' : `${setCount} sets`}
          </Text>
        </View>
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
/**
 * `AUG 2026` — where one month of the timeline gives way to the next.
 *
 * **Left-aligned on the gutter, unlike `GapRule`**, and the difference is the
 * point. A gap is centred between two rules because it is the one thing in the
 * list that is *not* something you did; a month heading is a place, and places
 * belong on the edge you read down. It is §2.4's label treatment, which is what
 * every other section of the application uses to name what follows it.
 *
 * No rule of its own. The row beneath a heading keeps its own hairline and the
 * space above does the separating — DESIGN.md §1.2 rule 4, whitespace before
 * borders, and a heading boxed in by rules would read as heavier than the
 * sessions it labels.
 */
function MonthHeading({
  monthMs,
  first,
}: {
  monthMs: number | undefined;
  first: boolean;
}) {
  if (monthMs === undefined) {
    return null;
  }

  return (
    <SectionLabel className={first ? 'px-2xl pb-sm pt-lg' : 'px-2xl pb-sm pt-2xl'}>
      {formatMonthYear(monthMs)}
    </SectionLabel>
  );
}

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
