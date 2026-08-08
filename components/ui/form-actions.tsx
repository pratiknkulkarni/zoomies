import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

/**
 * The action row that ends a **draft screen** (FEATURES.md §18, Pattern A).
 *
 * One component rather than a pair of buttons per screen, so the answer to "how
 * do I leave this screen" is identical everywhere. The complaint this phase
 * came from was not really that a Save button was missing — it was that each
 * screen had to be learned before you knew how to leave it.
 *
 * Discard sits left and Save right, matching the confirmation `useDraftExit`
 * raises, so the two never disagree about which side is which.
 *
 * Save is the screen's one `primary` (DESIGN.md §10) and is disabled until
 * there is something to save, which also makes "is this dirty" visible without
 * a word of copy.
 */
export function FormActions({
  onDiscard,
  onSave,
  dirty,
  valid = true,
  saveLabel = 'Save',
}: {
  onDiscard: () => void;
  onSave: () => void;
  dirty: boolean;
  /** False when a required field is empty — a name that must not be blank. */
  valid?: boolean;
  saveLabel?: string;
}) {
  return (
    <View className="flex-row gap-md">
      <View className="flex-1">
        <Button
          variant="secondary"
          className="w-full"
          disabled={!dirty}
          onPress={onDiscard}
        >
          <Text>Discard</Text>
        </Button>
      </View>
      <View className="flex-1">
        <Button variant="primary" disabled={!dirty || !valid} onPress={onSave}>
          <Text>{saveLabel}</Text>
        </Button>
      </View>
    </View>
  );
}

/**
 * The action row that ends an **action screen** (Pattern B) — one control that
 * means "I am finished here".
 *
 * There is no Discard, deliberately. Everything on such a screen has already
 * committed, and undoing a reorder or a delete is an undo stack rather than a
 * discarded draft. Stating that plainly beats a Discard button that only
 * sometimes means what it says.
 */
export function DoneAction({
  onPress,
  label = 'Done',
}: {
  onPress: () => void;
  label?: string;
}) {
  return (
    <Button variant="secondary" className="w-full" onPress={onPress}>
      <Text>{label}</Text>
    </Button>
  );
}
