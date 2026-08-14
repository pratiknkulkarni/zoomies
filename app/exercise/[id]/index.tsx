import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Alert, FlatList, Pressable, View } from 'react-native';

import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { SectionLabel } from '@/components/ui/section-label';
import { Tag } from '@/components/ui/tag';
import { Text } from '@/components/ui/text';
import {
  archiveExercise,
  deleteExercise,
  unarchiveExercise,
} from '@/db/mutations/exercises';
import {
  exerciseById,
  metricsForExercise,
  type ExerciseMetric,
} from '@/db/queries/exercises';
import {
  sessionsForExercise,
  setsForExercise,
  valuesForExercise,
} from '@/db/queries/records';
import type { Session } from '@/db/queries/sessions';
import { BestSetTrend } from '@/features/exercises/best-set-trend';
import {
  formatMeasure,
  formatRecordsWhat,
  formatSessionDate,
  formatSetNote,
  formatSetSeries,
  formatVolume,
} from '@/lib/format';
import {
  groupSetsBySession,
  personalRecords,
  type PersonalRecord,
} from '@/lib/records';

type LoggedSet = {
  id: string;
  sessionId: string;
  setIndex: number;
  toFailure: boolean;
  performedAt: number;
};

/** One session's worth of this exercise, collapsed to the lines it renders. */
type SessionRun = {
  session: Session | undefined;
  sets: LoggedSet[];
};

/**
 * One exercise across its whole life (FEATURES.md §10) — what it records, what
 * it has recorded, and the best of it.
 *
 * Unlike the session screen this spans **all** templates and includes quick
 * logs, which is the payoff for making Exercise permanent rather than a line in
 * a template.
 *
 * **A session is one row, not one row per set.** Sixty-three sets over eighteen
 * sessions is a screen you scroll for a while and learn nothing from; the same
 * data as `10 · 9 · 9 · 7` per session is where the movement is going, visible
 * at once. Tapping a row opens the session, where every set is separate and
 * correctable (§7.3).
 *
 * The best-set trend §10 asks for sits between the two: one dot per session,
 * drawn by hand from `View`s, and the last thing the application built (§10.2).
 */
