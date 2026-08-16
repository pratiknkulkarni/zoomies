import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { HoldTimer } from '@/features/session/hold-timer';
import { Input } from '@/components/ui/input';
import { NumericField } from '@/components/ui/numeric-field';
import { SectionLabel } from '@/components/ui/section-label';
import { Text } from '@/components/ui/text';
import { logSet, type SetValueInput } from '@/db/mutations/sets';
import type { ExerciseMetric } from '@/db/queries/exercises';
import { tapSaved, tapTargetReached } from '@/lib/haptics';
import { toNullableFloat } from '@/lib/parse';

/**
 * Recording one set (FEATURES.md §7.2).
 *
 * **A field per metric, whatever its type.** §7.2 reserves a single tap-to-time
 * button for a duration-primary exercise, and that is Phase 5; §8 keeps manual
 * entry available regardless. So a hold is typed in seconds today and gains the
 * stopwatch later — every exercise is loggable now rather than some waiting a
 * phase.
 *
 * **Nothing is required per metric** (§4.1) — log reps without the load and the
 * load simply goes unrecorded, which is not the same as a load of zero. But a
 * set has to record *something*, so Save is disabled until one field holds a
 * value or `to_failure` is on.
 *
 * `to_failure` alone is enough. "I went to failure and did not count" is a real
 * observation; an untouched form submitted by a stray tap is not, and it used
 * to produce a set reading `Recorded` with nothing behind it.
 */
export function SetLog({
  entryId,
  metrics,
  nextSetNumber,
  setsUntilTarget,
  durationTargetMs,
  targetMetricId,
  targetValue,
  onLogged,
}: {
  entryId: string;
  metrics: ExerciseMetric[];
  /**
   * Which set this press will be — sets already performed, plus one. Passed in
   * rather than counted here: the caller already reads them live, and a second
   * query for a number it holds would be a second source of truth for it.
   */
  nextSetNumber: number;
  /**
   * How many more sets reach the target, or null when there is none. Computed
   * by the caller before the write, because reacting to the count afterwards
   * would fire on every re-render rather than on the set that got there.
   */
  setsUntilTarget: number | null;
  /**
   * The entry's duration target in millis, when it applies to the primary
   * metric — the timer counts down from it and records itself at zero. Null
   * counts up instead.
   */
  durationTargetMs: number | null;
  /**
   * Which metric the entry's target applies to, snapshotted at session start
   * (invariant 5). Drives the +/- step for that one metric (issue #3) — every
   * other metric keeps the default step of one.
   */
  targetMetricId: string | null;
  targetValue: number | null;
  onLogged?: () => void;
}) {
  const primary = metrics.at(0);
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

  /**
   * Whitespace is not a value, so it trims first — a space typed into a field
   * would otherwise arm the button and then save nothing, since
   * `toNullableFloat` reads it as not recorded.
   */
  const recordsSomething =
    toFailure ||
    metrics.some((metric) => (draft[metric.id] ?? '').trim().length > 0);

  /** What the fields hold, for every metric the timer does not own. */
  const drafted = (from: ExerciseMetric[]): SetValueInput[] =>
    from.map((metric) =>
      metric.type === 'notes'
        ? { metricId: metric.id, text: draft[metric.id]?.trim() || null }
        : { metricId: metric.id, num: toNullableFloat(draft[metric.id] ?? '') },
    );

  /**
   * The one write path, shared by the Save button and the hold timer.
   *
   * The write completes before anything is cleared or navigated, so a
   * force-quit between the tap and the screen changing loses nothing.
   */
  const commit = (values: SetValueInput[]) => {
    setSaving(true);

    return logSet(entryId, values, toFailure)
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

  const save = () => {
    if (saving || !recordsSomething) {
      return;
    }

    void commit(drafted(metrics));
  };

  /**
   * §7.2 — the logging UI is decided by the primary metric, the one the editor
   * labels `Logged first`. A duration on top gives the timer; anything else
   * gives the fields below.
   *
   * The remaining metrics keep their fields either way, because a weighted ring
   * support hold is a duration *and* an added load, and the timer only owns the
   * duration. Stopping records all of them as one set.
   */
  const timed = primary?.type === 'duration';
  const typed = timed ? metrics.slice(1) : metrics;

  return (
    <View className="gap-lg">
      <SectionLabel>Log a set</SectionLabel>

      {timed && primary ? (
        <HoldTimer
          targetMs={durationTargetMs}
          disabled={saving}
          onComplete={(seconds) =>
            commit([{ metricId: primary.id, num: seconds }, ...drafted(typed)])
          }
        />
      ) : null}

      {typed.map((metric) =>
        metric.type === 'notes' ? (
          <View key={metric.id} className="gap-xs">
            <Text className="text-caption text-text-2">{metric.name}</Text>
            <Input
              value={draft[metric.id] ?? ''}
              onChangeText={set(metric.id)}
              accessibilityLabel={metric.name}
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
              step={
                metric.id === targetMetricId && targetValue
                  ? targetValue
                  : undefined
              }
            />
          </View>
        ),
      )}

      {/*
        §4.2 — a flag on the set, not a metric. Eight clean reps and eight
        grinding reps are different data, and every exercise can say so.

        A pill sized to its own text, not a full-width block. It was the same
        48-tall full-width shape as `Save set` directly beneath it, so two
        controls of very different weight competed on the screen that matters
        most. Still a 48 touch target — this is read at a glance with tired
        hands — but no longer shaped like the main action.
      */}
      <View className="flex-row">
        <Chip
          label="To failure"
          selected={toFailure}
          onPress={() => setToFailure((current) => !current)}
          role="switch"
        />
      </View>

      {/* The timer is the action when there is one; a second one would ask
          which of them records the set. */}
      {timed ? null : (
        <Button
          variant="primary"
          disabled={saving || !recordsSomething}
          onPress={save}
        >
          {/*
            The button names the set it is about to write. `Save set` said what
            the control does; `Save set 4` says which effort this was, which is
            the question FEATURES.md opens with — four exercises deep and
            tired, you cannot remember whether that was your second or third.
            The counter above answers it too, but this answers it at the
            instant of pressing, without moving your eyes.
          */}
          <Text>Save set {nextSetNumber}</Text>
        </Button>
      )}
    </View>
  );
}
