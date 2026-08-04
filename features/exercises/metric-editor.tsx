import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { iconWithClassName } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { SectionLabel } from '@/components/ui/section-label';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import {
  addMetric,
  deleteMetric,
  moveMetric,
  updateMetric,
} from '@/db/mutations/exercises';
import type { ExerciseMetric } from '@/db/queries/exercises';
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

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return;
    }

    void addMetric(exerciseId, {
      name: trimmed,
      type,
      unit: toNullable(unit),
    }).then(() => {
      setName('');
      setUnit('');
      setType('number');
    });
  };

  return (
    <View>
      <SectionLabel className="px-xl pb-sm">Metrics</SectionLabel>

      {/*
        Order and targets are the two things this screen cannot show on its own.
        `Primary` means nothing until you know it decides the logging UI, and
        the absence of a target field reads as an omission rather than a
        decision. Said here, where the arrows are, and nowhere else.
      */}
      <Text className="px-xl pb-md text-bodySm text-text-2">
        The first metric drives logging: a duration metric on top gives a
        stopwatch instead of fields to type into. Targets belong to templates,
        not here.
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

      <View className="gap-md px-xl pt-xl">
        <SectionLabel>Add a metric</SectionLabel>

        <Input
          value={name}
          onChangeText={setName}
          placeholder="Reps"
          autoCapitalize="sentences"
        />

        <View className="flex-row gap-sm">
          {TYPES.map((option) => (
            <TypeChip
              key={option}
              label={formatMetricType(option)}
              selected={type === option}
              onPress={() => setType(option)}
            />
          ))}
        </View>

        <Input
          value={unit}
          onChangeText={setUnit}
          placeholder="Unit — reps, kg, s"
          autoCapitalize="none"
        />

        <Button
          variant="secondary"
          disabled={name.trim().length === 0}
          onPress={submit}
        >
          <Text>Add metric</Text>
        </Button>
      </View>
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
  isFirst,
  isLast,
}: {
  exerciseId: string;
  metric: ExerciseMetric;
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

  const commitUnit = () => {
    const next = toNullable(unit);

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
      <Input
        value={name}
        onChangeText={setName}
        onBlur={commitName}
        accessibilityLabel={`Name of ${metric.name}`}
        autoCapitalize="sentences"
      />
      <Input
        value={unit}
        onChangeText={setUnit}
        onBlur={commitUnit}
        accessibilityLabel={`Unit of ${metric.name}`}
        placeholder="Unit — reps, kg, s"
        autoCapitalize="none"
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

/**
 * §3.1 names `muted` as the inactive chip fill, so selection cannot be shown by
 * making the chosen one muted. It reads as `surface` against the fill, carried
 * by weight as well — §9 forbids colour alone.
 */
function TypeChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      className={cn(
        'min-h-touch flex-1 items-center justify-center rounded-full px-lg',
        selected ? 'border border-border bg-surface' : 'bg-muted',
      )}
    >
      <Text
        className={cn(
          'text-bodySm',
          selected ? 'font-sans-semibold text-text' : 'text-text-2',
        )}
      >
        {label}
      </Text>
    </Pressable>
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