export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  // `[id]` as deps: `useLiveQuery` defaults to running its effect once, so
  // without this the screen would keep showing the first exercise it loaded.
  const { data: found, updatedAt } = useLiveQuery(exerciseById(id), [id]);
  const { data: metrics } = useLiveQuery(metricsForExercise(id), [id]);

  const { data: sessionRows } = useLiveQuery(sessionsForExercise(id), [id]);
  const { data: setRows } = useLiveQuery(setsForExercise(id), [id]);
  const { data: valueRows } = useLiveQuery(valuesForExercise(id), [id]);

  const exercise = found.at(0);

  // `data` starts as an empty array, so "no rows" and "not read yet" look
  // identical. `updatedAt` is undefined until the first result lands, and
  // without checking it the screen claims the exercise is gone for the frame
  // before its own query answers.
  const settled = updatedAt !== undefined;

  /**
   * Records rank against the exercise's **current** metrics. A metric that was
   * removed keeps its historical values in `set_metric_values` — that is the
   * whole point of the table — but it no longer has a record, because the
   * exercise no longer claims to measure that thing.
   */
  const records = useMemo(
    () => personalRecords(setRows, valueRows, metrics),
    [setRows, valueRows, metrics],
  );

  const valuesBySet = useMemo(() => {
    const bySet = new Map<string, Map<string, number | null>>();

    for (const value of valueRows) {
      const existing = bySet.get(value.setId);

      if (existing) {
        existing.set(value.exerciseMetricId, value.valueNum);
      } else {
        bySet.set(
          value.setId,
          new Map([[value.exerciseMetricId, value.valueNum]]),
        );
      }
    }

    return bySet;
  }, [valueRows]);

  /**
   * Notes, kept apart from the figures because they are stored apart —
   * `value_text` against `value_num`. Folded here rather than inside the row so
   * both maps are built in one pass.
   */
  const notesBySet = useMemo(() => {
    const bySet = new Map<string, Map<string, string | null>>();

    for (const value of valueRows) {
      const existing = bySet.get(value.setId);

      if (existing) {
        existing.set(value.exerciseMetricId, value.valueText);
      } else {
        bySet.set(
          value.setId,
          new Map([[value.exerciseMetricId, value.valueText]]),
        );
      }
    }

    return bySet;
  }, [valueRows]);

  const sessionsById = useMemo(
    () => new Map(sessionRows.map((row) => [row.session.id, row.session])),
    [sessionRows],
  );

  const runs: SessionRun[] = useMemo(
    () =>
      groupSetsBySession(setRows).map((group) => ({
        session: sessionsById.get(group.sessionId),
        sets: group.sets,
      })),
    [sessionsById, setRows],
  );

  /**
   * Archiving asks first, because Delete beside it does and the two used to
   * disagree — one of them confirmed and the other silently changed the library
   * with no acknowledgement at all.
   *
   * Unarchiving asks too. It is not destructive, but a control that sometimes
   * confirms and sometimes does not is a control you have to remember.
   */
  const confirmArchive = (subject: NonNullable<typeof exercise>) => {
    const archived = subject.isArchived;

    Alert.alert(
      archived ? `Unarchive ${subject.name}?` : `Archive ${subject.name}?`,
      archived
        ? 'It returns to your library and to the exercise pickers.'
        : 'It leaves your library and the pickers. Everything logged against it is kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: archived ? 'Unarchive' : 'Archive',
          onPress: () =>
            void (archived
              ? unarchiveExercise(subject.id)
              : archiveExercise(subject.id)),
        },
      ],
    );
  };

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

  if (!exercise) {
    return (
      <Screen bleed>
        <BackButton />
        {settled ? (
          <Text className="px-2xl pt-2xl text-body text-text-2">
            This exercise is no longer here.
          </Text>
        ) : null}
      </Screen>
    );
  }

  const subtitle = [
    exercise.family,
    formatRecordsWhat(metrics),
    formatVolume(setRows.length, runs.length),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Screen bleed>
      <FlatList
        data={runs}
        keyExtractor={(run) => run.sets[0]?.id ?? 'empty'}
        ListHeaderComponent={
          <>
            <BackButton />

            <View className="flex-row items-baseline gap-md px-2xl pt-sm">
              <Text className="flex-1 font-sans-semibold text-display text-text">
                {exercise.name}
              </Text>
              {exercise.isArchived ? <Tag quiet>Archived</Tag> : null}
            </View>

            {/* What it is and how much of it there is, in one line — the
                document folds the metric list in here, and metric order is
                still meaningful: the first named is the one logged first. */}
            {subtitle ? (
              <Text className="px-2xl pt-xs text-bodySm text-text-3">
                {subtitle}
              </Text>
            ) : null}

            {exercise.notes ? (
              <Text className="px-2xl pt-md text-bodySm text-text-2">
                {exercise.notes}
              </Text>
            ) : null}

            <Bests
              records={records}
              metrics={metrics}
              runs={runs}
              trained={setRows.length > 0}
            />

            {/* Between the standing figures and the list they came from: the
                pair above is what the best is, this is how it got there, and
                `Every set` below is the rows both are folded from. */}
            <BestSetTrend sets={setRows} values={valueRows} metrics={metrics} />

            {runs.length > 0 ? (
              <SectionLabel className="px-2xl pb-sm pt-xl">
                Every set
              </SectionLabel>
            ) : null}
          </>
        }
        renderItem={({ item }) => (
          <SessionRunRow
            run={item}
            metrics={metrics}
            valuesBySet={valuesBySet}
            notesBySet={notesBySet}
          />
        )}
        ListEmptyComponent={
          <View className="px-2xl pt-xl">
            <EmptyState
              title="Nothing logged yet"
              body="Your sets appear here as you do them, in a session or a quick log."
            />
          </View>
        }
        /*
          The bottom padding rides on the footer rather than a
          `contentContainerClassName`, which nothing else in the app uses on a
          virtualized list — every other use is a `ScrollView`.
        */
        ListFooterComponent={
          <View className="gap-md px-2xl pb-3xl pt-xl">
            <Button
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: '/exercise/[id]/edit',
                  params: { id: exercise.id },
                })
              }
            >
              <Text>Edit exercise</Text>
            </Button>
            <Button variant="secondary" onPress={() => confirmArchive(exercise)}>
              <Text>{exercise.isArchived ? 'Unarchive' : 'Archive'}</Text>
            </Button>
            <Button variant="danger" onPress={confirmDelete}>
              <Text>Delete</Text>
            </Button>
          </View>
        }
      />
    </Screen>
  );
}

/**
 * The two figures worth reading first: the best of each thing this measures,
 * and — where only one thing ranks — when it was last trained.
 *
 * **Stated, not congratulated.** No exclamation, no change arrow, no colour.
 * DESIGN.md §10.5 cuts celebration, and §3.2 leaves nothing to spend on it.
 *
 * Present even before anything is logged, reading `—` with the reason beneath.
 * Hiding them until data exists would leave a new exercise saying nothing about
 * what it is going to measure; a dash says what this screen is for and admits
 * it cannot fill it yet (invariant 2).
 */
