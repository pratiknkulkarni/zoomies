import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
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
} from '@/db/queries/exercises';
import {
  slotsForTemplate,
  templateById,
  type Template,
} from '@/db/queries/templates';
import { SlotList } from '@/features/templates/slot-list';

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
        <BackButton />

        {!template ? (
          settled ? (
            <Text className="px-xl pt-xl text-body text-text-2">
              This template is no longer here.
            </Text>
          ) : null
        ) : (
          <>
            <View className="px-xl pt-sm">
              <Text className="pb-lg font-sans-semibold text-display text-text">
                {template.name}
              </Text>
              <StartButton
                templateId={template.id}
                slotCount={slots.length}
                activeSessionId={active.at(0)?.id ?? null}
              />
            </View>

            {/*
              Keyed on the row so the field initialises from props once. The
              query is live, so a field reading straight from props would be
              reset mid-edit whenever anything else on this screen wrote.
            */}
            <Name key={template.id} template={template} />

            <SectionLabel className="px-xl pb-sm pt-2xl">
              Exercises
            </SectionLabel>

            <SlotList
              templateId={template.id}
              slots={slots}
              exercisesById={exercisesById}
              metricsById={metricsById}
            />

            <View className="gap-md px-xl pt-xl">
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

            <View className="px-xl pt-2xl">
              <Button variant="danger" onPress={confirmDelete}>
                <Text>Delete template</Text>
              </Button>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

/**
 * The primary action, and the only accent on the screen (DESIGN.md §3).
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

/**
 * The name commits on blur rather than behind a Save button. Everything else on
 * this screen writes as you act on it, and one field is not a form.
 */
function Name({ template }: { template: Template }) {
  const [name, setName] = useState(template.name);

  const commit = () => {
    const trimmed = name.trim();

    // A template has to be called something. An emptied field reverts rather
    // than writing a nameless row.
    if (trimmed.length === 0) {
      setName(template.name);
      return;
    }

    if (trimmed !== template.name) {
      void renameTemplate(template.id, trimmed);
    }
  };

  return (
    <View className="gap-xs px-xl pt-sm">
      <SectionLabel>Name</SectionLabel>
      <Input
        value={name}
        onChangeText={setName}
        onBlur={commit}
        accessibilityLabel="Template name"
        autoCapitalize="words"
      />
    </View>
  );
}
