import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/**
 * A qualifier on the thing beside it — `TO FAILURE` on a set, `ONE-OFF` on a
 * quick log in the timeline.
 *
 * 11px uppercase mono in a 1px box (DESIGN.md §6.9). Boxed rather than coloured
 * because there is no colour to reach for, and boxed rather than merely
 * uppercase because these sit inline against figures that are also mono — the
 * rule is what separates a qualifier from a value.
 *
 * **Never a headline.** It qualifies what it sits next to and is read second,
 * so it takes no space in the layout when it is absent and never begins a line.
 *
 * `quiet` drops it a step of ink, for a tag that classifies rather than warns:
 * `TO FAILURE` is something you did, `ONE-OFF` is only what kind of row this
 * is.
 */
function Tag({
  children,
  quiet = false,
  className,
}: {
  children: string;
  quiet?: boolean;
  className?: string;
}) {
  return (
    <View
      className={cn(
        'self-start rounded-button border px-xs py-0',
        quiet ? 'border-rule' : 'border-border',
        className,
      )}
    >
      <Text
        className={cn(
          'font-mono text-label uppercase tracking-label',
          quiet ? 'text-text-4' : 'text-text-2',
        )}
      >
        {children}
      </Text>
    </View>
  );
}

export { Tag };
