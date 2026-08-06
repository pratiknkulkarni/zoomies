import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { BackButton } from '@/components/ui/back-button';
import { Screen } from '@/components/ui/screen';
import { SectionLabel } from '@/components/ui/section-label';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { exerciseById, metricsForExercise } from '@/db/queries/exercises';
import {
  entryById,
  indexValuesBySet,
  lastTimeFor,
  sessionById,
  setsForEntry,
  valuesForEntry,
  type LastTime,
} from '@/db/queries/sessions';
import { EntryNotes, TargetRow } from '@/features/session/entry-extras';
import { SetLog } from '@/features/session/set-log';
import { SetRow } from '@/features/session/set-row';
import { formatLastTime, formatSetCount } from '@/lib/format';

/**
 * Logging one exercise (FEATURES.md §7.2).
 *
 * ```
 * Chin-Up                              2 / 3
 *   Target      3 × 9 reps
 *   Last time   8 · 8 · 7 · 6
 * ```
 *
 * Target in normal weight, last time greyed — it is context, not an
 * instruction. Both come from the entry's own snapshot, so nothing here can be
 * changed by editing the template mid-session.
 */
export default function EntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  // §8.1 — the screen stays on while training. This is where hands are busy
  // and a screen timeout costs a set.
  useKeepAwake();

  const { data: found, updatedAt } = useLiveQuery(entryById(id), [id]);
  const entry = found.at(0);
  const settled = updatedAt !== undefined;

  return (
    <Screen bleed>
      <ScrollView
        contentContainerClassName="pb-3xl"
        keyboardShouldPersistTaps="handled"
      >
        <BackButton />

        {!entry ? (
          settled ? (
            <Text className="px-xl pt-xl text-body text-text-2">
              This exercise is no longer in the session.
            </Text>
          ) : null
        ) : (
          <Logging key={entry.id} entryId={entry.id} />
        )}
      </ScrollView>
    </Screen>
  );
}

function Logging({ entryId }: { entryId: string }) {
  const { data: found } = useLiveQuery(entryById(entryId), [entryId]);
  const entry = found.at(0);

  const exerciseId = entry?.exerciseId ?? '';
  const { data: exercise } = useLiveQuery(exerciseById(exerciseId), [
    exerciseId,
  ]);
  const { data: metrics } = useLiveQuery(metricsForExercise(exerciseId), [
    exerciseId,
  ]);
  const { data: performed } = useLiveQuery(setsForEntry(entryId), [entryId]);
  const { data: valueRows } = useLiveQuery(valuesForEntry(entryId), [entryId]);

  const sessionId = entry?.sessionId ?? '';
  const { data: sessionRows } = useLiveQuery(sessionById(sessionId), [
    sessionId,
  ]);

  const valuesBySet = useMemo(() => indexValuesBySet(valueRows), [valueRows]);

  const primary = metrics.at(0);
  const session = sessionRows.at(0);

  const [lastTime, setLastTime] = useState<LastTime | null>(null);

  /**
   * Read once rather than subscribed: history cannot change while a session is
   * running, and re-reading it on every set saved would churn this screen for
   * nothing. `cancelled` guards the unmount, since this resolves after an
   * await.
   */
  useEffect(() => {
    if (!primary || !session || !entry) {
      return;
    }

    let cancelled = false;

    void lastTimeFor(
      entry.exerciseId,
      primary.id,
      session.templateId,
      session.id,
    ).then((result) => {
      if (!cancelled) {
        setLastTime(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [entry, primary, session]);

  if (!entry) {
    return null;
  }

  return (
    <>
      <View className="flex-row items-start justify-between gap-md px-xl pt-sm">
        <Text className="flex-1 font-sans-semibold text-display text-text">
          {exercise.at(0)?.name ?? 'Exercise'}
        </Text>
        <Text className="pt-sm font-mono text-metricSm text-text-2">
          {formatSetCount(performed.length, entry.targetSets)}
        </Text>
      </View>

      <View className="gap-sm px-xl pt-xl">
        <TargetRow entry={entry} metrics={metrics} />
        <Row
          label="Last time"
          value={
            lastTime
              ? formatLastTime(lastTime.values) +
                // §7.2 — a fallback from another context is labelled rather
                // than silently compared against.
                (lastTime.fromElsewhere
                  ? `  (${lastTime.sessionName ?? 'elsewhere'})`
                  : '')
              : 'Not trained yet'
          }
          muted
        />
      </View>

      <View className="px-xl pt-2xl">
        {metrics.length === 0 ? (
          <Text className="text-bodySm text-text-2">
            This exercise records nothing yet. Add a metric to it first.
          </Text>
        ) : (
          <SetLog
            entryId={entry.id}
            metrics={metrics}
            setsUntilTarget={
              entry.targetSets === null
                ? null
                : entry.targetSets - performed.length
            }
          />
        )}
      </View>

      {performed.length > 0 ? (
        <View className="pt-2xl">
          <SectionLabel className="px-xl pb-sm">Logged</SectionLabel>
          {performed.map((set, index) => (
            <View key={set.id}>
              {index > 0 ? <Separator /> : null}
              <SetRow
                entryId={entry.id}
                set={set}
                metrics={metrics}
                values={valuesBySet.get(set.id) ?? []}
              />
            </View>
          ))}
        </View>
      ) : null}

      <EntryNotes key={entry.id} entry={entry} />
    </>
  );
}

/** DESIGN.md §6.6 — the label-and-value row. */
function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted: boolean;
}) {
  return (
    <View className="flex-row gap-md">
      <Text className="w-label text-caption text-text-3">{label}</Text>
      <Text
        className={
          muted ? 'flex-1 text-bodySm text-text-3' : 'flex-1 text-body text-text'
        }
      >
        {value}
      </Text>
    </View>
  );
}
