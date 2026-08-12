import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
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
import { activeSession } from '@/db/queries/sessions';
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
  activeSessionId,
  onDelete,
}: {
  template: Template;
  slots: TemplateSlot[];
  exercisesById: Map<string, Exercise>;
  metricsById: Map<string, ExerciseMetric>;
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
        <Text className="pb-lg font-sans-semibold text-display text-text">
          {template.name}
        </Text>
        <StartButton
          templateId={template.id}
          slotCount={slots.length}
          activeSessionId={activeSessionId}
        />
      </View>

      <View className="gap-xs px-2xl pt-sm">
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
      />

      <View className="gap-md px-2xl pt-2xl">
        <Button
          variant="secondary"
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

      <View className="px-2xl pt-xl">
        <Button variant="danger" onPress={onDelete}>
          <Text>Delete template</Text>
        </Button>
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
  slotCount,
  activeSessionId,
}: {
  templateId: string;
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
        <Text>Start session</Text>
      </Button>
      {slotCount === 0 ? (
        <Text className="pt-sm text-caption text-text-2">
          Add an exercise first — there would be nothing to log.
        </Text>
      ) : null}
    </>
  );
}

