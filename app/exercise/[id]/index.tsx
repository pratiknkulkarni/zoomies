import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, SectionList, View } from 'react-native';

import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
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
import {
  formatMeasure,
  formatMetricDetail,
  formatSessionDate,
  formatSetNote,
  formatSetValues,
} from '@/lib/format';
import {
  groupSetsBySession,
  personalRecords,
  recordSetIds,
  type PersonalRecord,
} from '@/lib/records';

type LoggedSet = {
  id: string;
  sessionId: string;
  setIndex: number;
  toFailure: boolean;
  performedAt: number;
};

type SessionSection = {
  session: Session | undefined;
  data: LoggedSet[];
};

/**
 * One exercise across its whole life (FEATURES.md §10) — what it records, what
 * it has recorded, and the best of it.
 *
 * Unlike the session screen this spans **all** templates and includes quick
 * logs, which is the payoff for making Exercise permanent rather than a line in
 * a template.
 *
 * A `SectionList` rather than the `ScrollView` this screen used to be: the set
 * list is unbounded — an exercise trained twice a week for a year is several
 * hundred rows — and everything above it rides along as the list header.
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

  const marked = useMemo(() => recordSetIds(records), [records]);

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
   * `value_text` against `value_num`. Folded here rather than inside `SetLine`
   * so both maps are built in one pass over the rows.
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

  const sections: SessionSection[] = useMemo(() => {
    const sessionsById = new Map(
      sessionRows.map((row) => [row.session.id, row.session]),
    );

    return groupSetsBySession(setRows).map((group) => ({
      session: sessionsById.get(group.sessionId),
      data: group.sets,
    }));
  }, [sessionRows, setRows]);

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
          <Text className="px-xl pt-xl text-body text-text-2">
            This exercise is no longer here.
          </Text>
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen bleed>
      <SectionList
        sections={sections}
        keyExtractor={(set) => set.id}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <>
            <BackButton />

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

            <Records records={records} metrics={metrics} />

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

            {sections.length > 0 ? (
              <SectionLabel className="px-xl pb-sm pt-2xl">History</SectionLabel>
            ) : null}
          </>
        }
        renderSectionHeader={({ section }) => (
          <SessionHeader session={section.session} />
        )}
        renderItem={({ item }) => (
          <SetLine
            set={item}
            metrics={metrics}
            values={valuesBySet.get(item.id)}
            notes={notesBySet.get(item.id)}
            isRecord={marked.has(item.id)}
          />
        )}
        ListEmptyComponent={
          <View className="px-xl pt-2xl">
            <EmptyState
              title="Nothing logged yet"
              body="Sets appear here once you train this, in a session or a quick log."
            />
          </View>
        }
        /*
          The bottom padding rides on the footer rather than a
          `contentContainerClassName`, which nothing else in the app uses on a
          virtualized list — every other use is a `ScrollView`.
        */
        ListFooterComponent={
          <View className="gap-md px-xl pb-3xl pt-2xl">
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
 * Personal records, one line per metric (§11.5 — a duration record and a rep
 * record are separate things and never combine).
 *
 * **Stated, not congratulated.** No accent here, no exclamation and no change
 * arrow: this is a fact about the exercise sitting between what it is and what
 * it has done. DESIGN.md §10.5 cuts celebration, and §3.3 spends the accent on
 * marking the set in the list below instead.
 *
 * Absent entirely until something ranks. A `Records` heading over `—` says
 * nothing that the empty history two sections down does not already say.
 */
function Records({
  records,
  metrics,
}: {
  records: Map<string, PersonalRecord>;
  metrics: ExerciseMetric[];
}) {
  const held = metrics.flatMap((metric) => {
    const record = records.get(metric.id);
    return record ? [{ metric, record }] : [];
  });

  if (held.length === 0) {
    return null;
  }

  return (
    <>
      <SectionLabel className="px-xl pb-sm pt-2xl">Records</SectionLabel>

      <View className="gap-md px-xl">
        {held.map(({ metric, record }) => (
          <View key={metric.id} className="flex-row items-baseline gap-md">
            <Text className="w-label text-caption text-text-3">
              {metric.name}
            </Text>
            {/* Bare: the column to the left is already the metric's name. */}
            <Text className="flex-1 font-mono text-metricSm text-text">
              {formatMeasure(record.value, metric, { bare: true })}
            </Text>
            <Text className="text-caption text-text-3">
              {formatSessionDate(record.performedAt)}
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}

/**
 * The session a run of sets belongs to, and a way into it.
 *
 * Tapping through goes to the session rather than straight to the set, because
 * §7.3's correction lives on the entry screen one step further in — and landing
 * in the session first is what tells you which session you are about to change.
 *
 * A quick log says so where a session gives its name: it was never planned
 * (§6.1), and a row reading `Pull-Up` under a list of pull-ups would be saying
 * nothing.
 */
function SessionHeader({ session }: { session: Session | undefined }) {
  if (!session) {
    return null;
  }

  const when = formatSessionDate(session.completedAt ?? session.startedAt);
  const what = session.isQuickLog ? 'Quick log' : session.name;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${what ?? 'Session'}, ${when}`}
      onPress={() =>
        router.push({ pathname: '/history/[id]', params: { id: session.id } })
      }
      className="flex-row items-baseline gap-md px-xl pb-xs pt-lg active:bg-muted"
    >
      <SectionLabel>{when}</SectionLabel>
      {what ? <Text className="text-caption text-text-3">{what}</Text> : null}
    </Pressable>
  );
}

/**
 * One set as it was logged.
 *
 * `—` for a metric that went unrecorded, the same as the history detail screen:
 * dropping it would make `10 reps` indistinguishable from `10 reps` beside a
 * note nobody wrote (invariant 2).
 *
 * The record marker is one of the three places DESIGN.md §3.3 allows the accent
 * at all. It is a word rather than a fill or a glyph — the rule permits one
 * accent-filled element on screen and this list can hold several marks, one per
 * metric.
 */
function SetLine({
  set,
  metrics,
  values,
  notes,
  isRecord,
}: {
  set: LoggedSet;
  metrics: ExerciseMetric[];
  values: Map<string, number | null> | undefined;
  notes: Map<string, string | null> | undefined;
  isRecord: boolean;
}) {
  const note = formatSetNote(metrics, notes ?? new Map());

  return (
    <View className="gap-xs px-xl py-xs">
      <View className="flex-row items-baseline gap-md">
        <Text className="flex-1 text-bodySm text-text-2">
          {formatSetValues(metrics, values ?? new Map(), { missing: 'name' })}
          {set.toFailure ? '  to failure' : ''}
        </Text>
        {isRecord ? (
          <Text className="text-caption text-accent">Record</Text>
        ) : null}
      </View>

      {/* Its own line: a note is prose, and joined onto the figures it reads as
          one more measurement. */}
      {note ? (
        <Text className="text-caption text-text-3">{note}</Text>
      ) : null}
    </View>
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