function Bests({
  records,
  metrics,
  runs,
  trained,
}: {
  records: Map<string, PersonalRecord>;
  metrics: ExerciseMetric[];
  runs: SessionRun[];
  trained: boolean;
}) {
  const held = metrics.flatMap((metric) => {
    const record = records.get(metric.id);
    return record ? [{ metric, record }] : [];
  });

  const last = runs.at(0)?.session;

  const stats = held.map(({ metric, record }) => ({
    key: metric.id,
    label: `Best ${metric.name.toLowerCase()}`,
    value: formatMeasure(record.value, metric, { bare: true }),
    detail: [
      formatSessionDate(record.performedAt),
      sessionName(runs, record.sessionId),
    ]
      .filter(Boolean)
      .join(' · '),
  }));

  // With one thing ranked there is room for the other question this screen is
  // asked — when did I last do this. With two records there is not, and the
  // top row of `Every set` answers it anyway.
  if (stats.length < 2) {
    stats.push({
      key: 'last',
      label: 'Last trained',
      value: last
        ? formatSessionDate(last.completedAt ?? last.startedAt)
        : '—',
      detail: last
        ? (last.isQuickLog ? 'One-off' : (last.name ?? 'No plan'))
        : 'never',
    });
  }

  // Nothing ranked. Either nothing is logged, or everything this exercise
  // measures is text — §10.1 gives `notes` no ordering, so the longest note is
  // not an achievement.
  if (stats.length === 1) {
    stats.unshift({
      key: 'none',
      label: 'Best',
      value: '—',
      detail: trained ? 'nothing here ranks' : 'no sets recorded',
    });
  }

  return (
    <View className="flex-row gap-xl px-2xl pt-xl">
      {stats.slice(0, 2).map((stat) => (
        <View key={stat.key} className="flex-1 gap-xs">
          <SectionLabel>{stat.label}</SectionLabel>
          <Text
            className={
              stat.value === '—'
                ? 'font-mono text-metric text-text-5'
                : 'font-mono-semibold text-metric text-text'
            }
          >
            {stat.value}
          </Text>
          <Text className="text-caption text-text-3">{stat.detail}</Text>
        </View>
      ))}
    </View>
  );
}

function sessionName(runs: SessionRun[], sessionId: string): string {
  const session = runs.find((run) => run.session?.id === sessionId)?.session;

  if (!session) {
    return '';
  }

  return session.isQuickLog ? 'one-off' : (session.name ?? 'no plan');
}

/**
 * One session's worth of this exercise, on one line where it can be.
 *
 * The primary metric leads, because it is the one the exercise is logged by
 * (§4.1) and the one a reader is scanning down. Anything else it measures gets
 * its own line beneath, named — three unlabelled series stacked would need
 * decoding against the header every time.
 *
 * Tapping opens the session rather than the set, because §7.3's correction is
 * one step further in and landing in the session first is what tells you which
 * session you are about to change.
 */
function SessionRunRow({
  run,
  metrics,
  valuesBySet,
  notesBySet,
}: {
  run: SessionRun;
  metrics: ExerciseMetric[];
  valuesBySet: Map<string, Map<string, number | null>>;
  notesBySet: Map<string, Map<string, string | null>>;
}) {
  const { session, sets } = run;

  const measured = metrics.filter((metric) => metric.type !== 'notes');
  const primary = measured.at(0);
  const series = (metric: ExerciseMetric) =>
    formatSetSeries(
      sets.map((set) => valuesBySet.get(set.id)?.get(metric.id) ?? null),
      metric,
    );

  const notes = sets
    .map((set) => formatSetNote(metrics, notesBySet.get(set.id) ?? new Map()))
    .filter((note): note is string => note !== null);

  const when = session
    ? formatSessionDate(session.completedAt ?? session.startedAt)
    : '';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${when}, ${sets.length} sets`}
      disabled={!session}
      onPress={() =>
        session &&
        router.push({ pathname: '/history/[id]', params: { id: session.id } })
      }
      className="min-h-touch justify-center gap-xs border-b border-rule-2 px-2xl py-md active:bg-muted"
    >
      <View className="flex-row items-baseline gap-lg">
        <Text className="flex-1 font-mono text-metricXs text-text">
          {primary ? series(primary) : 'Recorded'}
        </Text>

        <View className="flex-row items-center gap-sm">
          {session?.isQuickLog ? <Tag quiet>One-off</Tag> : null}
          <Text className="font-mono text-metricXs text-text-3">
            {session?.isQuickLog || !session?.name
              ? when
              : `${when} · ${session.name}`}
          </Text>
        </View>
      </View>

      {measured.slice(1).map((metric) => (
        <Text key={metric.id} className="font-mono text-metricXs text-text-3">
          {metric.name.toLowerCase()} {series(metric)}
        </Text>
      ))}

      {notes.length > 0 ? (
        <Text className="text-bodySm text-text-2">{notes.join(' · ')}</Text>
      ) : null}
    </Pressable>
  );
}
