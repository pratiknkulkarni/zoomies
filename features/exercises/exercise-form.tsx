import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { View } from 'react-native';

import { Input } from '@/components/ui/input';
import { PickerField } from '@/components/ui/picker-field';
import { SectionLabel } from '@/components/ui/section-label';
import { distinctFamilies, toOptions } from '@/db/queries/exercises';

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

  // Live, so a family invented on this screen is offered on the next one
  // without a refetch.
  const { data: familyRows } = useLiveQuery(distinctFamilies());
  const families = toOptions(familyRows);

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

      <PickerField
        label="Family"
        value={values.family}
        onChange={set('family')}
        options={families}
        placeholder="Choose a family"
        emptyLabel="No family"
        accessibilityLabel="Family"
      />

      <View className="gap-xs">
        <SectionLabel>Notes</SectionLabel>
        {/*
          One line at 360dp. React Native sizes a multiline TextInput from its
          content, never its placeholder, so an empty field stays at
          `min-h-field` and anything that wraps to a second line is clipped
          mid-word. Raising the minimum instead would leave every empty notes
          field oversized for the sake of text that vanishes on first keypress.
        */}
        <Input
          value={values.notes}
          onChangeText={set('notes')}
          placeholder="Cues and setup"
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
