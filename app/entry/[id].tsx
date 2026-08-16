import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import {
  activateKeepAwakeAsync,
  deactivateKeepAwake,
} from 'expo-keep-awake';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { BackButton } from '@/components/ui/back-button';
import { Screen } from '@/components/ui/screen';
import { SectionLabel } from '@/components/ui/section-label';
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
import {
  formatLastTime,
  formatSessionDate,
  formatSetCount,
} from '@/lib/format';

/** Named so the activate and deactivate calls cannot drift apart. */
const KEEP_AWAKE_TAG = 'zoomies-session';

/**
 * Logging one exercise (FEATURES.md §7.2).
 *
 * ```
 * ← Rings A
 * Ring Dip                                      3 / 4
 * Target today · 4 × 8 reps      9 Aug · 8 · 8 · 8 · 6
 *
 * THIS SESSION
 * 1   8 reps
 * 2   8 reps
 * 3   7 reps  [TO FAILURE]
 *     grip went first
 * ───────────────────────────────────────────────────
 * [ − ]        8 reps        [ + ]
 * [           Record set 4           ]
 * ```
 *
 * The plan and the precedent share a line: what today asks for on the left, and
 * what this actually did last time on the right, greyed because it is context
 * rather than an instruction. Both come from the entry's own snapshot, so
 * nothing here can be changed by editing the template mid-session.
 */
export default function EntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: found, updatedAt } = useLiveQuery(entryById(id), [id]);
  const entry = found.at(0);
  const settled = updatedAt !== undefined;

  if (!entry) {
    return (
      <Screen bleed>
        <BackButton />
        {settled ? (
          <Text className="px-2xl pt-2xl text-body text-text-2">
            This exercise is no longer in the session.
          </Text>
        ) : null}
      </Screen>
    );
  }

  return <Logging key={entry.id} entryId={entry.id} />;
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

  /** Reached from History rather than from training — see below and §9. */
  const finished = session?.completedAt !== null && session !== undefined;

  /**
   * §8.1 — the screen stays on **while training**, where hands are busy and a
   * timeout costs a set.
   *
   * Conditional, and therefore not `useKeepAwake`, which takes no enabled flag.
   * This screen is reachable from History too, and holding the display on to
   * read a session from three weeks ago is a battery cost with nothing bought.
   */
  useEffect(() => {
    if (finished) {
      return;
    }

    void activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});

    return () => {
      void deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [finished]);

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

  /**
   * **No logging UI once the session is over.**
   *
   * This screen is reachable from History as well as from training (§9), and
   * arriving from a session three weeks old to be offered `Record set 4` — with
   * a live countdown, for a duration exercise — states something false about
   * what you are looking at. §7.3 grants editing and deleting a set after a
   * session, not adding to one; the set rows below stay editable, which is what
   * correcting a mislog actually needs.
   */
  const log =
    finished || metrics.length === 0 ? null : (
      <SetLog
        entryId={entry.id}
        metrics={metrics}
        nextSetNumber={performed.length + 1}
        setsUntilTarget={
          entry.targetSets === null ? null : entry.targetSets - performed.length
        }
        /*
          Only when the target is on the primary metric. An exercise can be
          targeted at one measurement while being timed on another, and counting
          down from the wrong number would be nonsense.
        */
        durationTargetMs={
          primary &&
          primary.type === 'duration' &&
          entry.targetMetricId === primary.id &&
          entry.targetValue !== null
            ? entry.targetValue * 1000
            : null
        }
        targetMetricId={entry.targetMetricId}
        targetValue={entry.targetValue}
      />
    );

  /**
   * **A counted set is logged from a pinned bar; a held one is not.**
   *
   * Counting is a glance at the number and a press, so the control belongs
   * under the thumb whatever the list above it is doing. A hold is the opposite:
   * the clock *is* the screen while it runs (§8), and pinning it to the bottom
   * edge would put the largest figure in the application in the smallest
   * space.
   */
  const held = primary?.type === 'duration';

  return (
    <Screen bleed footer={log && !held ? log : undefined}>
      <ScrollView
        contentContainerClassName="pb-2xl"
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-center gap-md pr-2xl">
          <BackButton />
          <Text className="flex-1 text-bodySm text-text-3" numberOfLines={1}>
            {session?.name ?? ''}
          </Text>
        </View>

        <View className="flex-row items-baseline gap-lg px-2xl pt-sm">
          <Text
            className="flex-1 font-sans-semibold text-display text-text"
            numberOfLines={1}
          >
            {exercise.at(0)?.name ?? 'Exercise'}
          </Text>
          {/*
            A bare `0` beside the name said nothing — §7.1 gets away with `2 / 4`
            on the session list because a column of them reads as a column. With
            no target the figure names its own unit instead of borrowing a label
            for it.
          */}
          <Text className="font-mono text-metric text-text">
            {entry.targetSets === null
              ? performed.length === 1
                ? '1 set'
                : `${performed.length} sets`
              : formatSetCount(performed.length, entry.targetSets)}
          </Text>
        </View>

        {/* The plan and the precedent on one line: what today asks for, and
            what this actually did last time. */}
        <View className="flex-row items-center gap-lg px-2xl">
          <TargetRow entry={entry} metrics={metrics} />
          <Text className="font-mono text-metricXs text-text-4">
            {lastTime
              ? `${formatSessionDate(lastTime.performedAt)} · ${formatLastTime(
                  lastTime.values,
                )}` +
                // §7.2 — a fallback from another context is labelled rather
                // than silently compared against.
                (lastTime.fromElsewhere
                  ? ` (${lastTime.sessionName ?? 'elsewhere'})`
                  : '')
              : 'not trained before'}
          </Text>
        </View>

        {metrics.length === 0 ? (
          <Text className="px-2xl pt-xl text-bodySm text-text-2">
            This exercise records nothing yet. Add a metric to it first.
          </Text>
        ) : null}

        {held && log ? <View className="px-2xl pt-xl">{log}</View> : null}

        {performed.length > 0 ? (
          <View className="pt-xl">
            <SectionLabel className="px-2xl pb-sm">This session</SectionLabel>
            {performed.map((set) => (
              <SetRow
                key={set.id}
                entryId={entry.id}
                set={set}
                metrics={metrics}
                values={valuesBySet.get(set.id) ?? []}
              />
            ))}
          </View>
        ) : null}

        <EntryNotes key={entry.id} entry={entry} />
      </ScrollView>
    </Screen>
  );
}
