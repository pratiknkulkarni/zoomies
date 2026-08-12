import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';

import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { NumericField } from '@/components/ui/numeric-field';
import { Screen } from '@/components/ui/screen';
import { SectionLabel } from '@/components/ui/section-label';
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
import { trainedAtRefs } from '@/db/queries/history';
import { formatMeasures } from '@/lib/format';
import { tapSaved } from '@/lib/haptics';
import { toNullableFloat } from '@/lib/parse';
import { matchesQuery } from '@/lib/search';
import { useDraftExit } from '@/lib/use-draft-exit';

/**
 * Quick log (FEATURES.md §6.1) — five pull-ups in the evening.
 *
 * Pick an exercise, enter values, done. No session screen is shown, because
 * this is not a session: it writes one that is already complete, flagged
 * `is_quick_log` so §11.5 can count it toward sets and records without letting
 * it inflate the sessions figure.
 *
 * **It opens on the exercise you last trained, with the two before it beside
 * it.** Logging outside a session is nearly always more of something you are
 * already doing, so the common case should not begin by opening a list of
 * everything. Change is one tap away for when it is not.
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
  const { data: library } = useLiveQuery(activeExercises());
  const { data: trained } = useLiveQuery(trainedAtRefs());

  const [picked, setPicked] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);

  /**
   * The exercises done most recently, newest first. Folded from the same rows
   * the library reads for its `last trained` column rather than a query of its
   * own.
   */
  const recent = useMemo(() => {
    const latest = new Map<string, number>();

    for (const row of trained) {
      const held = latest.get(row.exerciseId);
      if (held === undefined || row.performedAt > held) {
        latest.set(row.exerciseId, row.performedAt);
      }
    }

    const byId = new Map(library.map((exercise) => [exercise.id, exercise]));

    return [...latest.entries()]
      .sort((a, b) => b[1] - a[1])
      .flatMap(([id]) => {
        const exercise = byId.get(id);
        return exercise ? [exercise] : [];
      });
  }, [trained, library]);

  // Falls back to the library's first row for an app that has never been
  // trained in, so the screen is usable on its first day.
  const chosen =
    library.find((exercise) => exercise.id === picked) ??
    recent.at(0) ??
    library.at(0);

  if (choosing || !chosen) {
    return (
      <ChooseExercise
        onChoose={(exercise) => {
          setPicked(exercise.id);
          setChoosing(false);
        }}
        onCancel={chosen ? () => setChoosing(false) : undefined}
      />
    );
  }

  return (
    <LogForm
      key={chosen.id}
      exercise={chosen}
      alternatives={recent.filter((one) => one.id !== chosen.id).slice(0, 3)}
      onPick={(exercise) => setPicked(exercise.id)}
      onChange={() => setChoosing(true)}
    />
  );
}

