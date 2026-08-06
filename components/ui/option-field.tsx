import { useMemo } from 'react';
import { View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { SectionLabel } from '@/components/ui/section-label';

/**
 * A field whose value is usually one of the values already in use, but does not
 * have to be.
 *
 * Backs `family` on the exercise form and `unit` in the metric editor. Both
 * were free text, and free text is how `Push-up`, `push up` and `Push Ups`
 * become three families that never group together, or `kg`, `KG` and `Kg`
 * become three units. Nothing catches either — `suggestedExercises` matches on
 * the exact string and units are display-only — so a typo costs a suggestion
 * silently rather than failing.
 *
 * **The input is still the value.** The chips below it are a shortcut, not a
 * constraint: type something new and it is simply new, which is what makes a
 * first-ever family possible without a separate "create" flow. Typing filters
 * the chips, so a long list narrows to the one being reached for.
 */
export function OptionField({
  label,
  value,
  onChange,
  onSelect,
  onBlur,
  options,
  placeholder,
  accessibilityLabel,
  autoCapitalize = 'sentences',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /**
   * Tapping a chip rather than typing. Defaults to `onChange`.
   *
   * A field that commits on blur needs this: choosing a chip never focuses the
   * input, so no blur follows and the write would never happen. The value is
   * passed rather than read from state, which has not updated yet at the point
   * the consumer needs it.
   */
  onSelect?: (value: string) => void;
  onBlur?: () => void;
  options: string[];
  placeholder?: string;
  accessibilityLabel: string;
  autoCapitalize?: 'none' | 'sentences' | 'words';
}) {
  const needle = value.trim().toLowerCase();

  const shown = useMemo(() => {
    /**
     * Once the value *is* one of the options, stop filtering. Otherwise tapping
     * a chip would leave that chip alone on screen and every alternative gone,
     * which reads as having destroyed the list rather than chosen from it.
     */
    const chosen = options.some((option) => option.toLowerCase() === needle);

    if (needle.length === 0 || chosen) {
      return options;
    }

    return options.filter((option) => option.toLowerCase().includes(needle));
  }, [options, needle]);

  return (
    <View className="gap-xs">
      <SectionLabel>{label}</SectionLabel>

      <Input
        value={value}
        onChangeText={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        accessibilityLabel={accessibilityLabel}
        autoCapitalize={autoCapitalize}
      />

      {shown.length > 0 ? (
        <View className="flex-row flex-wrap gap-sm pt-xs">
          {shown.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={option.toLowerCase() === needle}
              onPress={() => (onSelect ?? onChange)(option)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
