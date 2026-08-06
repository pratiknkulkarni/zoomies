import { Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { iconWithClassName } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { NumericField } from '@/components/ui/numeric-field';
import { Text } from '@/components/ui/text';
import {
  deleteSet,
  setToFailure,
  updateSetValues,
  type SetValueInput,
} from '@/db/mutations/sets';
import type { ExerciseMetric } from '@/db/queries/exercises';
import type { LoggedSet, SetMetricValue } from '@/db/queries/sessions';
import { formatSetValues } from '@/lib/format';
import { fromNullableNumber, toNullableFloat } from '@/lib/parse';

const DeleteIcon = iconWithClassName(Trash2);

/**
 * One logged set, editable in place (FEATURES.md §7.3).
 *
 * Mislogging while tired is expected, so correcting a set is a tap on the set
 * itself rather than a trip to another screen. Collapsed it states what was
 * recorded; expanded it is the same fields that recorded it.
 */
export function SetRow({
  entryId,
  set,
  metrics,
  values,
}: {
  entryId: string;
  set: LoggedSet;
  metrics: ExerciseMetric[];
  values: SetMetricValue[];
}) {
  const [editing, setEditing] = useState(false);

  const byMetric = new Map(
    values.map((value) => [value.exerciseMetricId, value.valueNum]),
  );

  if (!editing) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit set ${set.setIndex + 1}`}
        onPress={() => setEditing(true)}
        className="min-h-row flex-row items-center gap-md px-xl py-md active:bg-muted"
      >
        <Text className="w-field font-mono text-metricSm text-text-3">
          {set.setIndex + 1}
        </Text>
        <Text className="flex-1 text-body text-text">
          {formatSetValues(metrics, byMetric)}
        </Text>
        {set.toFailure ? (
          <Text className="text-caption text-text-2">to failure</Text>
        ) : null}
      </Pressable>
    );
  }

  return (
    <Editor
      key={set.id}
      entryId={entryId}
      set={set}
      metrics={metrics}
      byMetric={byMetric}
      onDone={() => setEditing(false)}
    />
  );
}

/**
 * Keyed on the set so the fields initialise from what was logged and are never
 * synced afterwards — the values query is live, and a field reading straight
 * from props would be reset mid-correction.
 */
function Editor({
  entryId,
  set,
  metrics,
  byMetric,
  onDone,
}: {
  entryId: string;
  set: LoggedSet;
  metrics: ExerciseMetric[];
  byMetric: Map<string, number | null>;
  onDone: () => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      metrics.map((metric) => [
        metric.id,
        fromNullableNumber(byMetric.get(metric.id) ?? null),
      ]),
    ),
  );
  const [failed, setFailed] = useState(set.toFailure);

  const update =
    (metricId: string) => (next: string | ((current: string) => string)) =>
      setDraft((current) => ({
        ...current,
        [metricId]:
          typeof next === 'function' ? next(current[metricId] ?? '') : next,
      }));

  const save = () => {
    const edits: SetValueInput[] = metrics.map((metric) =>
      metric.type === 'notes'
        ? { metricId: metric.id, text: draft[metric.id]?.trim() || null }
        : { metricId: metric.id, num: toNullableFloat(draft[metric.id] ?? '') },
    );

    void Promise.all([
      updateSetValues(set.id, edits),
      failed === set.toFailure
        ? Promise.resolve()
        : setToFailure(set.id, failed),
    ]).then(onDone);
  };

  const confirmDelete = () => {
    Alert.alert(
      `Delete set ${set.setIndex + 1}?`,
      'The sets after it move up to close the gap.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void deleteSet(entryId, set.id).then(onDone),
        },
      ],
    );
  };

  return (
    <View className="gap-md bg-surface px-xl py-lg">
      <View className="flex-row items-center justify-between">
        <Text className="font-mono text-metricSm text-text-2">
          Set {set.setIndex + 1}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete set ${set.setIndex + 1}`}
          onPress={confirmDelete}
          className="min-h-touch min-w-touch items-center justify-center"
        >
          <DeleteIcon size={24} strokeWidth={1.5} className="text-text-3" />
        </Pressable>
      </View>

      {metrics.map((metric) =>
        metric.type === 'notes' ? (
          <Input
            key={metric.id}
            value={draft[metric.id] ?? ''}
            onChangeText={update(metric.id)}
            accessibilityLabel={metric.name}
            placeholder={metric.name}
          />
        ) : (
          <View key={metric.id} className="gap-xs">
            <Text className="text-caption text-text-2">{metric.name}</Text>
            <NumericField
              value={draft[metric.id] ?? ''}
              onChangeText={update(metric.id)}
              unit={metric.unit}
              accessibilityLabel={metric.name}
            />
          </View>
        ),
      )}

      {/* The same control as in `SetLog`, so correcting a set looks like
          logging one. */}
      <View className="flex-row">
        <Chip
          label="To failure"
          selected={failed}
          onPress={() => setFailed((current) => !current)}
          role="switch"
        />
      </View>

      <View className="flex-row gap-md">
        <View className="flex-1">
          <Button variant="secondary" onPress={onDone} className="w-full">
            <Text>Cancel</Text>
          </Button>
        </View>
        <View className="flex-1">
          <Button variant="primary" onPress={save}>
            <Text>Save</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}
