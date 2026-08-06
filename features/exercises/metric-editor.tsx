import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { iconWithClassName } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { PickerField } from '@/components/ui/picker-field';
import { SectionLabel } from '@/components/ui/section-label';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import {
  addMetric,
  deleteMetric,
  moveMetric,
  updateMetric,
} from '@/db/mutations/exercises';
import { distinctUnits, unitsInUse } from '@/db/queries/exercises';
import type { ExerciseMetric } from '@/db/queries/exercises';
import { unitsFor } from '@/lib/units';
import { toNullable } from '@/features/exercises/exercise-form';
import { formatMetricRole, formatMetricType } from '@/lib/format';
import { cn } from '@/lib/utils';

const UpIcon = iconWithClassName(ChevronUp);
const DownIcon = iconWithClassName(ChevronDown);
const DeleteIcon = iconWithClassName(Trash2);

type MetricType = ExerciseMetric['type'];

const TYPES: MetricType[] = ['number', 'duration', 'notes'];

/**
 * Ordered metric configuration. Order is the whole point: the first metric is
 * the primary metric and decides the logging UI in Phase 4 (FEATURES.md §4.1),
 * so moving one is a real edit rather than cosmetics.
 *
 * A metric's type is fixed once created — changing it would reinterpret every
 * value already logged against it. The selector therefore appears only when
 * adding.
 */