/** The same search list the pickers use, tapping to choose rather than to add. */
function ChooseExercise({
  onChoose,
  onCancel,
}: {
  onChoose: (of: Exercise) => void;
  onCancel?: () => void;
}) {
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
        <BackButton onPress={onCancel} />
        <Text className="px-2xl pt-sm font-sans-semibold text-display text-text">
          Which exercise?
        </Text>
        <View className="px-2xl py-lg">
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder={
              library.length === 1
                ? 'Search 1 exercise'
                : `Search ${library.length} exercises`
            }
            accessibilityLabel="Search exercises"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <FlatList
        data={shown}
        keyExtractor={(exercise) => exercise.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => onChoose(item)}
            className="min-h-touch flex-row items-center gap-lg px-2xl py-md active:bg-muted"
          >
            <Text className="flex-1 font-sans-semibold text-heading text-text">
              {item.name}
            </Text>
            <Text className="font-mono text-metricXs text-text-4">
              {formatMeasures(metricsByExercise.get(item.id) ?? []) ?? ''}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="px-2xl">
            {searching ? (
              <Text className="text-bodySm text-text-3">
                Nothing matches “{query.trim()}”.
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
 * so the button stays disabled until a field holds a value or `to_failure` is
 * on — the same rule `SetLog` applies, for the same reason: an untouched form
 * submitted by a stray tap is not an observation.
 */
function LogForm({
  exercise,
  alternatives,
  onPick,
  onChange,
}: {
  exercise: Exercise;
  alternatives: Exercise[];
  onPick: (of: Exercise) => void;
  onChange: () => void;
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

  const write = async () => {
    if (saving || !recordsSomething) {
      return;
    }

    setSaving(true);

    const values: SetValueInput[] = own.map((metric) =>
      metric.type === 'notes'
        ? { metricId: metric.id, text: draft[metric.id]?.trim() || null }
        : { metricId: metric.id, num: toNullableFloat(draft[metric.id] ?? '') },
    );

    try {
      // Awaited, so the set is on disk before anything navigates (invariant 1).
      await quickLog(exercise.id, values, toFailure);
      tapSaved();
    } finally {
      setSaving(false);
    }
  };

  /**
   * A half-typed set counts as unsaved work, so backing out of it asks rather
   * than dropping it silently.
   *
   * **The system back has to agree with the button.** Overriding only the
   * on-screen one left the Android gesture popping the whole route to Home,
   * which is smoke test O3: an override the hardware ignores is worse than no
   * override, because it teaches a rule the device then breaks.
   */
  const { requestExit } = useDraftExit({
    dirty: recordsSomething,
    onSave: write,
    onLeave: () => router.back(),
  });

  const save = () => {
    void write().then(() => router.back());
  };

  return (
    <Screen
      bleed
      footer={
        <Button
          variant="primary"
          disabled={saving || !recordsSomething}
          onPress={save}
        >
          <Text>Log it</Text>
        </Button>
      }
    >
      <ScrollView
        contentContainerClassName="pb-2xl"
        keyboardShouldPersistTaps="handled"
      >
        <BackButton onPress={requestExit} />

        <Text className="px-2xl pt-sm font-sans-semibold text-display text-text">
          Quick log
        </Text>
        <Text className="px-2xl pt-xs text-bodySm text-text-3">
          Outside a session. Nothing starts.
        </Text>

        <View className="gap-sm px-2xl pt-xl">
          <SectionLabel>Exercise</SectionLabel>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${exercise.name}, change`}
            onPress={onChange}
            className="min-h-touch flex-row items-center gap-lg rounded-button border border-border bg-surface px-lg py-md active:bg-muted"
          >
            <Text className="flex-1 font-sans-semibold text-heading text-text">
              {exercise.name}
            </Text>
            <Text className="text-bodySm text-text-3">Change</Text>
          </Pressable>

          {/* The last few, so the common case never opens a list at all. */}
          {alternatives.length > 0 ? (
            <View className="flex-row flex-wrap gap-sm">
              {alternatives.map((other) => (
                <Chip
                  key={other.id}
                  label={other.name}
                  selected={false}
                  onPress={() => onPick(other)}
                />
              ))}
            </View>
          ) : null}
        </View>

        <View className="gap-lg px-2xl pt-xl">
          {own.length === 0 ? (
            <Text className="text-bodySm text-text-2">
              This exercise records nothing yet. Add a metric to it first.
            </Text>
          ) : null}

          {own.map((metric) => (
            <View key={metric.id} className="gap-xs">
              <SectionLabel>{metric.name}</SectionLabel>
              {metric.type === 'notes' ? (
                <Input
                  value={draft[metric.id] ?? ''}
                  onChangeText={set(metric.id)}
                  placeholder="Optional"
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

          {/*
            No clock in this line. The document times it — `Logged now, 21:36`
            — but a figure rendered on arrival is wrong by however long the
            screen sits open, and a stale time is worse than none on a screen
            whose whole claim is about when something happened.
          */}
          <Text className="text-caption text-text-4">
            Logged now · counts as training, not as a session.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
