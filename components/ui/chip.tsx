import { Pressable } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/**
 * A pill-shaped choice. `muted` fill unselected, `surface` with a hairline
 * border selected — DESIGN.md §3.1 makes `muted` the inactive fill, and §9
 * forbids carrying a state difference on colour alone, so weight changes too.
 *
 * Sized to its content by default. Pass `className="flex-1"` for a fixed row of
 * equal-width options, as the metric type selector does.
 */
export function Chip({
  label,
  selected,
  onPress,
  className,
  role = 'radio',
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  className?: string;
  /**
   * `radio` for one of several, `switch` for a flag that stands alone —
   * `to_failure` is the latter, and the two announce differently to a screen
   * reader even though they look identical.
   */
  role?: 'radio' | 'switch';
}) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={
        role === 'switch' ? { checked: selected } : { selected }
      }
      accessibilityLabel={label}
      onPress={onPress}
      className={cn(
        'min-h-touch items-center justify-center rounded-full px-lg',
        selected ? 'border border-border bg-surface' : 'bg-muted',
        className,
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
