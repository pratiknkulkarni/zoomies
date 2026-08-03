import { Text } from 'react-native';

import { Screen } from '@/components/ui/screen';

export default function HistoryScreen() {
  return (
    <Screen>
      <Text className="pt-xl text-display font-sans-semibold text-text">
        History
      </Text>
      <Text className="pt-sm text-bodySm font-sans text-text-2">
        Completed sessions appear here from Phase 7.
      </Text>
    </Screen>
  );
}
