import { Check, ChevronDown, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { iconWithClassName } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { SectionLabel } from '@/components/ui/section-label';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { matchesQuery } from '@/lib/search';
import { cn } from '@/lib/utils';

const ChevronIcon = iconWithClassName(ChevronDown);
const CheckIcon = iconWithClassName(Check);
const PlusIcon = iconWithClassName(Plus);

/**
 * Choosing one of a growing list of short strings — `family` on the exercise
 * form, `unit` in the metric editor.
 *
 * **The field is not a text input.** That is the whole point: free text is how
 * `push up`, `Push-Up` and `Push Ups` became three families that never group
 * together, and how `rep`, `reps` and `secund` became three units. Typing
 * happens only inside the sheet, only to filter, and a new value requires
 * pressing Create — so a typo can no longer arrive by accident, only by
 * intent.
 *
 * A wrapping row of chips came first and did not survive contact: families grow
 * and the field became a wall to scroll past. A sheet keeps the form short
 * however long the list gets, and gives the search somewhere to live.
 */
export function PickerField({
  label,
  value,
  onChange,
  options,
  placeholder = 'Choose',
  emptyLabel,
  accessibilityLabel,
}: {
  label: string;
  /** Empty string means nothing chosen — the form state these back is string. */
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  /**
   * Wording for the row that clears the value, when having none is meaningful.
   * A count metric has no unit; an exercise may have no family. Omit to
   * require a choice.
   */
  emptyLabel?: string;
  accessibilityLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View className="gap-xs">
      <SectionLabel>{label}</SectionLabel>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel}: ${value || placeholder}`}
        onPress={() => setOpen(true)}
        className="h-control w-full flex-row items-center justify-between rounded-button bg-muted px-lg active:bg-surface"
      >
        <Text
          className={cn('text-body', value ? 'text-text' : 'text-text-3')}
        >
          {value || placeholder}
        </Text>
        <ChevronIcon size={24} strokeWidth={1.5} className="text-text-3" />
      </Pressable>

      {open ? (
        <Sheet
          label={label}
          value={value}
          options={options}
          emptyLabel={emptyLabel}
          onPick={(next) => {
            onChange(next);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </View>
  );
}

/**
 * Mounted only while open, so the search box starts empty every time rather
 * than holding the last thing typed.
 */
function Sheet({
  label,
  value,
  options,
  emptyLabel,
  onPick,
  onClose,
}: {
  label: string;
  value: string;
  options: string[];
  emptyLabel?: string;
  onPick: (value: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');

  const needle = search.trim().toLowerCase();

  const matches = useMemo(
    () => options.filter((option) => matchesQuery(option, search)),
    [options, search],
  );

  /**
   * Offered only when what was typed is not already there, case-insensitively.
   * Otherwise Create would silently make a second `KG` alongside `kg`, which is
   * the failure this component exists to prevent.
   */
  const creatable =
    search.trim().length > 0 &&
    !options.some((option) => option.toLowerCase() === needle);

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Tapping outside dismisses. The sheet itself swallows the press. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={onClose}
        className="flex-1 justify-end bg-text/40"
      >
        {/*
          Height is left to the content. The scrim above is `flex-1 justify-end`,
          so a long list grows the sheet up to the screen and no further — which
          is what a max-height would have bought, without an arbitrary value.
        */}
        <Pressable
          accessibilityRole="none"
          onPress={() => {}}
          className="gap-md rounded-t-sheet bg-bg px-xl pb-2xl pt-xl"
        >
          <SectionLabel>{label}</SectionLabel>

          <Input
            value={search}
            onChangeText={setSearch}
            placeholder="Search"
            accessibilityLabel={`Search ${label.toLowerCase()}`}
            autoCapitalize="none"
            autoFocus
          />

          <ScrollView keyboardShouldPersistTaps="handled">
            {emptyLabel ? (
              <Row
                label={emptyLabel}
                chosen={value === ''}
                muted
                onPress={() => onPick('')}
              />
            ) : null}

            {matches.map((option) => (
              <View key={option}>
                <Separator />
                <Row
                  label={option}
                  chosen={option === value}
                  onPress={() => onPick(option)}
                />
              </View>
            ))}

            {creatable ? (
              <View>
                <Separator />
                <Row
                  label={`Create “${search.trim()}”`}
                  chosen={false}
                  create
                  onPress={() => onPick(search.trim())}
                />
              </View>
            ) : null}

            {matches.length === 0 && !creatable ? (
              <Text className="pt-lg text-bodySm text-text-2">
                Nothing matches.
              </Text>
            ) : null}
          </ScrollView>

          <Button variant="secondary" onPress={onClose}>
            <Text>Cancel</Text>
          </Button>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Row({
  label,
  chosen,
  muted,
  create,
  onPress,
}: {
  label: string;
  chosen: boolean;
  muted?: boolean;
  create?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: chosen }}
      accessibilityLabel={label}
      onPress={onPress}
      className="min-h-touch flex-row items-center justify-between gap-md active:bg-muted"
    >
      <Text
        className={cn(
          'flex-1 text-body',
          muted ? 'text-text-3' : 'text-text',
          chosen && 'font-sans-semibold',
        )}
      >
        {label}
      </Text>
      {create ? (
        <PlusIcon size={24} strokeWidth={1.5} className="text-text-3" />
      ) : null}
      {chosen ? (
        <CheckIcon size={24} strokeWidth={1.5} className="text-text-2" />
      ) : null}
    </Pressable>
  );
}
