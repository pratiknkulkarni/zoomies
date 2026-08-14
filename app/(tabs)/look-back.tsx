import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { SectionLabel } from '@/components/ui/section-label';
import { Text } from '@/components/ui/text';
import { rankableValues } from '@/db/queries/dashboard';
import {
  activeExercises,
  allLiveExercises,
  allMetrics,
  indexExercisesById,
  indexMetricsById,
} from '@/db/queries/exercises';
import {
  completedSessions,
  lastTrainedByExercise,
  trainedAtRefs,
} from '@/db/queries/history';
import { DayGrid } from '@/features/dashboard/day-grid';
import {
  daysTrainedGrid,
  longestSinceTrained,
  recentRecords,
  trainingCounts,
  type Neglected,
  type RecentRecord,
} from '@/lib/dashboard';
import {
  formatDayRange,
  formatLastTrained,
  formatMeasure,
  formatShortDate,
  formatTrainingWindow,
} from '@/lib/format';

/** §11.3's window for the two counts — stated once so both captions match. */
const COUNT_DAYS = 28;

/** §11.3's window for records. Longer, because a record is rarer than a session. */
const RECORD_DAYS = 30;

/**
 * Look back (FEATURES.md §11).
 *
 * ```
 * ← Look back
 *
 * DAYS TRAINED · 20 May – 15 Aug
 * M ■ ■ □ □ ■ ■ □ □ ■ □ ■ □ ■
 * ...
 *   MAY      JUN      JUL   AUG
 *
 * 11                 4
 * sessions,          quick logs,
 * last 28 days       last 28 days
 *
 * LONGEST SINCE TRAINED
 * Nordic Curl              6 May · 101 days
 *
 * RECENT RECORDS
 * Ring Support Hold                    42 s
 * up from 38 s · 9 Aug
 * ```
 *
 * **Four facts about the past and nothing else.** §11.2 asks four questions and
 * this answers them in the order they get useful: the grid says whether you are
 * showing up, the counts say how much, the list says what is being neglected,
 * and the records say what was beaten. §11.6's exclusions are not features left
 * out — a composite score or a readiness figure would have to invent the number
 * it displayed, which §11.1 already forbids.
 *
 * **Nothing here is celebratory and nothing animates.** Records are stated. The
 * grid carries no count, no current run and no reset, which is the entire
 * difference between it and the object it resembles.
 *
 * Six live queries, each rooted at the table it must react to. Five of them
 * already existed for other screens; correcting a set from three weeks ago
 * moves the grid, the counts, the neglect list and the records together,
 * because none of the four is stored (invariant 3).
 *
 * **Not on Home**, and now a tab of its own. What you want at 18:39 in a garage
 * is a Start button, not a review of the last twelve weeks — which is why this
 * is not on Home, and that reasoning is untouched by the move. It was reached
 * from a `Look back ›` link on History's title row, and that stopped being
 * defensible when Settings left the same treatment on Home: one text link in
 * one corner of one screen is a navigation vocabulary of a single word, which
 * is the objection the codebase already raises against an icon used once.
 */
