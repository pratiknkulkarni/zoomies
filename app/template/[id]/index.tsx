import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { FormActions } from '@/components/ui/form-actions';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { SectionLabel } from '@/components/ui/section-label';
import { Text } from '@/components/ui/text';
import { startFromTemplate } from '@/db/mutations/sessions';
import { deleteTemplate, renameTemplate } from '@/db/mutations/templates';
import { completedSessions } from '@/db/queries/history';
import { activeSession, lastTimeFor } from '@/db/queries/sessions';
import {
  allLiveExercises,
  allMetrics,
  indexExercisesById,
  indexMetricsById,
  type Exercise,
  type ExerciseMetric,
} from '@/db/queries/exercises';
import {
  slotsForTemplate,
  templateById,
  type Template,
  type TemplateSlot,
} from '@/db/queries/templates';
import { SlotList } from '@/features/templates/slot-list';
import { formatLastTime, formatPlanSummary } from '@/lib/format';
import { useDraftExit } from '@/lib/use-draft-exit';

/**
 * One template. There is no separate read view: a template is a plan, and
 * everything on it is editable. An exercise earns a detail screen because
 * Phase 8 hangs history and records off it; a template has nothing to show that
 * is not also a thing to change.
 *
 * Editing here never touches training already done. A session snapshots its
 * targets onto `exercise_entries` when it starts (invariant 5), so this screen
 * is always a statement about the next session, never a past one.
 */
