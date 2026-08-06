import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericField } from '@/components/ui/numeric-field';
import { SectionLabel } from '@/components/ui/section-label';
import { Text } from '@/components/ui/text';
import { overrideTarget, setEntryNotes } from '@/db/mutations/sessions';
import type { ExerciseMetric } from '@/db/queries/exercises';
import type { ExerciseEntry } from '@/db/queries/sessions';
import { formatTarget } from '@/lib/format';
import { fromNullableNumber, toNullableFloat, toNullableInt } from '@/lib/parse';

/**
 * The target, and the tap that changes it for this session only (§7.4).
 *
 * **The template is not touched.** This writes the entry's own snapshot, which
 * is what makes the override local — there is no path from an entry back to
 * the slot it came from. A bad night should never silently rewrite the
 * program, and a good one should not either.
 */
export function TargetRow({
  entry,
  metrics,
}: {
  entry: ExerciseEntry;
  metrics: ExerciseMetric[];
}) {
  const [editing, setEditing] = useState(false);

  const targetMetric = entry.targetMetricId
    ? metrics.find((metric) => metric.id === entry.targetMetricId)
    : undefined;

  if (!editing) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Change target for this session"
        onPress={() => setEditing(true)}
        className="min-h-touch flex-row items-center gap-md active:bg-muted"
      >
        <Text className="w-label text-caption text-text-3">Target</Text>
        <Text className="flex-1 text-body text-text">
          {formatTarget(entry, targetMetric)}
        </Text>
      </Pressable>
    );
  }

  return (
    <Override
      key={entry.id}
      entry={entry}
      metrics={metrics}
      onDone={() => setEditing(false)}
    />
  );
}

function Override({
  entry,
  metrics,
  onDone,
}: {
  entry: ExerciseEntry;
  metrics: ExerciseMetric[];
  onDone: () => void;
}) {
  const [sets, setSets] = useState(fromNullableNumber(entry.targetSets));
  const [value, setValue] = useState(fromNullableNumber(entry.targetValue));

  /**
   * Which metric the number counts. Keeps whatever the template chose; falls
   * back to the primary metric, since that is what the logging UI is built
   * around anyway (§4.1).
   */
  const metricId = entry.targetMetricId ?? metrics.at(0)?.id ?? null;
  const metric = metrics.find((candidate) => candidate.id === metricId);

  const save = () => {
    void overrideTarget(entry.id, {
      sets: toNullableInt(sets),
      metricId,
      value: toNullableFloat(value),
    }).then(onDone);
  };

  return (
    <View className="gap-md py-sm">
      <SectionLabel>Target — this session only</SectionLabel>

      <View className="gap-xs">
        <Text className="text-caption text-text-2">Sets</Text>
        <NumericField
          value={sets}
          onChangeText={setSets}
          accessibilityLabel="Target sets"
        />
      </View>

      <View className="gap-xs">
        <Text className="text-caption text-text-2">
          {metric?.name ?? 'Target'}
        </Text>
        <NumericField
          value={value}
          onChangeText={setValue}
          unit={metric?.unit}
          accessibilityLabel="Target value"
          step={metric?.unit === 'kg' ? 2.5 : 1}
          keyboardType={metric?.unit === 'kg' ? 'decimal-pad' : 'number-pad'}
        />
      </View>

      <Text className="text-caption text-text-2">
        The template keeps its own target.
      </Text>

      <View className="flex-row gap-md">
        <View className="flex-1">
          <Button variant="secondary" onPress={onDone} className="w-full">
            <Text>Cancel</Text>
          </Button>
        </View>
        <View className="flex-1">
          <Button variant="primary" onPress={save}>
            <Text>Set</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}

/**
 * One note per exercise entry, not per set (§7.5) — written after finishing the
 * exercise, so it sits below the log rather than above it.
 *
 * Commits on blur. Keyed on the entry by its caller so the field initialises
 * once and is never overwritten by a live update while being typed into.
 */
export function EntryNotes({ entry }: { entry: ExerciseEntry }) {
  const [notes, setNotes] = useState(entry.notes ?? '');

  /**
   * Written as you type. Blur never fires when the screen is left with the
   * field still focused, and this screen has kept
   * `keyboardShouldPersistTaps="handled"` since Phase 4 — so a tap on Back went
   * to the button without dismissing the keyboard, and the note was lost.
   *
   * A note written mid-session is exactly the thing invariant 1 exists for. One
   * UPDATE per keystroke against local SQLite is cheaper than a lost note.
   */
  const change = (next: string) => {
    setNotes(next);

    const trimmed = next.trim();
    void setEntryNotes(entry.id, trimmed.length > 0 ? trimmed : null);
  };

  return (
    <View className="gap-xs px-xl pt-2xl">
      <SectionLabel>Notes</SectionLabel>
      <Input
        value={notes}
        onChangeText={change}
        accessibilityLabel="Notes for this exercise"
        placeholder="How it felt, what to change"
        multiline
        className="h-auto min-h-field py-md"
      />
    </View>
  );
}
