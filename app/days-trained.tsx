import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { BackButton } from '@/components/ui/back-button';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { SectionLabel } from '@/components/ui/section-label';
import { Text } from '@/components/ui/text';
import { trainedDaysSince } from '@/db/queries/history';
import { DayGrid } from '@/features/dashboard/day-grid';
import { daysTrainedGrid } from '@/lib/dashboard';
import { formatDayRange } from '@/lib/format';

/**
 * Every week ever trained (FEATURES.md §11.3).
 *
 * ```
 * ← Days trained
 *
 * 18 JUN 2007 – 14 AUG 2026
 * M ■ ■ □ □ ■ ■ □ □ ■ □ ■ □ ■ …
 * ```
 *
 * **The screen that pays for Look back being fast.** Look back's grid is bounded
 * to a quarter, which is what it can draw in a frame — one square per day over
 * nineteen years is 7,000 `View`s and blocked the main thread for 2.3 seconds.
 * Bounding it there without building this would have been a feature removed
 * rather than a cost moved, so the whole span lives here, one tap away, where
 * the wait is asked for rather than inflicted.
 *
 * **The one loader in the application**, and the exception proves the rule: the
 * others resolve fast enough that a spinner would flash and go, which reads as a
 * fault rather than as progress. This read genuinely takes a moment on a long
 * history, and the honest thing is to say so rather than hold a blank screen.
 *
 * Nothing else from Look back is repeated here. The two counts and the records
 * are windowed by definition — twenty-eight days and thirty — so an all-time
 * view of them is not a longer answer, it is the same answer.
 */
export default function DaysTrainedScreen() {
  /*
    Fixed at mount like Look back's, and for the same two reasons: the fold
    needs one idea of what day it is, and `useLiveQuery` rebuilds its
    subscription whenever a dep changes — a bound read from `Date.now()` on
    every render would resubscribe on every render.
  */
  const [now] = useState(() => Date.now());

  // Zero, meaning everything. The floor is a parameter precisely so this screen
  // can decline to set one.
  const { data: days, updatedAt } = useLiveQuery(trainedDaysSince(0));

  const grid = useMemo(
    () => daysTrainedGrid(days.map((row) => row.performedAt), now),
    [days, now],
  );

  const settled = updatedAt !== undefined;

  return (
    <Screen bleed>
      <ScrollView contentContainerClassName="pb-3xl">
        <View className="flex-row items-center gap-md pr-2xl">
          <BackButton />
          <Text className="flex-1 font-sans-semibold text-display text-text">
            Days trained
          </Text>
        </View>

        {!settled ? (
          <View className="items-center gap-md px-2xl pt-3xl">
            {/*
              `text-3`, the metadata step: a spinner is not the subject of the
              screen and must not be drawn like one. DESIGN.md §8 puts an icon
              where a word would be slower to read, and there is no word for
              "still counting".
            */}
            <ActivityIndicator className="text-text-3" />
            <Text className="text-bodySm text-text-3">
              Counting every day you have trained.
            </Text>
          </View>
        ) : grid ? (
          <View className="gap-md px-2xl pt-xl">
            <SectionLabel>
              {formatDayRange(grid.fromMs, grid.toMs)}
            </SectionLabel>
            <DayGrid grid={grid} />
            <Text className="text-bodySm text-text-3">
              Scroll back through every week. Look back shows the last quarter.
            </Text>
          </View>
        ) : (
          <View className="px-2xl">
            <EmptyState
              title="Nothing trained yet"
              body="Finish a session or log a set and every week you train appears here."
            />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
