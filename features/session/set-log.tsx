import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericField } from '@/components/ui/numeric-field';
import { SectionLabel } from '@/components/ui/section-label';
import { Text } from '@/components/ui/text';
import { logSet, type SetValueInput } from '@/db/mutations/sets';
import type { ExerciseMetric } from '@/db/queries/exercises';
import { tapSaved, tapTargetReached } from '@/lib/haptics';
import { toNullableFloat } from '@/lib/parse';
import { cn } from '@/lib/utils';

/**
 * Recording one set (FEATURES.md §7.2).
 *
 * **A field per metric, whatever its type.** §7.2 reserves a single tap-to-time
 * button for a duration-primary exercise, and that is Phase 5; §8 keeps manual
 * entry available regardless. So a hold is typed in seconds today and gains the
 * stopwatch later — every exercise is loggable now rather than some waiting a
 * phase.
 *
 * Nothing is required (§4.1). A set with every field blank still records that
 * the effort happened, which is the difference between an unrecorded value and
 * a value of zero.
 */
export function SetLog({
  entryId,
  metrics,
  setsUntilTarget,
  onLogged,
}: {
  entryId: string;
  metrics: ExerciseMetric[];
  /**
   * How many more sets reach the target, or null when there is none. Computed
   * by the caller before the write, because reacting to the count afterwards
   * would fire on every re-render rather than on the set that got there.
   */
  setsUntilTarget: number | null;
  onLogged?: () => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [toFailure, setToFailure] = useState(false);
  const [saving, setSaving] = useState(false);

  /**
   * Takes an updater as well as a value, so a stepper derives from the freshest
   * figure rather than from whatever was last rendered. Without this, taps that
   * land inside one render collapse into a single increment.
   */
  const set =
    (metricId: string) => (next: string | ((current: string) => string)) =>
      setDraft((current) => ({
        ...current,
        [metricId]:
          typeof next === 'function' ? next(current[metricId] ?? '') : next,
      }));

  const save = () => {
    if (saving) {
      return;
    }
    setSaving(true);

    const values: SetValueInput[] = metrics.map((metric) =>
      metric.type === 'notes'
        ? { metricId: metric.id, text: draft[metric.id]?.trim() || null }
        : { metricId: metric.id, num: toNullableFloat(draft[metric.id] ?? '') },
    );

    // The write completes before anything is cleared or navigated, so a
    // force-quit between the tap and the screen changing loses nothing.
    void logSet(entryId, values, toFailure)
      .then(() => {
        // After the write, never before: the haptic reports what happened.
        if (setsUntilTarget === 1) {
          tapTargetReached();
        } else {
          tapSaved();
        }

        setDraft({});
        setToFailure(false);
        onLogged?.();
      })
      .finally(() => setSaving(false));
  };

  return (
    <View className="gap-lg">
      <SectionLabel>Log a set</SectionLabel>

      {metrics.map((metric) =>
        metric.type === 'notes' ? (
          <View key={metric.id} className="gap-xs">
            <Text className="text-caption text-text-2">{metric.name}</Text>
            <Input
              value={draft[metric.id] ?? ''}
              onChangeText={set(metric.id)}
              accessibilityLabel={metric.name}
              placeholder="—"
            />
          </View>
        ) : (
          <View key={metric.id} className="gap-xs">
            <Text className="text-caption text-text-2">{metric.name}</Text>
            <NumericField
              value={draft[metric.id] ?? ''}
              onChangeText={set(metric.id)}
              unit={metric.unit}
              accessibilityLabel={metric.name}
              // Load is entered in kg and is genuinely fractional; reps and
              // seconds are not.
              step={metric.unit === 'kg' ? 2.5 : 1}
              keyboardType={metric.unit === 'kg' ? 'decimal-pad' : 'number-pad'}
            />
          </View>
        ),
      )}

      {/*
        §4.2 — a flag on the set, not a metric. Eight clean reps and eight
        grinding reps are different data, and every exercise can say so.

        Carried by the same chip treatment as the metric type selector, rather
        than a ghost button sized to its own text: §3.1 makes `muted` the
        inactive fill, and a control this easy to miss is the wrong thing to
        put on a screen used with tired hands.
      */}
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: toFailure }}
        accessibilityLabel="To failure"
        onPress={() => setToFailure((current) => !current)}
        className={cn(
          'h-control items-center justify-center rounded-button',
          toFailure ? 'border border-border bg-surface' : 'bg-muted',
        )}
      >
        <Text
          className={cn(
            'text-body',
            toFailure ? 'font-sans-semibold text-text' : 'text-text-2',
          )}
        >
          To failure
        </Text>
      </Pressable>

      <Button variant="primary" disabled={saving} onPress={save}>
        <Text>Save set</Text>
      </Button>
    </View>
  );
}