export default function LookBackScreen() {
  const { data: trained, updatedAt } = useLiveQuery(trainedAtRefs());
  const { data: history } = useLiveQuery(completedSessions());
  const { data: active } = useLiveQuery(activeExercises());
  const { data: exercises } = useLiveQuery(allLiveExercises());
  const { data: metrics } = useLiveQuery(allMetrics());
  const { data: values } = useLiveQuery(rankableValues());

  const exercisesById = useMemo(
    () => indexExercisesById(exercises),
    [exercises],
  );
  const metricsById = useMemo(() => indexMetricsById(metrics), [metrics]);

  /*
    The clock, read once when the screen opens rather than on every render.

    Four folds below need to know what day it is, and reading it four times
    would let a render that straddled midnight put today in the grid and not in
    the counts. Fixing it at mount also means a set logged elsewhere refreshes
    the figures without moving the day underneath them — which is what a screen
    about the past should do. Every visit pushes a fresh instance, so it is
    never stale for longer than one reading.

    None of the four folds is memoised, and deliberately: this screen holds no
    other state, so it renders only when one of the six queries moves, which is
    exactly when all four would have to be recomputed anyway.
  */
  const [now] = useState(() => Date.now());

  const grid = daysTrainedGrid(
    trained.map((row) => row.performedAt),
    now,
  );

  const counts = trainingCounts(history, now, COUNT_DAYS);

  const lastTrained = lastTrainedByExercise(trained);

  const neglected = longestSinceTrained(
    active.map((exercise) => exercise.id),
    lastTrained,
    now,
  );

  /*
    Only rankable metrics hold a record (§10.1). A `notes` metric contributes no
    rows at all — it stores `value_text` and the query filters on `value_num` —
    but filtering by type here is what makes that a rule rather than a
    consequence of how notes happen to be stored.
  */
  const records = recentRecords(
    values.flatMap((row) => {
      const metric = metricsById.get(row.metricId);

      return row.value !== null && metric && metric.type !== 'notes'
        ? [{ ...row, value: row.value }]
        : [];
    }),
    now,
    { windowDays: RECORD_DAYS },
  );

  const settled = updatedAt !== undefined;

  /** Shared by both counts, so the pair cannot describe two different months. */
  const covers = formatTrainingWindow(
    counts.sinceMs,
    counts.wholeWindow,
    COUNT_DAYS,
  );

  /*
    Which sentence the empty neglect list gets. `Everything has been trained in
    the last week` is the obvious one and is false the moment the library holds
    something never trained at all — which, with fifteen active exercises seeded
    and two of them done, is week one.
  */
  const everTrained = active.some((exercise) => lastTrained.has(exercise.id));

  return (
    <Screen bleed>
      <ScrollView contentContainerClassName="pb-3xl">
        {/* A tab now, so there is nothing to go back to. */}
        <Text className="px-2xl font-sans-semibold text-display text-text">
          Look back
        </Text>

        {grid ? (
          <View className="gap-md px-2xl pt-xl">
            <SectionLabel>
              {`Days trained · ${formatDayRange(grid.fromMs, grid.toMs)}`}
            </SectionLabel>
            <DayGrid grid={grid} />
          </View>
        ) : settled ? (
          <View className="px-2xl">
            <EmptyState
              title="Nothing to look back on"
              body="Finish a session or log a set and this fills in — the days you trained, what has gone longest without one, and anything you beat."
            />
          </View>
        ) : null}

        {grid ? (
          <>
            <View className="flex-row gap-xl px-2xl pt-xl">
              <Count
                value={counts.sessions}
                singular="session"
                plural="sessions"
                window={covers}
              />
              {/*
                §11.5 keeps quick logs out of the sessions figure. Stating them
                beside it rather than dropping them is the difference between a
                rule and a silence: a week of doorway sets is not a week of
                sessions, but it is certainly not a week of nothing.
              */}
              <Count
                value={counts.quickLogs}
                singular="quick log"
                plural="quick logs"
                window={covers}
              />
            </View>

            <View className="pt-xl">
              <SectionLabel className="px-2xl pb-sm">
                Longest since trained
              </SectionLabel>
              {neglected.length > 0 ? (
                neglected.map((item) => (
                  <NeglectedRow
                    key={item.exerciseId}
                    item={item}
                    name={exercisesById.get(item.exerciseId)?.name ?? 'Exercise'}
                  />
                ))
              ) : (
                <Text className="px-2xl text-bodySm text-text-2">
                  {everTrained
                    ? 'Nothing has gone a week without being trained.'
                    : 'Nothing in your library has been trained yet. This fills in as exercises go a week without a turn.'}
                </Text>
              )}
            </View>

            <View className="pt-xl">
              <SectionLabel className="px-2xl pb-sm">
                Recent records
              </SectionLabel>
              {records.length > 0 ? (
                records.map((record) => (
                  <RecordRow
                    key={`${record.exerciseId}-${record.metricId}`}
                    record={record}
                    name={
                      exercisesById.get(record.exerciseId)?.name ?? 'Exercise'
                    }
                    metric={metricsById.get(record.metricId)}
                    onOpen={() =>
                      router.push({
                        pathname: '/exercise/[id]',
                        params: { id: record.exerciseId },
                      })
                    }
                  />
                ))
              ) : (
                <Text className="px-2xl text-bodySm text-text-2">
                  {`Nothing beaten in the last ${RECORD_DAYS} days. The first set of an exercise is a starting point rather than a record.`}
                </Text>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

/**
 * One of the two counts. The figure at `metric` size over its own caption,
 * which is where the meaning is — the number alone is `11`.
 */
function Count({
  value,
  singular,
  plural,
  window,
}: {
  value: number;
  singular: string;
  plural: string;
  window: string;
}) {
  return (
    <View className="flex-1 gap-xs">
      <Text className="font-mono text-metric text-text">{value}</Text>
      <Text className="text-caption text-text-3">
        {`${value === 1 ? singular : plural}, ${window}`}
      </Text>
    </View>
  );
}

/** `Nordic Curl` on the left, `6 May · 101 days` on the right. */
function NeglectedRow({ item, name }: { item: Neglected; name: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, last trained ${formatLastTrained(
        item.lastTrainedAt,
        item.days,
      )}`}
      onPress={() =>
        router.push({
          pathname: '/exercise/[id]',
          params: { id: item.exerciseId },
        })
      }
      className="min-h-touch flex-row items-center gap-lg border-b border-rule-2 px-2xl py-md active:bg-muted"
    >
      <Text className="flex-1 text-body text-text" numberOfLines={1}>
        {name}
      </Text>
      <Text className="font-mono text-metricXs text-text-3">
        {formatLastTrained(item.lastTrainedAt, item.days)}
      </Text>
    </Pressable>
  );
}

/**
 * `Ring Support Hold — 42 s`, with `up from 38 s · 9 Aug` beneath.
 *
 * **Stated, never congratulated** (§11.6, DESIGN.md §8). No confetti, no
 * counting-up figure, no exclamation. What it beat is on the line below because
 * that is the fact that makes the top line mean anything — `42 s` alone is a
 * measurement, and `up from 38 s` is the achievement.
 */
function RecordRow({
  record,
  name,
  metric,
  onOpen,
}: {
  record: RecentRecord;
  name: string;
  metric: { name: string; unit: string | null } | undefined;
  onOpen: () => void;
}) {
  const measure = (value: number) =>
    metric ? formatMeasure(value, metric, { bare: true }) : String(value);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${measure(record.value)}, up from ${measure(
        record.previous,
      )}`}
      onPress={onOpen}
      className="min-h-touch justify-center gap-xs border-b border-rule-2 px-2xl py-md active:bg-muted"
    >
      <View className="flex-row items-baseline gap-lg">
        <Text className="flex-1 text-body text-text" numberOfLines={1}>
          {name}
        </Text>
        <Text className="font-mono text-metricSm text-text">
          {measure(record.value)}
        </Text>
      </View>
      <Text className="font-mono text-metricXs text-text-4">
        {`up from ${measure(record.previous)} · ${formatShortDate(
          record.performedAt,
        )}`}
      </Text>
    </Pressable>
  );
}
