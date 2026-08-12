import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { FormActions } from '@/components/ui/form-actions';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { SectionLabel } from '@/components/ui/section-label';
import { Tag } from '@/components/ui/tag';
import { Text } from '@/components/ui/text';
import { deleteSession, renameSession, setSessionNotes } from '@/db/mutations/sessions';
import {
  allLiveExercises,
  allMetrics,
  indexExercisesById,
  indexMetricsById,
  indexMetricsByExercise,
  type ExerciseMetric,
} from '@/db/queries/exercises';
import { valuesForSession } from '@/db/queries/history';
import {
  entriesForSession,
  indexSetsByEntry,
  indexValuesBySet,
  sessionById,
  setsForSession,
  type ExerciseEntry,
  type LoggedSet,
  type Session,
  type SetMetricValue,
} from '@/db/queries/sessions';
import {
  formatDuration,
  formatSessionDate,
  formatSetNote,
  formatSetValues,
  formatTarget,
  formatTimeRange,
} from '@/lib/format';
import { sessionLengthMs } from '@/lib/history';
import { useDraftExit } from '@/lib/use-draft-exit';

/**
 * One completed session, read back (FEATURES.md §9).
 *
 * **A separate screen from `app/session/[id].tsx`, which is a working
 * surface.** That one carries `2 / 4` counters and makes you open an exercise
 * to see anything, and DESIGN.md §10 rule 4 says it carries the least chrome of
 * any screen. §9 wants the opposite here — every set visible at once, with
 * dates, a duration and notes — so loading those onto the session screen would
 * break the one rule written about it.
 *
 * Correcting a set is a tap through to `app/entry/[id].tsx`, where §7.3's
 * inline edit and delete already work "during and after a session". This screen
 * adds no editing machinery of its own.
 */
export default function HistorySessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: found, updatedAt } = useLiveQuery(sessionById(id), [id]);
  const session = found.at(0);
  const settled = updatedAt !== undefined;

  return (
    <Screen bleed>
      <ScrollView
        contentContainerClassName="pb-3xl"
        keyboardShouldPersistTaps="handled"
      >
        {!session ? (
          <>
            <BackButton />
            {settled ? (
              <Text className="px-2xl pt-2xl text-body text-text-2">
                This session is no longer here.
              </Text>
            ) : null}
          </>
        ) : (
          /* Keyed so the name and note initialise from the row once. The query
             is live, and a draft re-filled from props would be overwritten
             mid-edit. */
          <Detail key={session.id} session={session} />
        )}
      </ScrollView>
    </Screen>
  );
}

