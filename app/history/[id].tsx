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
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { deleteSession, renameSession, setSessionNotes } from '@/db/mutations/sessions';
import {
  allLiveExercises,
  allMetrics,
  indexExercisesById,
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
 * inline edit and delete already work "during and after a session". This phase
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

  const length = sessionLengthMs(session);

  return (
    <>
      <BackButton onPress={requestExit} />

      <Text className="px-2xl pt-sm font-sans-semibold text-display text-text">
        {formatSessionDate(session.completedAt ?? session.startedAt)}
      </Text>
      <Text className="px-2xl pt-xs text-bodySm text-text-2">
        {session.isQuickLog
          ? 'Quick log'
          : length === null
            ? 'Unfinished'
            : formatDuration(length)}
      </Text>

      {/* A quick log has no name of its own (§6.1), so it is not offered one —
          naming it would make it look like a session that was planned. */}
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

      <SectionLabel className="px-2xl pb-sm pt-xl">Logged</SectionLabel>

      {entries.length === 0 ? (
        <Text className="px-2xl text-bodySm text-text-2">
          Nothing was logged in this session.
        </Text>
      ) : (
        entries.map((entry, index) => (
          <View key={entry.id}>
            {index > 0 ? <Separator /> : null}
            <EntrySummary
              entry={entry}
              name={exercisesById.get(entry.exerciseId)?.name ?? 'Exercise'}
              metrics={metricsByExercise.get(entry.exerciseId) ?? []}
              performed={setsByEntry.get(entry.id) ?? []}
              valuesBySet={valuesBySet}
            />
          </View>
        ))
      )}

      <View className="gap-xs px-2xl pt-xl">
        <SectionLabel>Note</SectionLabel>
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
          <FormActions
            dirty={dirty}
            onDiscard={discard}
            onSave={saveAndLeave}
          />
        </View>
      ) : null}

      <View className="px-2xl pt-xl">
        <Button variant="danger" onPress={confirmDelete}>
          <Text>Delete session</Text>
        </Button>
      </View>
    </>
  );
}

/**
 * One exercise and everything logged against it, every set on show.
 *
 * **Unrecorded values read as `—`, not as nothing.** That is exit criterion 1:
 * a session has to read back exactly as logged, and a metric silently dropped
 * makes `10 reps` indistinguishable from `10 reps` beside a note that was never
 * written. The session screen omits them instead, because mid-set the priority
 * is scanning rather than fidelity.
 *
 * The whole row is a tap through to the entry screen, where a mislogged set can
 * be corrected (§7.3).
 */
function EntrySummary({
  entry,
  name,
  metrics,
  performed,
  valuesBySet,
}: {
  entry: ExerciseEntry;
  name: string;
  metrics: ExerciseMetric[];
  performed: LoggedSet[];
  valuesBySet: Map<string, SetMetricValue[]>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${performed.length} sets`}
      onPress={() =>
        router.push({ pathname: '/entry/[id]', params: { id: entry.id } })
      }
      className="gap-xs px-2xl py-md active:bg-muted"
    >
      <View className="flex-row items-center gap-md">
        <Text className="flex-1 font-sans-semibold text-heading text-text">
          {name}
        </Text>
        <Text className="font-mono text-metricSm text-text-2">
          {performed.length === 1 ? '1 set' : `${performed.length} sets`}
        </Text>
      </View>

      {/* §6.5 — an exercise with no sets reads as not trained, never as zeros. */}
      {performed.length === 0 ? (
        <Text className="text-bodySm text-text-3">Not trained</Text>
      ) : (
        performed.map((set) => {
          const values = valuesBySet.get(set.id) ?? [];

          /* Two maps over the same rows: the figures live in `value_num` and a
             note in `value_text`, and a note joined onto the value line reads
             as one more measurement rather than as prose. */
          const note = formatSetNote(
            metrics,
            new Map(
              values.map((value) => [value.exerciseMetricId, value.valueText]),
            ),
          );

          return (
            <View key={set.id} className="gap-xs">
              <Text className="text-bodySm text-text-2">
                {formatSetValues(
                  metrics,
                  new Map(
                    values.map((value) => [
                      value.exerciseMetricId,
                      value.valueNum,
                    ]),
                  ),
                  { missing: 'name' },
                )}
                {set.toFailure ? '  to failure' : ''}
              </Text>
              {note ? (
                <Text className="text-caption text-text-3">{note}</Text>
              ) : null}
            </View>
          );
        })
      )}

      {entry.notes ? (
        <Text className="pt-xs text-caption text-text-3">{entry.notes}</Text>
      ) : null}
    </Pressable>
  );
}
