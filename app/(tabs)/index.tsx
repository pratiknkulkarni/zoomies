import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useMemo, type ReactNode } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { iconWithClassName } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { SectionLabel } from '@/components/ui/section-label';
import { Text } from '@/components/ui/text';
import { startFromTemplate } from '@/db/mutations/sessions';
import { completedSessions } from '@/db/queries/history';
import { activeSession } from '@/db/queries/sessions';
import {
  allSlots,
  allTemplates,
  indexSlotsByTemplate,
} from '@/db/queries/templates';
import { ResumePrompt } from '@/features/session/session-controls';
import { formatPlanSummary, formatSessionDate } from '@/lib/format';

const PlusIcon = iconWithClassName(Plus);

/**
 * Home. Plans live here because this is where training starts — a session
 * originates from one (FEATURES.md §6.1), and the first screen should carry the
 * thing you came to do.
 *
 * **Start is on the row.** Opening a plan to find its Start button put a screen
 * between the phone coming out of a pocket and the session existing. The plan
 * screen is still there for reading and editing one; it is no longer on the way
 * to using it.
 *
 * The dashboard does not live here (§11.3). What you want at 18:39 in a garage
 * is a Start button, not a review of the last twelve weeks.
 *
 * Four live queries rather than joins: `useLiveQuery` watches only the root
 * table, so a joined slot count would never move when a slot was added.
 */
export default function HomeScreen() {
  const { data: templates } = useLiveQuery(allTemplates());
  const { data: slots } = useLiveQuery(allSlots());
  const { data: active } = useLiveQuery(activeSession());
  const { data: history } = useLiveQuery(completedSessions());

  const session = active.at(0);

  const slotsByTemplate = useMemo(() => indexSlotsByTemplate(slots), [slots]);

  /**
   * When each plan was last run, folded from the sessions already read for the
   * line under the title. `completedSessions` is newest first, so the first
   * mention of a template is its most recent run.
   */
  const lastRunByTemplate = useMemo(() => {
    const last = new Map<string, number>();

    for (const done of history) {
      if (done.templateId && !last.has(done.templateId)) {
        last.set(done.templateId, done.completedAt ?? done.startedAt);
      }
    }

    return last;
  }, [history]);

  const lastTrained = history.at(0);

  return (
    <Screen bleed>
      <FlatList
        data={templates}
        keyExtractor={(template) => template.id}
        ListHeaderComponent={
          <View>
            {/*
              Settings moved to a tab. It sat here because the export is the
              only backup (§12) and a backup nobody can find is not one — Home
              being the screen that gets opened. A tab is simply better at that
              same job, and it frees the title row of a screen whose subject is
              the training below it, not the application.
            */}
            <Text className="px-2xl pt-2xl font-sans-semibold text-display text-text">
              Zoomies
            </Text>

            {/* What the app knows about you, in one line. Absent before there
                is anything to say — an empty app should not open on a report of
                having done nothing. */}
            {lastTrained ? (
              <Text className="px-2xl pt-xs font-mono text-metricXs text-text-3">
                {`Last trained ${formatSessionDate(
                  lastTrained.completedAt ?? lastTrained.startedAt,
                )}`}
                {lastTrained.isQuickLog
                  ? ' · one-off'
                  : lastTrained.name
                    ? ` · ${lastTrained.name}`
                    : ''}
              </Text>
            ) : null}

            {/* An unfinished session is the most urgent thing on this screen,
                so it sits above the plans. */}
            {session ? (
              <View className="gap-sm px-2xl pt-xl">
                <SectionLabel>In progress</SectionLabel>
                <ResumePrompt session={session} />
              </View>
            ) : null}

            {templates.length > 0 ? (
              <View className="flex-row items-center justify-between pl-2xl pr-md pt-xl">
                <SectionLabel>Plans</SectionLabel>
                <IconButton
                  label="New plan"
                  onPress={() => router.push('/template/new')}
                >
                  <PlusIcon size={24} strokeWidth={1.5} className="text-text-2" />
                </IconButton>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const planSlots = slotsByTemplate.get(item.id) ?? [];

          return (
            <PlanRow
              name={item.name}
              summary={formatPlanSummary(
                planSlots.length,
                planSlots.reduce(
                  (total, slot) => total + (slot.targetSets ?? 0),
                  0,
                ),
                lastRunByTemplate.get(item.id) ?? null,
              )}
              empty={planSlots.length === 0}
              running={session?.id ?? null}
              onOpen={() =>
                router.push({
                  pathname: '/template/[id]',
                  params: { id: item.id },
                })
              }
              onStart={() =>
                void startFromTemplate(item.id).then((id) =>
                  router.push({ pathname: '/session/[id]', params: { id } }),
                )
              }
            />
          );
        }}
        ListEmptyComponent={
          <View className="px-2xl">
            <EmptyState
              title="Plans go here"
              body="A plan is a list of exercises with the sets you intend to do. You can also train without one and add exercises as you go."
              action={{
                label: 'Make your first plan',
                onPress: () => router.push('/template/new'),
              }}
            />
          </View>
        }
        ListFooterComponent={
          /*
            The ways to train that are not "run a plan". Secondary and stacked,
            so Home keeps to one filled action per row rather than a screen of
            competing blocks (DESIGN.md §10.2).
          */
          <View className="gap-md px-2xl pb-3xl pt-2xl">
            <Button
              variant="secondary"
              className="w-full"
              onPress={() => router.push('/quick-log')}
            >
              <Text>Quick log</Text>
            </Button>
            {templates.length > 0 ? (
              <Button
                variant="secondary"
                className="w-full"
                onPress={() => router.push('/template/new')}
              >
                <Text>New plan</Text>
              </Button>
            ) : null}
          </View>
        }
      />
    </Screen>
  );
}

/**
 * One plan, and both things you might want from it.
 *
 * The row opens it; the button runs it. Two targets rather than one because
 * they are genuinely different intentions and the common one — train now —
 * should not go through the screen for the rarer one.
 *
 * **An empty plan cannot start a session.** There would be nothing to log, and
 * a session with no entries is a row that exists only to be discarded. With a
 * session already running the button says so instead, since §6.2 allows one at
 * a time.
 */
function PlanRow({
  name,
  summary,
  empty,
  running,
  onOpen,
  onStart,
}: {
  name: string;
  summary: string;
  empty: boolean;
  running: string | null;
  onOpen: () => void;
  onStart: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${summary}`}
      onPress={onOpen}
      className="min-h-touch flex-row items-center gap-lg px-2xl py-md active:bg-muted"
    >
      <View className="flex-1 gap-xs">
        <Text className="font-sans-semibold text-heading text-text">{name}</Text>
        <Text className="font-mono text-metricXs text-text-4">{summary}</Text>
      </View>

      {running ? (
        <Button
          variant="secondary"
          onPress={() =>
            router.push({ pathname: '/session/[id]', params: { id: running } })
          }
        >
          <Text>Resume</Text>
        </Button>
      ) : (
        <Button variant="secondary" disabled={empty} onPress={onStart}>
          <Text>Start</Text>
        </Button>
      )}
    </Pressable>
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