function Detail({ session }: { session: Session }) {
  const { data: entries } = useLiveQuery(entriesForSession(session.id), [
    session.id,
  ]);
  const { data: setRows } = useLiveQuery(setsForSession(session.id), [
    session.id,
  ]);
  const { data: valueRows } = useLiveQuery(valuesForSession(session.id), [
    session.id,
  ]);
  const { data: exercises } = useLiveQuery(allLiveExercises());
  const { data: metrics } = useLiveQuery(allMetrics());

  const setsByEntry = useMemo(() => indexSetsByEntry(setRows), [setRows]);
  const valuesBySet = useMemo(() => indexValuesBySet(valueRows), [valueRows]);
  const exercisesById = useMemo(
    () => indexExercisesById(exercises),
    [exercises],
  );
  const metricsByExercise = useMemo(
    () => indexMetricsByExercise(metrics),
    [metrics],
  );
  // The target names a metric by id, which may be one the exercise has since
  // dropped — so it is looked up across every metric rather than within the
  // exercise's current ones. A snapshot that cannot be rendered would silently
  // become `No target`, which is a different claim about the day.
  const metricsById = useMemo(() => indexMetricsById(metrics), [metrics]);

  const [name, setName] = useState(session.name ?? '');
  const [note, setNote] = useState(session.notes ?? '');

  const storedName = session.name ?? '';
  const storedNote = session.notes ?? '';

  const dirty = name !== storedName || note !== storedNote;

  const discard = () => {
    setName(storedName);
    setNote(storedNote);
  };

  const save = async () => {
    const trimmedName = name.trim();

    // A quick log never had a name and does not gain one by being opened; an
    // emptied name would otherwise turn a session into something untitled.
    if (trimmedName.length > 0 && trimmedName !== storedName) {
      await renameSession(session.id, trimmedName);
    }

    const trimmedNote = note.trim();
    if (trimmedNote !== storedNote) {
      await setSessionNotes(session.id, trimmedNote || null);
    }
  };

  const { requestExit, saveAndLeave } = useDraftExit({
    dirty,
    onSave: save,
    onDiscard: discard,
  });

  const confirmDelete = () => {
    Alert.alert(
      'Delete this session?',
      'Everything logged in it goes with it. The exercises stay, along with everything logged in other sessions.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void deleteSession(session.id).then(() => router.back()),
        },
      ],
    );
  };

  const firstExercise = exercisesById.get(entries.at(0)?.exerciseId ?? '')?.name;

  return (
    <>
      <BackButton onPress={requestExit} />

      {/* The name is the identity of the session; the date moved down into the
          metadata line beside it. A quick log has no name of its own (§6.1), so
          it borrows its exercise's — the only thing it was ever about. */}
      <View className="flex-row items-baseline gap-md px-2xl pt-sm">
        <Text className="flex-1 font-sans-semibold text-display text-text">
          {session.name ?? firstExercise ?? 'Session'}
        </Text>
        {session.isQuickLog ? <Tag quiet>One-off</Tag> : null}
      </View>

      <Text className="px-2xl pt-xs font-mono text-metricXs text-text-3">
        {metaLine(session)}
      </Text>

      {/* Not offered to a quick log: naming one would make it look like a
          session that was planned. */}
      {session.isQuickLog ? null : (
        <View className="gap-xs px-2xl pt-xl">
          <SectionLabel>Name</SectionLabel>
          <Input
            value={name}
            onChangeText={setName}
            accessibilityLabel="Session name"
            autoCapitalize="words"
          />
        </View>
      )}

      <View className="pt-xl">
        {entries.length === 0 ? (
          <Text className="px-2xl text-bodySm text-text-2">
            Nothing was logged in this session.
          </Text>
        ) : (
          entries.map((entry) => (
            <EntrySummary
              key={entry.id}
              entry={entry}
              name={exercisesById.get(entry.exerciseId)?.name ?? 'Exercise'}
              metrics={metricsByExercise.get(entry.exerciseId) ?? []}
              targetMetric={
                entry.targetMetricId
                  ? metricsById.get(entry.targetMetricId)
                  : undefined
              }
              performed={setsByEntry.get(entry.id) ?? []}
              valuesBySet={valuesBySet}
            />
          ))
        )}
      </View>

      <View className="gap-xs px-2xl pt-xl">
        <SectionLabel>How it went</SectionLabel>
        <Input
          value={note}
          onChangeText={setNote}
          accessibilityLabel="Note for this session"
          placeholder="How the session went"
          multiline
          className="h-auto min-h-field py-md"
        />
      </View>

      {dirty ? (
        <View className="px-2xl pt-lg">
          <FormActions dirty={dirty} onDiscard={discard} onSave={saveAndLeave} />
        </View>
      ) : null}

      {/*
        The hint sits beside Delete rather than above the list, because the
        instruction is only worth reading once and the foot of the screen is
        where you arrive having already scrolled the sets.
      */}
      <View className="flex-row items-center justify-between gap-md px-2xl pt-2xl">
        <Text className="flex-1 text-caption text-text-4">
          Tap any set to correct it
        </Text>
        <Button variant="danger" onPress={confirmDelete}>
          <Text>Delete</Text>
        </Button>
      </View>
    </>
  );
}

/**
 * `14 Aug · 18:42–19:30 · 48 min` — three facts about when, in one line.
 *
 * The range is what distinguishes two sessions on the same day, which neither
 * the date nor the duration does. A quick log gets neither: its start and end
 * are the same instant, so a length would read as a very short session rather
 * than as something that was never one (§9).
 */
function metaLine(session: Session): string {
  const date = formatSessionDate(session.completedAt ?? session.startedAt);

  if (session.isQuickLog) {
    return date;
  }

  const range = formatTimeRange(session.startedAt, session.completedAt);
  const length = sessionLengthMs(session);

  return [date, range, length === null ? 'Unfinished' : formatDuration(length)]
    .filter(Boolean)
    .join(' · ');
}

