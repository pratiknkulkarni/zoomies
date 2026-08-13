import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { FormActions } from '@/components/ui/form-actions';
import { iconWithClassName } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { SectionLabel } from '@/components/ui/section-label';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import {
  addMetric,
  convertMetric,
  deleteMetric,
  moveMetric,
  updateMetric,
} from '@/db/mutations/exercises';
import {
  metricsWithValues,
  toMetricIdSet,
  type ExerciseMetric,
} from '@/db/queries/exercises';
import {
  describeMeasure,
  presetFor,
  presetsNotOn,
  type MetricPreset,
} from '@/lib/metrics';
import { cn } from '@/lib/utils';

const UpIcon = iconWithClassName(ChevronUp);
const DownIcon = iconWithClassName(ChevronDown);
const DeleteIcon = iconWithClassName(Trash2);

/**
 * What an exercise records, in the order it is logged.
 *
 * **A metric is chosen whole, never composed.** This screen used to offer name,
 * type and unit as three separate fields, which asked the user to know that a
 * count is a `number` with no unit while a load is a `number` with `kg`. It
 * produced reps measured in kilograms, and three rounds of fixes to the unit
 * list each addressed a symptom. `lib/metrics.ts` holds the four things an
 * exercise can record; picking one settles all three columns at once.
 *
 * Order is the whole point of the arrows: the first metric decides the logging
 * UI (FEATURES.md §4.1), which is why its caption says `Logged first`.
 */
export function MetricEditor({
  exerciseId,
  metrics,
  onPendingRename,
}: {
  exerciseId: string;
  metrics: ExerciseMetric[];
  /**
   * Passes an unsaved rename up to the screen's exit guard. Adding, reordering
   * and removing need no such channel — they are already on disk by the time
   * the hand leaves the button.
   */
  onPendingRename: (metricId: string, name: string | null) => void;
}) {
  const [adding, setAdding] = useState(false);

  /**
   * Rooted at `set_metric_values`, so logging the first set against a metric
   * locks it live rather than on the next visit.
   */
  const { data: valueRows } = useLiveQuery(metricsWithValues());
  const logged = toMetricIdSet(valueRows);

  const unused = presetsNotOn(metrics);

  const add = (preset: MetricPreset) => {
    void addMetric(exerciseId, {
      name: preset.name,
      type: preset.type,
      unit: preset.unit,
    }).then(() => setAdding(false));
  };

  return (
    <View>
      <SectionLabel className="px-2xl pb-sm">Metrics</SectionLabel>

      <Text className="px-2xl pb-md text-bodySm text-text-2">
        What this exercise measures.
      </Text>

      {metrics.map((metric, index) => (
        <View key={metric.id}>
          {index > 0 ? <Separator /> : null}
          {/*
            Keyed on the metric so the name field initialises from props once
            and is never synced afterwards. `metrics` is live: a field reading
            straight from props would be reset mid-edit the moment anything
            else in the table changed.
          */}
          <MetricRow
            metric={metric}
            exerciseId={exerciseId}
            isLogged={logged.has(metric.id)}
            isFirst={index === 0}
            isLast={index === metrics.length - 1}
            /*
              What this row may become: everything the *other* metrics do not
              already record, plus its own. Offering all three let an exercise
              holding Reps and Notes convert the Notes into a second Reps —
              `presetsNotOn` had always guarded the add list and nothing
              guarded this one.
            */
            choices={presetsNotOn(
              metrics.filter((other) => other.id !== metric.id),
            )}
            onPendingRename={onPendingRename}
          />
        </View>
      ))}

      {metrics.length === 0 ? (
        <Text className="px-2xl pb-md text-bodySm text-text-2">
          Nothing is recorded for this exercise yet.
        </Text>
      ) : null}

      {!adding ? (
        <View className="px-2xl pt-2xl">
          <Button
            variant="secondary"
            disabled={unused.length === 0}
            onPress={() => setAdding(true)}
          >
            <Text>
              {unused.length === 0 ? 'Records everything' : 'Add a metric'}
            </Text>
          </Button>
        </View>
      ) : (
        <View className="gap-md px-2xl pt-2xl">
          <SectionLabel>Add a metric</SectionLabel>

          {unused.map((preset) => (
            <Pressable
              key={preset.key}
              accessibilityRole="button"
              accessibilityLabel={`${preset.name}, ${preset.measure}`}
              onPress={() => add(preset)}
              className="min-h-touch flex-row items-baseline gap-md rounded-button bg-muted px-lg py-md active:bg-surface"
            >
              <Text className="flex-1 text-body text-text">{preset.name}</Text>
              <Text className="text-caption text-text-2">{preset.measure}</Text>
            </Pressable>
          ))}

          <Button variant="ghost" onPress={() => setAdding(false)}>
            <Text>Cancel</Text>
          </Button>
        </View>
      )}
    </View>
  );
}

