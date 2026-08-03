import { Text } from 'react-native';

import { Screen } from '@/components/ui/screen';

export default function HomeScreen() {
  return (
    <Screen>
      <Text className="pt-xl text-display font-sans-semibold text-text">
        Home
      </Text>
      <Text className="pt-sm text-bodySm font-sans text-text-2">
        The dashboard is built in Phase 9.
      </Text>
    </Screen>
  );
}
