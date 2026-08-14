import { useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { SectionLabel } from '@/components/ui/section-label';
import { Text } from '@/components/ui/text';
import type { ExerciseMetric } from '@/db/queries/exercises';
import { WINDOW_WEEKS } from '@/lib/days';
import { formatMeasures, formatMonth } from '@/lib/format';
import { bestSetTrend, type TrendSet, type TrendValue } from '@/lib/trend';

/**
 * The dot, as a number — DESIGN.md §4 and §6.14.
 *
 * The same edge of the rule `DayGrid` sits on: this is arithmetic over a width
 * measured at runtime, and a NativeWind class is not readable from JavaScript.
 * **Must stay equal to `sm` in `tailwind.config.js`.**
 */
const DOT = 6;

/**
 * `h-chart` as a number — DESIGN.md §6.14.
 *
 * Needed for the same reason, one step further: a dot's vertical position is a
 * fraction of the plot rather than a share of it, and there is no flex
 * arrangement that puts a point at 62% of a height. **Must stay equal to
 * `chart` in `tailwind.config.js`.**
 */
const CHART_HEIGHT = 96;

/**
 * The best-set trend (FEATURES.md §10.2, DESIGN.md §6.14).
 *
 * One dot per session, at the best set of that session, positioned by the day it
 * happened. Absolutely-positioned `View`s in a fixed-height box — no charting
 * stack, because DESIGN.md §7 forbids axes, gridlines, tooltips, gestures and
 * animation, which is every feature such a library sells (`PLAN.md` §4.4).
 *
 * **Dots, never a line.** A line joining two sessions three weeks apart draws
 * training that did not happen. `lib/trend.ts` carries the same rule into the
 * data by giving each point an `x` in time rather than an index.
 *
 * **The y labels are pinned outside the scroll and never move.** They are the
 * all-time low and high, so scrolling changes which dots are visible and never
 * what a height means. An axis that rescaled to the window would make two
 * identical-looking stretches of chart say different things — which is the one
 * way a chart this quiet could actively mislead.
 *
 * **Thirteen weeks fill the screen, and the rest scrolls**, at the same rate and
 * the same scale as the day grid on Look back: `WINDOW_WEEKS` is shared, so a
 * screenful is a quarter in both and neither can be denser than the other.
 *
 * Draws nothing at all when nothing ranks — no sets yet, or an exercise that
 * measures only text (§10.1). The screen's own empty state says so; a pair of
 * empty axes would claim there was a trend and that it was flat.
 */
export function BestSetTrend({
  sets,
  values,
  metrics,
}: {
  sets: TrendSet[];
  values: TrendValue[];
  metrics: ExerciseMetric[];
}) {
  const scroll = useRef<ScrollView>(null);
  const [plotWidth, setPlotWidth] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);

  // §10.1: `notes` has no ordering, so the longest note is not an achievement.
  const rankable = useMemo(
    () => metrics.filter((metric) => metric.type !== 'notes'),
    [metrics],
  );

  /*
    Falling back to the first rather than storing it: metric order is meaningful
    — the first is the one the exercise is logged by (§4.1) — and a chosen id
    that no longer exists, because the metric was deleted while this screen was
    open, resolves back to the primary instead of blanking the chart.
  */
  const metric = rankable.find((one) => one.id === chosen) ?? rankable.at(0);

  const trend = useMemo(
    () => (metric ? bestSetTrend(sets, values, metric.id) : null),
    [metric, sets, values],
  );

  if (!metric || !trend) {
    return null;
  }

  // One week of time is one column of width, and thirteen of them span the
  // measured area — the same rule as the grid, so the two charts agree about
  // how much time a screen is.
  const pitch = plotWidth / WINDOW_WEEKS;
  const contentWidth = trend.weeks * pitch;

  // Inset by the dot so neither the oldest nor the newest session is drawn half
  // outside the plot it belongs to.
  const across = Math.max(0, contentWidth - DOT);

  return (
    <View className="gap-md px-2xl pt-xl">
      <SectionLabel>
        {rankable.length > 1
          ? 'Best set each session'
          : `Best set each session · ${formatMeasures([metric]) ?? metric.name}`}
      </SectionLabel>

      {/*
        Only where there is a choice to make. Most exercises rank one thing, and
        a picker over a list of one is furniture — §10.2. Where it does appear it
        names the metric, so the section label above stops doing that job.
      */}
      {rankable.length > 1 ? (
        <View className="flex-row flex-wrap gap-sm">
          {rankable.map((one) => (
            <Chip
              key={one.id}
              label={one.name}
              selected={one.id === metric.id}
              onPress={() => setChosen(one.id)}
            />
          ))}
        </View>
      ) : null}

      <View className="flex-row items-start gap-sm">
        {/*
          Pinned, and fixed to the whole history. Two labels and no others: §7
          forbids gridlines, and a scale printed every few units would be a
          precision this chart does not have and does not need.
        */}
        <View className="h-chart justify-between">
          <Text className="font-mono text-label text-text-5">{trend.max}</Text>
          <Text className="font-mono text-label text-text-5">{trend.min}</Text>
        </View>

        <ScrollView
          ref={scroll}
          horizontal
          showsHorizontalScrollIndicator={false}
          onLayout={(event) => setPlotWidth(event.nativeEvent.layout.width)}
          /*
            Opens on the most recent session, at the right edge, for the reason
            `lib/trend.ts` ends the window there: the newest training is what the
            screen is being opened for. A no-op while the content fits.
          */
          onContentSizeChange={() =>
            scroll.current?.scrollToEnd({ animated: false })
          }
          className="flex-1"
        >
          <View style={{ width: contentWidth }} className="gap-sm">
            <View className="h-chart">
              {trend.points.map((point) => (
                <View
                  key={point.sessionId}
                  /*
                    A position derived from the data — a date and a value
                    against the span of both — not a design value, and no token
                    can express it. The same exemption the month axis takes for
                    `flex`.
                  */
                  style={{
                    position: 'absolute',
                    left: point.x * across,
                    bottom: point.y * (CHART_HEIGHT - DOT),
                    width: DOT,
                    height: DOT,
                  }}
                  className="rounded-full bg-text"
                />
              ))}
            </View>

            {/*
              The same span treatment as the day grid, and for the same reason:
              `MAY` is wider than a week's worth of chart, so each label gets the
              width its own month occupies and sits at its left edge.
            */}
            <View className="flex-row">
              {trend.leading > 0 ? (
                <View style={{ flex: trend.leading }} />
              ) : null}
              {trend.months.map((month) => (
                <View
                  key={month.monthMs}
                  style={{ flex: month.columns }}
                  className="overflow-hidden"
                >
                  <Text
                    className="font-mono text-label uppercase tracking-label text-text-5"
                    numberOfLines={1}
                  >
                    {formatMonth(month.monthMs)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