export function MetricEditor({
  exerciseId,
  metrics,
}: {
  exerciseId: string;
  metrics: ExerciseMetric[];
}) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [type, setType] = useState<MetricType>('number');

  /**
   * Read once here and passed down rather than queried inside each row — a
   * `useLiveQuery` per metric would be one subscription per row for a list that
   * is identical in all of them. Each row narrows it to its own type.
   */
  const { data: unitRows } = useLiveQuery(distinctUnits());

  /**
   * The form is closed until asked for, and closes again after adding.
   *
   * Left open it reset itself and offered to add a third metric, then a fourth,
   * with no way to say "done" — which read as an unbounded loop rather than as
   * a finished list. There is genuinely nothing to save: each add, reorder and
   * delete commits on its own (see `app/exercise/[id]/edit.tsx`), so the fix is
   * to make the resting state of the screen the metrics themselves. It also
   * gives §4.1's soft cap of four somewhere to be felt.
   */
  const [adding, setAdding] = useState(false);

  const close = () => {
    setAdding(false);
    setName('');
    setUnit('');
    setType('number');
  };

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return;
    }

    void addMetric(exerciseId, {
      name: trimmed,
      type,
      unit: toNullable(unit),
    }).then(close);
  };

  return (
    <View>
      <SectionLabel className="px-xl pb-sm">Metrics</SectionLabel>

      {/*
        This line used to carry the whole explanation — what `Primary` bought
        you, and that targets live on templates — because nothing else on the
        screen said either. It read as documentation and was not understood.

        The rows below now label their own fields and say `Logged first` rather
        than `Primary`, so the caption only has to name the section.
      */}
      <Text className="px-xl pb-md text-bodySm text-text-2">
        What this exercise measures.
      </Text>

      {metrics.map((metric, index) => (
        <View key={metric.id}>
          {index > 0 ? <Separator /> : null}
          {/*
            The keyed wrapper ties each `MetricRow` to one metric, so the
            fields inside it initialise from props once and are never synced
            afterwards. `metrics` is live: a row reading straight from props
            would be reset mid-edit the moment anything else in the table
            changed — reordering a metric below would wipe what was being
            typed above.
          */}
          <MetricRow
            exerciseId={exerciseId}
            metric={metric}
            units={unitsFor(metric.type, unitsInUse(unitRows, metric.type))}
            isFirst={index === 0}
            isLast={index === metrics.length - 1}
          />
        </View>
      ))}

      {metrics.length === 0 ? (
        <Text className="px-xl pb-md text-bodySm text-text-2">
          Nothing is recorded for this exercise yet. Add what it should track.
        </Text>
      ) : null}

      {!adding ? (
        <View className="px-xl pt-xl">
          <Button variant="secondary" onPress={() => setAdding(true)}>
            <Text>Add a metric</Text>
          </Button>
        </View>
      ) : (
        <View className="gap-md px-xl pt-xl">
          <SectionLabel>Add a metric</SectionLabel>

          {/*
            `Reps` as the name placeholder read as a value already filled in —
            grey placeholder text in a filled box looks like content. Labelling
            the field says what it wants, so the example can go.
          */}
          <View className="gap-xs">
            <SectionLabel>Name</SectionLabel>
            <Input
              value={name}
              onChangeText={setName}
              accessibilityLabel="Name of the new metric"
              autoCapitalize="sentences"
              autoFocus
            />
          </View>

          <View className="gap-xs">
            <SectionLabel>Type</SectionLabel>
            <View className="flex-row gap-sm">
              {TYPES.map((option) => (
                <Chip
                  key={option}
                  label={formatMetricType(option)}
                  selected={type === option}
                  onPress={() => setType(option)}
                  className="flex-1"
                />
              ))}
            </View>
          </View>

          {/*
            Scoped to the type chosen above, so a duration is never offered
            kilograms. A count needs no unit at all — `Reps` is the metric's
            name — which is what `No unit` is for, and it is the default.
          */}
          <PickerField
            label="Unit"
            value={unit}
            onChange={setUnit}
            options={unitsFor(type, unitsInUse(unitRows, type))}
            placeholder="No unit"
            emptyLabel="No unit"
            accessibilityLabel="Unit of the new metric"
          />

          {/*
            Neither of these is `primary`. The exercise's own Save button is
            still on screen above, and §6.1 allows one main action per screen —
            a second accent button here would put the accent in a fourth place
            app-wide, which §3.2 does not permit. Ghost against secondary
            separates them instead.
          */}
          <View className="flex-row gap-md">
            <View className="flex-1">
              <Button variant="ghost" onPress={close} className="w-full">
                <Text>Cancel</Text>
              </Button>
            </View>
            <View className="flex-1">
              <Button
                variant="secondary"
                disabled={name.trim().length === 0}
                onPress={submit}
                className="w-full"
              >
                <Text>Add</Text>
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

/**
 * One metric. Name and unit are fields rather than labels — a typo should cost
 * a keystroke, not a delete, which is the one operation that strands values
 * already logged against the row.
 *
 * Both commit on blur, and the same fields appear in the same order as the
 * form below, so the two read as one thing.
 */
function MetricRow({
  exerciseId,
  metric,
  units,
  isFirst,
  isLast,
}: {
  exerciseId: string;
  metric: ExerciseMetric;
  units: string[];
  isFirst: boolean;
  isLast: boolean;
}) {
  const [name, setName] = useState(metric.name);
  const [unit, setUnit] = useState(metric.unit ?? '');

  const commitName = () => {
    const trimmed = name.trim();

    // A metric has to be called something. An emptied field reverts rather
    // than writing a nameless row.
    if (trimmed.length === 0) {
      setName(metric.name);
      return;
    }

    if (trimmed !== metric.name) {
      void updateMetric(metric.id, { name: trimmed });
    }
  };

  /**
   * Takes the value rather than reading state: choosing from the sheet commits
   * immediately and `setUnit` has not landed at that point. There is no blur to
   * wait for any more — picking is an explicit act, unlike typing.
   */
  const commitUnitValue = (raw: string) => {
    const next = toNullable(raw);

    if (next !== metric.unit) {
      void updateMetric(metric.id, { unit: next });
    }
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

  return (
    <View className="gap-sm px-xl py-md">
      {/*
        Both fields carried an `accessibilityLabel` and nothing visible, so a
        screen reader knew which was the name and which the unit while everyone
        else saw two identical boxes reading `Reps` and `reps`. The screen
        labels NAME, FAMILY and NOTES directly above; half a screen labelling
        its fields is worse than none of it doing so.
      */}
      <View className="gap-xs">
        <SectionLabel>Name</SectionLabel>
        <Input
          value={name}
          onChangeText={setName}
          onBlur={commitName}
          accessibilityLabel={`Name of ${metric.name}`}
          autoCapitalize="sentences"
        />
      </View>

      <PickerField
        label="Unit"
        value={unit}
        onChange={(next) => {
          setUnit(next);
          commitUnitValue(next);
        }}
        options={units}
        placeholder="No unit"
        emptyLabel="No unit"
        accessibilityLabel={`Unit of ${metric.name}`}
      />

      <View className="flex-row items-center gap-md">
        <Text className="flex-1 text-caption text-text-2">
          {formatMetricRole(metric.type, isFirst)}
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
