import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type ListRowProps = {
  title: string;
  /** Metadata beneath the title — family, metric summary. */
  subtitle?: string;
  /** Right-aligned slot: a counter, a control, an icon. */
  trailing?: ReactNode;
  onPress?: () => void;
  /**
   * `suggested` is the lighter tone of FEATURES.md §3.3 — catalogue exercises
   * the user does not own yet. Weight and colour, never colour alone (§9).
   */
  tone?: 'default' | 'suggested';
  className?: string;
};

/**
 * DESIGN.md §6.4. Minimum height 56, `heading` for the name, `caption` in
 * `text-2` beneath it.
 *
 * Carries its own horizontal padding so lists can be full-bleed and let the
 * separator run to the edge — use it inside `<Screen bleed>`.
 */
function ListRow({
  title,
  subtitle,
  trailing,
  onPress,
  tone = 'default',
  className,
}: ListRowProps) {
  const body = (
    <View
      className={cn(
        'min-h-row flex-row items-center gap-md px-2xl py-md',
        className,
      )}
    >
      <View className="flex-1">
        <Text
          className={cn(
            'text-heading',
            tone === 'suggested'
              ? 'font-sans text-text-2'
              : 'font-sans-semibold text-text',
          )}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text className="pt-xs text-caption text-text-2">{subtitle}</Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );

  if (!onPress) {
    return body;
  }

  return (
    <Pressable onPress={onPress} className="active:bg-muted">
      {body}
    </Pressable>
  );
}

export { ListRow };
