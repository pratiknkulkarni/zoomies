import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Check } from 'lucide-react-native';
import { colorScheme } from 'nativewind';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { iconWithClassName } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { SectionLabel } from '@/components/ui/section-label';
import { Text } from '@/components/ui/text';
import { setAppearance } from '@/db/mutations/settings';
import { readAllTables, schemaVersion } from '@/db/queries/export';
import { appearanceRow } from '@/db/queries/settings';
import {
  APPEARANCES,
  APPEARANCE_CAPTIONS,
  APPEARANCE_LABELS,
  parseAppearance,
  type Appearance,
} from '@/lib/appearance';
import {
  buildExport,
  describeExport,
  exportFileName,
  serialiseExport,
} from '@/lib/export';

const CheckIcon = iconWithClassName(Check);

/**
 * Settings (FEATURES.md §12 and §13).
 *
 * ```
 * ← Settings
 *
 * APPEARANCE
 * System   ✓        Follows your phone, and changes with it.
 * Light
 * Dark
 *
 * BACKUP
 * With no sync, an export is the only copy of your training
 * that is not on this phone.
 * [ Export everything ]
 * ```
 *
 * **Two things, and one of them is not a preference.** Export is here because
 * there is nowhere else it belongs and it must be findable — with no cloud in
 * v1 it is the only backup, and a backup nobody can find is not one.
 *
 * **Immediate actions, not a draft** (§18 Pattern B). Choosing an appearance
 * applies and commits on the tap; there is no Save, and so the screen ends with
 * nothing to leave unsaved. The Back button is the only way out and needs no
 * guard.
 */
export default function SettingsScreen() {
  const { data: rows } = useLiveQuery(appearanceRow());
  const current = parseAppearance(rows.at(0)?.value);

  return (
    <Screen bleed>
      <ScrollView contentContainerClassName="pb-3xl">
        <View className="flex-row items-center gap-md pr-2xl">
          <BackButton />
          <Text className="flex-1 font-sans-semibold text-display text-text">
            Settings
          </Text>
        </View>

        <View className="pt-xl">
          <SectionLabel className="px-2xl pb-sm">Appearance</SectionLabel>
          {APPEARANCES.map((option) => (
            <AppearanceRow
              key={option}
              option={option}
              selected={option === current}
            />
          ))}
        </View>

        <Backup />
      </ScrollView>
    </Screen>
  );
}

/**
 * One choice. A tick rather than a radio: `DESIGN.md` §6 has no radio, and a
 * tick beside the chosen row is the same statement with one mark instead of
 * three.
 */
function AppearanceRow({
  option,
  selected,
}: {
  option: Appearance;
  selected: boolean;
}) {
  const caption = APPEARANCE_CAPTIONS[option];

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={APPEARANCE_LABELS[option]}
      onPress={() => {
        /*
          Applied before it is stored, and deliberately in that order. The theme
          is what the tap was for, and it should not wait on a disk write; the
          row is what makes it survive a force-quit. Neither can lose training
          history, which is why this is the one write in the application not
          wrapped in a transaction.
        */
        colorScheme.set(option);
        void setAppearance(option);
      }}
      className="min-h-touch flex-row items-center gap-lg border-b border-rule-2 px-2xl py-md active:bg-muted"
    >
      <View className="flex-1 gap-xs">
        <Text className="text-body text-text">{APPEARANCE_LABELS[option]}</Text>
        {caption ? (
          <Text className="text-caption text-text-3">{caption}</Text>
        ) : null}
      </View>

      {/* The unselected rows carry no empty box. Nothing in this system draws
          an absence as a control. */}
      {selected ? (
        <CheckIcon size={20} strokeWidth={1.5} className="text-text" />
      ) : null}
    </Pressable>
  );
}

/**
 * Export (§12).
 *
 * Written to the cache directory rather than to documents: the file's purpose
 * is to be handed to the share sheet, and once it has been the copy that
 * matters is wherever the user put it. Leaving a growing pile of exports inside
 * the application would be a second, invisible store of training history.
 */
function Backup() {
  const [state, setState] = useState<'idle' | 'working' | string>('idle');

  const exportEverything = async () => {
    setState('working');

    try {
      const now = Date.now();
      const tables = readAllTables();

      const file = new File(Paths.cache, exportFileName(now));

      // `overwrite` because the name is only the date: a second export on the
      // same day regenerates the file rather than being refused by a `create`
      // that throws on an existing path.
      file.create({ overwrite: true });
      file.write(
        serialiseExport(
          buildExport(tables, { now, schemaVersion: schemaVersion() }),
        ),
      );

      const summary = describeExport(tables);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Zoomies export',
          UTI: 'public.json',
        });
      } else {
        // No share sheet is a device configuration, not a failure to export.
        // The file exists either way, and saying where beats saying nothing.
        Alert.alert('Exported', `${summary}. Saved to ${file.uri}`);
      }

      setState(summary);
    } catch (cause: unknown) {
      /*
        Stated, never swallowed. This is the only backup, and an export that
        silently did nothing is worse than one that failed loudly — the user
        would believe they had a copy.
      */
      Alert.alert(
        'Export failed',
        cause instanceof Error ? cause.message : String(cause),
      );
      setState('idle');
    }
  };

  return (
    <View className="gap-md px-2xl pt-2xl">
      <SectionLabel>Backup</SectionLabel>

      <Text className="text-bodySm text-text-2">
        There is no sync and no account, so an export is the only copy of your
        training that is not on this phone. It holds everything, including what
        you have deleted.
      </Text>

      <Button
        variant="primary"
        disabled={state === 'working'}
        onPress={() => void exportEverything()}
      >
        <Text>{state === 'working' ? 'Exporting…' : 'Export everything'}</Text>
      </Button>

      {/* What was in it, once there is an answer. Stated rather than
          congratulated, like everything else. */}
      {state !== 'idle' && state !== 'working' ? (
        <Text className="font-mono text-metricXs text-text-3">{state}</Text>
      ) : null}
    </View>
  );
}