/**
 * One metric. The name is a field because a typo should cost a correction
 * rather than a delete, and because `Hold (left)` is a useful thing to write.
 *
 * What it measures is not a field. It is chosen from the same four options that
 * created it, and only until something has been logged against it.
 */
function MetricRow({
  metric,
  exerciseId,
  isLogged,
  isFirst,
  isLast,
  choices,
  onPendingRename,
}: {
  metric: ExerciseMetric;
  exerciseId: string;
  isLogged: boolean;
  isFirst: boolean;
  isLast: boolean;
  /** What it may become — its own measure, plus whatever no sibling holds. */
  choices: MetricPreset[];
  /** Reports an unsaved rename upward, or `null` once there is none. */
  onPendingRename: (metricId: string, name: string | null) => void;
}) {
  const [name, setName] = useState(metric.name);

  const trimmed = name.trim();
  const dirty = trimmed !== metric.name;
  // A metric has to be called something, so an empty field never saves.
  const valid = trimmed.length > 0;

  /**
   * The name is the one drafted field on an otherwise immediate surface (§18),
   * so it carries its own Save rather than writing per keystroke.
   *
   * It reports upward while unsaved. A rename left pending is small, but it is
   * still work typed and not kept, and the screen's guard can only ask about it
   * if it knows — a draft nobody tracks is a draft silently thrown away, which
   * is the whole complaint this phase came from.
   */
  useEffect(() => {
    onPendingRename(metric.id, dirty && valid ? trimmed : null);
  }, [metric.id, dirty, valid, trimmed, onPendingRename]);

  // Cleared on unmount, so a removed row leaves nothing pending behind it.
  useEffect(
    () => () => onPendingRename(metric.id, null),
    [metric.id, onPendingRename],
  );

  const saveName = () => {
    if (!valid) {
      return;
    }

    void updateMetric(metric.id, { name: trimmed });
  };

  const confirmDelete = () => {
    Alert.alert(
      `Remove ${metric.name}?`,
      'Values already logged against it are kept and stay readable.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => void deleteMetric(exerciseId, metric.id),
        },
      ],
    );
  };

  const current = presetFor(metric);

  return (
    <View className="gap-sm px-2xl py-md">
      <View className="gap-xs">
        <SectionLabel>Name</SectionLabel>
        <Input
          value={name}
          onChangeText={setName}
          accessibilityLabel={`Name of ${metric.name}`}
          autoCapitalize="sentences"
        />
        {dirty ? (
          <View className="pt-sm">
            <FormActions
              dirty={dirty}
              valid={valid}
              onDiscard={() => setName(metric.name)}
              onSave={saveName}
              saveLabel="Save name"
            />
          </View>
        ) : null}
      </View>

      <View className="gap-xs">
        <SectionLabel>Measures</SectionLabel>

        {isLogged ? (
          <>
            <Text className="text-body text-text">
              {describeMeasure(metric)}
            </Text>
            {/*
              §4.1 — `set_metric_values` stores a bare number, and this metric's
              type and unit are the only record of what it meant. Converting now
              would turn every logged hold into kilograms.
            */}
            <Text className="text-caption text-text-2">
              Fixed, because sets have been logged against it. Removing it keeps
              them.
            </Text>
          </>
        ) : (
          <View className="flex-row flex-wrap gap-sm">
            {choices.map((preset) => (
              <Chip
                key={preset.key}
                label={preset.name}
                selected={preset.key === current?.key}
                onPress={() => void convertMetric(metric.id, preset)}
              />
            ))}
          </View>
        )}
      </View>

      <View className="flex-row items-center gap-md">
        {/*
          Only the position. What it measures is stated above, in its own
          labelled section — repeating it here is what made the old
          `Primary · Number` caption read as jargon.
        */}
        <Text className="flex-1 text-caption text-text-2">
          {isFirst ? 'Logged first' : ''}
        </Text>

        <IconButton
          label={`Move ${metric.name} up`}
          disabled={isFirst}
          onPress={() => void moveMetric(exerciseId, metric.id, 'up')}
        >
          <UpIcon size={24} strokeWidth={1.5} className="text-text-2" />
        </IconButton>
        <IconButton
          label={`Move ${metric.name} down`}
          disabled={isLast}
          onPress={() => void moveMetric(exerciseId, metric.id, 'down')}
        >
          <DownIcon size={24} strokeWidth={1.5} className="text-text-2" />
        </IconButton>
        <IconButton label={`Remove ${metric.name}`} onPress={confirmDelete}>
          <DeleteIcon size={24} strokeWidth={1.5} className="text-text-3" />
        </IconButton>
      </View>
    </View>
  );
}

function IconButton({
  label,
  onPress,
  disabled,
  children,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled ?? false }}
      disabled={disabled}
      onPress={onPress}
      className={cn(
        'min-h-touch min-w-touch items-center justify-center active:bg-muted',
        disabled && 'opacity-50',
      )}
    >
      {children}
    </Pressable>
  );
}
