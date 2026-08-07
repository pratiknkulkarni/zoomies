import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useMemo, type ReactNode } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { iconWithClassName } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { SectionLabel } from '@/components/ui/section-label';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { activeSession } from '@/db/queries/sessions';
import {
  allSlots,
  allTemplates,
  indexSlotsByTemplate,
} from '@/db/queries/templates';
import { ResumePrompt } from '@/features/session/session-controls';
import { formatSlotCount } from '@/lib/format';

const PlusIcon = iconWithClassName(Plus);

/**
 * Home. Templates live here because this is where training starts — a session
 * originates from one (FEATURES.md §6.1), and the first screen should carry the
 * thing you came to do. Phase 9's dashboard blocks arrive around this list
 * rather than in place of it, which is why `Templates` is a section under a
 * screen title instead of the title itself.
 *
 * Slot counts come from a second live query rather than a join: `useLiveQuery`
 * watches only the root table, so a joined count would never move when a slot
 * was added. See `db/queries/templates.ts`.
 */
export default function HomeScreen() {
  const { data: templates } = useLiveQuery(allTemplates());
  const { data: slots } = useLiveQuery(allSlots());
  const { data: active } = useLiveQuery(activeSession());

  const session = active.at(0);

  const slotsByTemplate = useMemo(() => indexSlotsByTemplate(slots), [slots]);

  return (
    <Screen bleed>
      <FlatList
        data={templates}
        keyExtractor={(template) => template.id}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={
          <View>
            <Text className="px-xl pt-xl font-sans-semibold text-display text-text">
              Home
            </Text>

            {/*
              An unfinished session is the most urgent thing on this screen, so
              it sits above the templates. The full Resume · Complete · Discard
              prompt of §6.3 arrives in step 6; this is the way back into it.
            */}
            {session ? (
              <View className="gap-sm px-xl pt-2xl">
                <SectionLabel>In progress</SectionLabel>
                <ResumePrompt session={session} />
              </View>
            ) : null}

            <View className="flex-row items-center justify-between pl-xl pr-md pt-2xl">
              <SectionLabel>Templates</SectionLabel>
              <IconButton
                label="New template"
                onPress={() => router.push('/template/new')}
              >
                <PlusIcon size={24} strokeWidth={1.5} className="text-text-2" />
              </IconButton>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <ListRow
            title={item.name}
            subtitle={formatSlotCount(slotsByTemplate.get(item.id)?.length ?? 0)}
            onPress={() =>
              router.push({
                pathname: '/template/[id]',
                params: { id: item.id },
              })
            }
          />
        )}
        ListEmptyComponent={
          <View className="px-xl">
            <EmptyState
              title="Your templates"
              body="A template is a plan you train from — an ordered list of exercises with targets."
              action={{
                label: 'New template',
                onPress: () => router.push('/template/new'),
              }}
            />
          </View>
        }
        ListFooterComponent={
          /*
            §6.1 — training outside a session. It sits under the templates
            rather than beside them because it is the exception: most training
            starts from a plan, and five pull-ups in the evening does not.

            `secondary`, so Home keeps to one primary button (DESIGN.md §10).
          */
          <View className="px-xl pt-2xl">
            <Button
              variant="secondary"
              className="w-full"
              onPress={() => router.push('/quick-log')}
            >
              <Text>Quick log</Text>
            </Button>
          </View>
        }
      />
    </Screen>
  );
}

/** §9 puts a 48×48 floor under every target; the glyph is 24. */
function IconButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="min-h-touch min-w-touch items-center justify-center active:bg-muted"
    >
      {children}
    </Pressable>
  );
}
