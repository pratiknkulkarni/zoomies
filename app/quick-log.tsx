import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';

import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { ListRow } from '@/components/ui/list-row';
import { NumericField } from '@/components/ui/numeric-field';
import { Screen } from '@/components/ui/screen';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { quickLog } from '@/db/mutations/sessions';
import type { SetValueInput } from '@/db/mutations/sets';
import {
  activeExercises,
  allMetrics,
  indexMetricsByExercise,
  metricsForExercise,
  type Exercise,
} from '@/db/queries/exercises';
import { tapSaved } from '@/lib/haptics';
import { formatMetricSummary } from '@/lib/format';
import { toNullableFloat } from '@/lib/parse';
import { matchesQuery } from '@/lib/search';

/**
 * Quick log (FEATURES.md §6.1) — five pull-ups in the evening.
 *
 * Pick an exercise, enter values, done. No session screen is shown, because
 * this is not a session: it writes one that is already complete, flagged
 * `is_quick_log` so §11.5 can count it toward sets and records without letting
 * it inflate the sessions figure.
 *
 * **Fields only, no hold timer.** §6.1 is "pick exercise, enter values, done",
 * and §8 keeps manual entry available for every exercise including a hold. The
 * timer belongs to training.
 *
 * `SetLog` is deliberately not reused. It takes an entry id and writes through
 * `logSet`, and a quick log has no entry until the moment it saves — reshaping
 * the most important screen in the application to serve the least important one
 * would be the wrong trade for the duplication it saves.
 */
export default function QuickLogScreen() {
  const [chosen, setChosen] = useState<Exercise | null>(null);

  return chosen ? (
    <LogForm exercise={chosen} onBack={() => setChosen(null)} />
  ) : (
    <ChooseExercise onChoose={setChosen} />
  );
}

/** The same search list the template picker uses, tapping to choose not to add. */
function ChooseExercise({ onChoose }: { onChoose: (of: Exercise) => void }) {
  const { data: library } = useLiveQuery(activeExercises());
  const { data: metrics } = useLiveQuery(allMetrics());

  const metricsByExercise = useMemo(
    () => indexMetricsByExercise(metrics),
    [metrics],
  );

  const [query, setQuery] = useState('');

  const shown = useMemo(
    () => library.filter((exercise) => matchesQuery(exercise.name, query)),
    [library, query],
  );

  const searching = query.trim().length > 0;

  return (
    <Screen bleed>
      {/*
        Outside the FlatList, not in `ListHeaderComponent`: a TextInput in a list
        header is remounted as the list re-renders and drops the keyboard
        mid-word. Same reason as `app/template/[id]/add.tsx`.
      */}
      <View>
        <BackButton />
        <Text className="px-xl pt-sm font-sans-semibold text-display text-text">
          Quick log
        </Text>
        <Text className="px-xl pb-md pt-xs text-bodySm text-text-2">
          One exercise, logged outside a session.
        </Text>
        <View className="px-xl pb-lg">
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            accessibilityLabel="Search exercises"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <FlatList
        data={shown}
        keyExtractor={(exercise) => exercise.id}
        ItemSeparatorComponent={Separator}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <ListRow
            title={item.name}
            subtitle={formatMetricSummary(metricsByExercise.get(item.id) ?? [])}
            onPress={() => onChoose(item)}
          />
        )}
        ListEmptyComponent={
          <View className="px-xl">
            {searching ? (
              <Text className="text-bodySm text-text-2">
                No exercise matches {query.trim()}.
              </Text>
            ) : (
              <EmptyState
                title="Nothing to log"
                body="Your library is empty. Exercises come from the Exercises tab."
              />
            )}
          </View>
        }
      />
    </Screen>
  );
}

/**
 * The values, and the one write.
 *
 * Nothing is required per metric (§4.1), but a set has to record *something*,
 * so Save stays disabled until a field holds a value or `to_failure` is on —
 * the same rule `SetLog` applies, for the same reason: an untouched form
 * submitted by a stray tap is not an observation.
 */
function LogForm({
  exercise,
  onBack,
}: {
  exercise: Exercise;
  onBack: () => void;
}) {
  const { data: own } = useLiveQuery(metricsForExercise(exercise.id), [
    exercise.id,
  ]);

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [toFailure, setToFailure] = useState(false);
  const [saving, setSaving] = useState(false);

  const set =
    (metricId: string) => (next: string | ((current: string) => string)) =>
      setDraft((current) => ({
        ...current,
        [metricId]:
          typeof next === 'function' ? next(current[metricId] ?? '') : next,
      }));

  const recordsSomething =
    toFailure ||
    own.some((metric) => (draft[metric.id] ?? '').trim().length > 0);

  const save = () => {
    if (saving || !recordsSomething) {
      return;
    }

    setSaving(true);

    const values: SetValueInput[] = own.map((metric) =>
      metric.type === 'notes'
        ? { metricId: metric.id, text: draft[metric.id]?.trim() || null }
        : { metricId: metric.id, num: toNullableFloat(draft[metric.id] ?? '') },
    );

    // The write completes before the screen moves, so a force-quit between the
    // tap and the navigation loses nothing (invariant 1).
    void quickLog(exercise.id, values, toFailure)
      .then(() => {
        tapSaved();
        router.back();
      })
      .finally(() => setSaving(false));
  };

  return (
    <Screen bleed>
      <ScrollView
        contentContainerClassName="pb-3xl"
        keyboardShouldPersistTaps="handled"
      >
        {/* Back goes to the exercise list, not off the screen — changing your
            mind about which exercise is the likelier correction. */}
        <BackButton onPress={onBack} />

        <Text className="px-xl pt-sm font-sans-semibold text-display text-text">
          {exercise.name}
        </Text>

        <View className="gap-lg px-xl pt-2xl">
          {own.length === 0 ? (
            <Text className="text-bodySm text-text-2">
              This exercise records nothing yet. Add a metric to it first.
            </Text>
          ) : null}

          {own.map((metric) => (
            <View key={metric.id} className="gap-xs">
              <Text className="text-caption text-text-2">{metric.name}</Text>
              {metric.type === 'notes' ? (
                <Input
                  value={draft[metric.id] ?? ''}
                  onChangeText={set(metric.id)}
                  accessibilityLabel={metric.name}
                />
              ) : (
                <NumericField
                  value={draft[metric.id] ?? ''}
                  onChangeText={set(metric.id)}
                  unit={metric.unit}
                  accessibilityLabel={metric.name}
                />
              )}
            </View>
          ))}

          <View className="flex-row">
            <Chip
              label="To failure"
              selected={toFailure}
              onPress={() => setToFailure((current) => !current)}
              role="switch"
            />
          </View>

          <Button
            variant="primary"
            disabled={saving || !recordsSomething}
            onPress={save}
          >
            <Text>Log it</Text>
          </Button>
        </View>
      </ScrollView>
    </Screen>
  );
}
