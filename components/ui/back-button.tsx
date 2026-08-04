import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { iconWithClassName } from '@/components/ui/icon';

const BackIcon = iconWithClassName(ChevronLeft);

/**
 * The way back off a pushed screen. §9's 48×48 floor is met by the padding
 * around the glyph rather than by the 24px glyph itself.
 */
function BackButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={() => router.back()}
      className="ml-md min-h-touch min-w-touch items-center justify-center self-start active:bg-muted"
    >
      <BackIcon size={24} strokeWidth={1.5} className="text-text-2" />
    </Pressable>
  );
}

export { BackButton };
