import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

type EmptyStateProps = {
  /** Names the space. Not an apology, and never "Nothing here yet." */
  title: string;
  body: string;
  action?: { label: string; onPress: () => void };
};

/**
 * DESIGN.md §6.5 — one `heading` line, one `bodySm` line in `text-2`, one
 * `secondary` button. No illustration; §8 cuts it rather than deferring it.
 */
function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <View className="items-start gap-sm py-2xl">
      <Text className="font-sans-semibold text-heading text-text">{title}</Text>
      <Text className="text-bodySm text-text-2">{body}</Text>
      {action ? (
        <Button variant="secondary" onPress={action.onPress} className="mt-md">
          <Text>{action.label}</Text>
        </Button>
      ) : null}
    </View>
  );
}

export { EmptyState };
