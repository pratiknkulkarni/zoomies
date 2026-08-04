import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { iconWithClassName } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { SectionLabel } from '@/components/ui/section-label';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { addMetric, deleteMetric, moveMetric } from '@/db/mutations/exercises';
import type { ExerciseMetric } from '@/db/queries/exercises';
import { formatMetricDetail, formatMetricType } from '@/lib/format';
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

  const confirmDelete = (metric: ExerciseMetric) => {
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

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return;
    }

    void addMetric(exerciseId, {
      name: trimmed,
      type,
      unit: unit.trim().length > 0 ? unit.trim() : null,
    }).then(() => {
      setName('');
      setUnit('');
      setType('number');
    });
  };

  return (
    <View>
      <SectionLabel className="px-xl pb-sm">Metrics</SectionLabel>

      {metrics.map((metric, index) => (
        <View key={metric.id}>
          {index > 0 ? <Separator /> : null}
          <View className="min-h-row flex-row items-center gap-md px-xl py-md">
            <View className="flex-1">
              <Text className="font-sans-semibold text-heading text-text">
                {metric.name}
              </Text>
              <Text className="pt-xs text-caption text-text-2">
                {formatMetricDetail(metric, index === 0)}
              </Text>
            </View>

            <IconButton
              label={`Move ${metric.name} up`}
              disabled={index === 0}
              onPress={() => void moveMetric(exerciseId, metric.id, 'up')}
            >
              <UpIcon size={24} strokeWidth={1.5} className="text-text-2" />
            </IconButton>
            <IconButton
              label={`Move ${metric.name} down`}
              disabled={index === metrics.length - 1}
              onPress={() => void moveMetric(exerciseId, metric.id, 'down')}
            >
              <DownIcon size={24} strokeWidth={1.5} className="text-text-2" />
            </IconButton>
            <IconButton
              label={`Remove ${metric.name}`}
              onPress={() => confirmDelete(metric)}
            >
              <DeleteIcon size={24} strokeWidth={1.5} className="text-text-3" />
            </IconButton>
          </View>
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
