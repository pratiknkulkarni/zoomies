import { Minus, Plus } from 'lucide-react-native';
import { Pressable, TextInput, View } from 'react-native';

import { iconWithClassName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const MinusIcon = iconWithClassName(Minus);
const PlusIcon = iconWithClassName(Plus);

/**
 * DESIGN.md §6.2 — height 56, `muted` fill, radius 12, the figure centred in
 * `metric` with its unit in `text-2` beside it, steppers flanking.
 *
 * **The steppers are the point.** Tapping one must never require precision,
 * because this is used with tired hands in low light, so they are 56 square
 * rather than the 48 floor §9 sets for everything else. The keyboard is there
 * when a number is far away; the steppers are there when it is one off.
 */
function NumericField({
  value,
  onChangeText,
  unit,
  step = 1,
  accessibilityLabel,
  keyboardType = 'number-pad',
  placeholder = '—',
}: {
  value: string;
  /**
   * Accepts an updater, and the steppers always use one.
   *
   * Reading `value` from props to compute the next number loses taps: two that
   * land in the same render both see the old figure and write the same result.
   * Nine rapid taps produced 5. Deriving from the freshest value instead means
   * a fast double-tap adds two, which is how a stepper has to behave for hands
   * that are tired.
   */
  onChangeText: (next: string | ((current: string) => string)) => void;
  unit?: string | null;
  /** Reps move by 1; a load in kg is more useful in halves or 2.5s. */
  step?: number;
  accessibilityLabel: string;
  keyboardType?: 'number-pad' | 'decimal-pad';
  placeholder?: string;
}) {
  const nudge = (by: number) => {
    onChangeText((current) => {
      const parsed = Number(current.trim());
      const base =
        Number.isFinite(parsed) && current.trim().length > 0 ? parsed : 0;
      const next = base + by;

      // Nothing recorded here is ever negative — no rep count, no hold, no
      // added load. Clamping beats letting a stepper produce a value that
      // cannot mean anything.
      if (next < 0) {
        return current;
      }

      // Avoids 12.300000000000001 from repeated fractional steps.
      return String(Math.round(next * 100) / 100);
    });
  };

  return (
    <View className="flex-row items-center gap-sm">
      <Stepper
        label={`Decrease ${accessibilityLabel}`}
        onPress={() => nudge(-step)}
      >
        <MinusIcon size={24} strokeWidth={1.5} className="text-text-2" />
      </Stepper>

      <View className="h-field flex-1 flex-row items-center justify-center gap-sm rounded-button bg-muted px-md">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          accessibilityLabel={accessibilityLabel}
          keyboardType={keyboardType}
          placeholder={placeholder}
          selectTextOnFocus
          className="min-w-touch text-center font-mono text-metric text-text placeholder:text-text-3"
        />
        {unit ? <Text className="text-bodySm text-text-2">{unit}</Text> : null}
      </View>

      <Stepper
        label={`Increase ${accessibilityLabel}`}
        onPress={() => nudge(step)}
      >
        <PlusIcon size={24} strokeWidth={1.5} className="text-text-2" />
      </Stepper>
    </View>
  );
}

function Stepper({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={cn(
        'h-field w-field items-center justify-center rounded-button',
        'bg-muted active:scale-press active:bg-surface',
      )}
    >
      {children}
    </Pressable>
  );
}

export { NumericField };
