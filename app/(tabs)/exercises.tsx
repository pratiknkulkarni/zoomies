import { Text } from 'react-native';

import { Screen } from '@/components/ui/screen';

export default function ExercisesScreen() {
  return (
    <Screen>
      <Text className="pt-xl text-display font-sans-semibold text-text">
        Exercises
      </Text>
      <Text className="pt-sm text-bodySm font-sans text-text-2">
        The exercise library is built in Phase 2.
      </Text>
    </Screen>
  );
}
