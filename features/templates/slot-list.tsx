import { router } from 'expo-router';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react-native';
import { Alert, Pressable, View } from 'react-native';

import { iconWithClassName } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { moveSlot, removeSlot } from '@/db/mutations/templates';
import type { Exercise, ExerciseMetric } from '@/db/queries/exercises';
import type { TemplateSlot } from '@/db/queries/templates';
import { formatTarget } from '@/lib/format';
import { cn } from '@/lib/utils';

const UpIcon = iconWithClassName(ChevronUp);
const DownIcon = iconWithClassName(ChevronDown);
const RemoveIcon = iconWithClassName(Trash2);

/**
 * The exercises in a template, in the order they are trained.
 *
 * This `display_order` is not the one on `exercise_metrics`. That one decides
 * which measurement is primary within a single exercise; this one decides what
 * you do first. Same column name, same arithmetic in `db/mutations/ordering.ts`,
 * unrelated meanings.
 */
export function SlotList({
  templateId,
  slots,
  exercisesById,
  metricsById,
}: {
  templateId: string;
  slots: TemplateSlot[];
  exercisesById: Map<string, Exercise>;
  metricsById: Map<string, ExerciseMetric>;
}) {
  if (slots.length === 0) {
    return (
      <Text className="px-xl text-bodySm text-text-2">
        No exercises yet. A template is the order you train them in.
      </Text>
    );
  }

  return (
    <View>
      {slots.map((slot, index) => (
        <View key={slot.id}>
          {index > 0 ? <Separator /> : null}
          <SlotRow
            templateId={templateId}
            slot={slot}
            exercise={exercisesById.get(slot.exerciseId)}
            targetMetric={
              slot.targetMetricId
                ? metricsById.get(slot.targetMetricId)
                : undefined
            }
            isFirst={index === 0}
            isLast={index === slots.length - 1}
          />
        </View>
      ))}
    </View>
  );
}

function SlotRow({
  templateId,
  slot,
  exercise,
  targetMetric,
  isFirst,
  isLast,
}: {
  templateId: string;
  slot: TemplateSlot;
  exercise: Exercise | undefined;
  targetMetric: ExerciseMetric | undefined;
  isFirst: boolean;
  isLast: boolean;
}) {
  // The exercise was deleted after the slot was written. Removing the slot
  // silently would be editing the template on the user's behalf, so it stays
  // and says what happened.
  const name = exercise?.name ?? 'Deleted exercise';

  const confirmRemove = () => {
    Alert.alert(`Remove ${name}?`, 'The template changes; history does not.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => void removeSlot(templateId, slot.id),
      },
    ]);
  };

  return (
    <View className="min-h-row flex-row items-center gap-md px-xl py-md">
      {/*
        Only the label opens the target editor. The whole row cannot be
        pressable when three of its own controls sit inside it.
      */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Targets for ${name}`}
        onPress={() =>
          router.push({ pathname: '/slot/[id]', params: { id: slot.id } })
        }
        className="min-h-touch flex-1 justify-center active:bg-muted"
      >
        <Text
          className={cn(
            'text-heading',
            // §9 forbids colour alone, so weight carries the difference too.
            // No italic: `fontStyle` is off in the Tailwind config because no
            // italic face is bundled.
            exercise ? 'font-sans-semibold text-text' : 'font-sans text-text-3',
          )}
        >
          {name}
        </Text>
        <Text className="pt-xs text-caption text-text-2">
          {formatTarget(slot, targetMetric)}
        </Text>
      </Pressable>

      <IconButton
        label={`Move ${name} up`}
        disabled={isFirst}
        onPress={() => void moveSlot(templateId, slot.id, 'up')}
      >
        <UpIcon size={24} strokeWidth={1.5} className="text-text-2" />
      </IconButton>
      <IconButton
        label={`Move ${name} down`}
        disabled={isLast}
        onPress={() => void moveSlot(templateId, slot.id, 'down')}
      >
        <DownIcon size={24} strokeWidth={1.5} className="text-text-2" />
      </IconButton>
      <IconButton label={`Remove ${name}`} onPress={confirmRemove}>
        <RemoveIcon size={24} strokeWidth={1.5} className="text-text-3" />
      </IconButton>
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
