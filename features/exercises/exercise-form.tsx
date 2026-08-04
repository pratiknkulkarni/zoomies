import { View } from 'react-native';

import { Input } from '@/components/ui/input';
import { SectionLabel } from '@/components/ui/section-label';

export type ExerciseFormValues = {
  name: string;
  family: string;
  notes: string;
};

export const EMPTY_EXERCISE: ExerciseFormValues = {
  name: '',
  family: '',
  notes: '',
};

/**
 * The fields an exercise owns, shared by create and edit so the two cannot
 * drift apart.
 *
 * Values are held as strings and converted at the edge: an empty field is not
 * recorded, and `null` is what not-recorded means in the database.
 */
export function ExerciseForm({
  values,
  onChange,
}: {
  values: ExerciseFormValues;
  onChange: (values: ExerciseFormValues) => void;
}) {
  const set = (key: keyof ExerciseFormValues) => (text: string) =>
    onChange({ ...values, [key]: text });

  return (
    <View className="gap-lg">
      <View className="gap-xs">
        <SectionLabel>Name</SectionLabel>
        <Input
          value={values.name}
          onChangeText={set('name')}
          placeholder="Front Lever (Tuck)"
          autoCapitalize="words"
        />
      </View>

      <View className="gap-xs">
        <SectionLabel>Family</SectionLabel>
        <Input
          value={values.family}
          onChangeText={set('family')}
          placeholder="front_lever"
          autoCapitalize="none"
        />
      </View>

      <View className="gap-xs">
        <SectionLabel>Notes</SectionLabel>
        <Input
          value={values.notes}
          onChangeText={set('notes')}
          placeholder="Cues, setup, anything worth remembering"
          multiline
          className="h-auto min-h-field py-md"
        />
      </View>
    </View>
  );
}

/** Empty means not recorded, which is null — never an empty string. */
export function toNullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
