import { View } from 'react-native';

import { cn } from '@/lib/utils';

/**
 * The hairline between list rows (DESIGN.md §6.4). Dense lists use bordered
 * rows, not cards, so this is the only separation they get.
 *
 * Inset to the screen padding so the line starts where the text does.
 */
function Separator({ className }: { className?: string }) {
  return <View className={cn('ml-xl border-b border-border', className)} />;
}

export { Separator };