/**
 * One exercise and everything logged against it, every set on show.
 *
 * **Unrecorded values name the metric that went unrecorded**, rather than
 * dropping it or printing a bare dash. That is exit criterion 1: a session has
 * to read back exactly as logged, and a metric silently omitted makes `10 reps`
 * indistinguishable from `10 reps` beside a hold nobody recorded. The session
 * screen omits them instead, because mid-set the priority is scanning.
 *
 * **`target that day`, not `target`.** The figure comes from the snapshot on
 * the entry, not from the template slot, so editing a plan can never rewrite
 * what a finished session says it was aiming at (invariant 5). Wording it this
 * way is what makes that visible rather than merely true.
 */
function EntrySummary({
  entry,
  name,
  metrics,
  targetMetric,
  performed,
  valuesBySet,
}: {
  entry: ExerciseEntry;
  name: string;
  metrics: ExerciseMetric[];
  targetMetric: ExerciseMetric | undefined;
  performed: LoggedSet[];
  valuesBySet: Map<string, SetMetricValue[]>;
}) {
  const trained = performed.length > 0;
  const target = formatTarget(entry, targetMetric);
  const hasTarget = entry.targetSets !== null || entry.targetValue !== null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${performed.length} sets`}
      onPress={() =>
        router.push({ pathname: '/entry/[id]', params: { id: entry.id } })
      }
      className="px-2xl pb-lg pt-md active:bg-muted"
    >
      <View className="flex-row items-baseline gap-md pb-sm">
        {/* An untrained exercise recedes rather than disappearing — it is part
            of what the day was, and §6.5 says it reads as not trained and never
            as zeros. */}
        <Text
          className={
            trained
              ? 'flex-1 font-sans-semibold text-heading text-text'
              : 'flex-1 font-sans-semibold text-heading text-text-4'
          }
        >
          {name}
        </Text>
        {trained && !hasTarget ? null : (
          <Text className="text-bodySm text-text-3">
            {trained
              ? `target that day · ${target}`
              : hasTarget
                ? `Not trained · planned ${target}`
                : 'Not trained'}
          </Text>
        )}
      </View>

      {performed.map((set) => (
        <SetLine
          key={set.id}
          set={set}
          index={set.setIndex + 1}
          metrics={metrics}
          values={valuesBySet.get(set.id) ?? []}
        />
      ))}

      {entry.notes ? (
        <Text className="pt-sm text-bodySm text-text-2">{entry.notes}</Text>
      ) : null}
    </Pressable>
  );
}

/**
 * One set: its number, what it measured, and anything written about it.
 *
 * The index sits in a fixed column so the figures beside it align down a common
 * edge however many digits the numbers carry — the same reason DESIGN.md §6.7
 * fixes the width of a label column.
 *
 * Two maps over the same rows: figures live in `value_num` and a note in
 * `value_text`. A note joined onto the value line reads as one more
 * measurement rather than as prose, which is the bug Phase 8a found.
 */
function SetLine({
  set,
  index,
  metrics,
  values,
}: {
  set: LoggedSet;
  index: number;
  metrics: ExerciseMetric[];
  values: SetMetricValue[];
}) {
  const note = formatSetNote(
    metrics,
    new Map(values.map((value) => [value.exerciseMetricId, value.valueText])),
  );

  return (
    <View className="flex-row gap-md border-b border-rule-2 py-sm">
      <Text className="w-2xl font-mono text-metricXs text-text-5">{index}</Text>

      <View className="flex-1 gap-xs">
        <View className="flex-row flex-wrap items-center gap-sm">
          <Text className="font-mono text-metricSm text-text">
            {formatSetValues(
              metrics,
              new Map(
                values.map((value) => [value.exerciseMetricId, value.valueNum]),
              ),
              { missing: 'name' },
            )}
          </Text>
          {set.toFailure ? <Tag>To failure</Tag> : null}
        </View>

        {note ? (
          <Text className="text-bodySm text-text-2">{note}</Text>
        ) : null}
      </View>
    </View>
  );
}