export default function TemplateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: found, updatedAt } = useLiveQuery(templateById(id), [id]);
  const { data: slots } = useLiveQuery(slotsForTemplate(id), [id]);
  const { data: exercises } = useLiveQuery(allLiveExercises());
  const { data: metrics } = useLiveQuery(allMetrics());
  // §6.2 allows one at a time, so an unfinished session is offered rather than
  // a second one started. The mutation refuses either way.
  const { data: active } = useLiveQuery(activeSession());
  const { data: history } = useLiveQuery(completedSessions());

  const runs = useMemo(
    () => history.filter((session) => session.templateId === id),
    [history, id],
  );

  /**
   * What each slot's exercise did the last time it was trained, read once per
   * slot rather than joined.
   *
   * `lastTimeFor` is the same function the logging screen uses, so the figure
   * here and the figure mid-session cannot disagree — it prefers this plan's
   * own history and falls back to anywhere (§7.2). Not live: history cannot
   * change while this screen is open, and subscribing would re-run four reads
   * on every keystroke in the name field.
   */
  const [lastBySlot, setLastBySlot] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let current = true;

    void Promise.all(
      slots.map(async (slot) => {
        const metricId =
          slot.targetMetricId ??
          metrics.find((metric) => metric.exerciseId === slot.exerciseId)?.id;

        if (!metricId) {
          return null;
        }

        // No session to exclude: nothing is running that this could be part of.
        const last = await lastTimeFor(slot.exerciseId, metricId, id, '');
        return last ? ([slot.id, formatLastTime(last.values)] as const) : null;
      }),
    ).then((pairs) => {
      if (current) {
        setLastBySlot(new Map(pairs.filter((pair) => pair !== null)));
      }
    });

    return () => {
      current = false;
    };
  }, [slots, metrics, id]);

  const exercisesById = useMemo(
    () => indexExercisesById(exercises),
    [exercises],
  );
  const metricsById = useMemo(() => indexMetricsById(metrics), [metrics]);

  const template = found.at(0);

  // `data` starts as an empty array, so "no rows" and "not read yet" look
  // identical until `updatedAt` lands.
  const settled = updatedAt !== undefined;

  const confirmDelete = () => {
    if (!template) {
      return;
    }

    Alert.alert(
      `Delete ${template.name}?`,
      'Sessions already trained from it are kept, and stay readable in history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteTemplate(template.id).then(() => router.back());
          },
        },
      ],
    );
  };

  return (
    <Screen bleed>
      <ScrollView
        contentContainerClassName="pb-3xl"
        keyboardShouldPersistTaps="handled"
      >
        {!template ? (
          <>
            <BackButton />
            {settled ? (
              <Text className="px-2xl pt-2xl text-body text-text-2">
                This template is no longer here.
              </Text>
            ) : null}
          </>
        ) : (
          /*
            Keyed on the row so the name draft initialises from props once. The
            query is live, so a field reading straight from props would be reset
            mid-edit whenever anything else on this screen wrote.
          */
          <Loaded
            key={template.id}
            template={template}
            slots={slots}
            exercisesById={exercisesById}
            metricsById={metricsById}
            lastBySlot={lastBySlot}
            runCount={runs.length}
            lastRunAt={
              runs.at(0)?.completedAt ?? runs.at(0)?.startedAt ?? null
            }
            activeSessionId={active.at(0)?.id ?? null}
            onDelete={confirmDelete}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

/**
 * A **mixed screen** (§18): one drafted field, and everything else immediate.
 *
 * The name is the only thing here that is typed, so it carries its own Save
 * beneath it rather than the screen carrying one at the bottom. A single Save
 * down there would appear to own the slot list above it — which is exactly the
 * confusion `exercise/[id]/edit.tsx` had, where Save covered half a screen and
 * the other half was already written.
 *
 * Starting a session, adding an exercise and deleting the template are acts and
 * commit as you do them, so nothing about them is pending when you leave.
 */
function Loaded({
  template,
  slots,
  exercisesById,
  metricsById,
  lastBySlot,
  runCount,
  lastRunAt,
  activeSessionId,
  onDelete,
}: {
  template: Template;
  slots: TemplateSlot[];
  exercisesById: Map<string, Exercise>;
  metricsById: Map<string, ExerciseMetric>;
  lastBySlot: Map<string, string>;
  runCount: number;
  lastRunAt: number | null;
  activeSessionId: string | null;
  onDelete: () => void;
}) {
  const [name, setName] = useState(template.name);

  const trimmed = name.trim();
  const dirty = trimmed !== template.name;
  // A template has to be called something, so an empty field never saves.
  const valid = trimmed.length > 0;

  const { requestExit, saveAndLeave } = useDraftExit({
    dirty: dirty && valid,
    onSave: () => renameTemplate(template.id, trimmed),
    onDiscard: () => setName(template.name),
  });

  return (
    <>
      <BackButton onPress={requestExit} />

      <View className="px-2xl pt-sm">
        <Text className="font-sans-semibold text-display text-text">
          {template.name}
        </Text>
        <Text className="pt-xs font-mono text-metricXs text-text-3">
          {formatPlanSummary(
            slots.length,
            slots.reduce((total, slot) => total + (slot.targetSets ?? 0), 0),
            lastRunAt,
          )}
        </Text>
      </View>

      <View className="gap-xs px-2xl pt-xl">
        <SectionLabel>Name</SectionLabel>
        <Input
          value={name}
          onChangeText={setName}
          accessibilityLabel="Template name"
          autoCapitalize="words"
        />
        {dirty ? (
          <View className="pt-sm">
            <FormActions
              dirty={dirty}
              valid={valid}
              onDiscard={() => setName(template.name)}
              onSave={saveAndLeave}
              saveLabel="Save name"
            />
          </View>
        ) : null}
      </View>

      <SectionLabel className="px-2xl pb-sm pt-xl">Exercises</SectionLabel>

      <SlotList
        templateId={template.id}
        slots={slots}
        exercisesById={exercisesById}
        metricsById={metricsById}
        lastBySlot={lastBySlot}
      />

      <View className="gap-md px-2xl pt-xl">
        <Button
          variant="secondary"
          className="w-full"
          onPress={() =>
            router.push({
              pathname: '/template/[id]/add',
              params: { id: template.id },
            })
          }
        >
          <Text>Add an exercise</Text>
        </Button>
      </View>

      {/*
        Invariant 5, said out loud on the screen where it is easiest to doubt.
        Changing a target here looks like it might rewrite what you already did,
        and the count is what makes the reassurance concrete.
      */}
      <Text className="px-2xl pt-xl text-bodySm text-text-3">
        Editing a plan changes what future sessions start from.
        {runCount === 0
          ? ' Nothing has been trained from it yet.'
          : runCount === 1
            ? ' The one session already run keeps the targets it had.'
            : ` The ${runCount} sessions already run keep the targets they had.`}
      </Text>

      <View className="px-2xl pt-xl">
        <Button variant="danger" onPress={onDelete}>
          <Text>Delete plan</Text>
        </Button>
      </View>

      <View className="px-2xl pt-2xl">
        <StartButton
          templateId={template.id}
          templateName={template.name}
          slotCount={slots.length}
          activeSessionId={activeSessionId}
        />
      </View>
    </>
  );
}

/**
 * The primary action, and the only block of solid ink on the screen
 * (DESIGN.md §3.2).
 *
 * An empty template cannot start a session — there would be nothing to log, and
 * a session with no entries is a row that exists only to be discarded. With one
 * already running the button offers that instead, since §6.2 allows one at a
 * time.
 */
function StartButton({
  templateId,
  templateName,
  slotCount,
  activeSessionId,
}: {
  templateId: string;
  templateName: string;
  slotCount: number;
  activeSessionId: string | null;
}) {
  if (activeSessionId) {
    return (
      <Button
        variant="primary"
        onPress={() =>
          router.push({
            pathname: '/session/[id]',
            params: { id: activeSessionId },
          })
        }
      >
        <Text>Return to session</Text>
      </Button>
    );
  }

  const start = () => {
    void startFromTemplate(templateId).then((id) =>
      router.push({ pathname: '/session/[id]', params: { id } }),
    );
  };

  return (
    <>
      <Button variant="primary" disabled={slotCount === 0} onPress={start}>
        <Text>Start {templateName}</Text>
      </Button>
      {slotCount === 0 ? (
        <Text className="pt-sm text-caption text-text-2">
          Add an exercise first — there would be nothing to log.
        </Text>
      ) : null}
    </>
  );
}

