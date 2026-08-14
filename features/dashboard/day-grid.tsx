import { useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { GRID_WEEKS, type DaysGrid, type GridDay } from '@/lib/dashboard';
import { formatMonth } from '@/lib/format';

/**
 * Monday first, and one letter each — the column is a square wide.
 *
 * T twice and S twice is ambiguous read alone and unambiguous read down, which
 * is how a fixed seven-row axis is read. Two letters would double the width of
 * the column and take it from the squares.
 */
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * `gap-xs` as a number — DESIGN.md §4.
 *
 * The one place a spacing token is repeated as a literal, and it is not an
 * exception to the rule so much as the edge of what the rule can reach: the
 * cell size is arithmetic over a width measured at runtime, and a NativeWind
 * class is not readable from JavaScript. **It must stay equal to `xs` in
 * `tailwind.config.js`.**
 */
const COLUMN_GAP = 4;

/**
 * The days-trained grid (FEATURES.md §11.3, DESIGN.md §6.12).
 *
 * Seven rows by as many columns as the history has weeks, filled where
 * something was logged. Made of `View`s, which is the whole argument for it: it
 * answers both the week and the quarter, and it is the reason the application
 * installs no charting stack.
 *
 * **Filled or outlined, never shaded by volume.** §11.1 rules out a combined
 * figure across a pull-up and a hold, so an intensity ramp would be shading by
 * a number that had to be invented first. §9 makes the same point from the
 * other side: state is never carried by colour alone, and there is no second
 * colour in the system to carry it with.
 *
 * **A day outside the record is drawn as nothing at all.** The system has
 * exactly two marks — filled for done and outlined for not — and the outline
 * says *skipped*. Thursday of this week has not been skipped, and neither has
 * any day before you first logged something. Blank is the only treatment that
 * is neither mark, and it is what holds the two ragged ends of the picture:
 * undrawn at the start, drawn through the middle, undrawn again at the bottom
 * of the last column.
 *
 * **Thirteen columns fit the screen; the rest scroll.** The cell is sized so
 * that a quarter exactly spans the measured width, and then the content is
 * sized to the data rather than to the screen. Both halves matter and they used
 * to be one rule: sizing the cell by however many columns the history filled
 * gave week two a pair of squares the width of a thumb, and capping the content
 * at a quarter meant the first month of training became unreachable in month
 * four. A young grid is narrower than its own viewport and does not scroll at
 * all, so nothing about it changes.
 *
 * **The weekday axis is outside the `ScrollView` and the month axis is inside
 * it.** That is the whole layout decision, and it follows from what each axis
 * labels: the letters name the rows, which do not move, and the months name the
 * columns, which do. Letters that scrolled away would leave seven anonymous
 * rows within a second of touching the thing.
 */
export function DayGrid({ grid }: { grid: DaysGrid }) {
  const scroll = useRef<ScrollView>(null);
  const [plotWidth, setPlotWidth] = useState(0);

  const columns = grid.rows[0]?.length ?? 0;

  /*
    A quarter spans the viewport, whatever the history. `Math.min` only guards
    a caller passing a smaller floor than `GRID_WEEKS` — `daysTrainedGrid`
    never returns fewer columns than its floor — and makes the degenerate case
    fill the width rather than draw thirteen squares' worth of nothing.
  */
  const across = Math.min(columns, GRID_WEEKS);
  const cell =
    plotWidth > 0 && across > 0
      ? (plotWidth - (across - 1) * COLUMN_GAP) / across
      : 0;

  // Sized to the data. Equal to `plotWidth` at thirteen columns, which is what
  // makes a new user's grid sit still.
  const contentWidth = columns * cell + (columns - 1) * COLUMN_GAP;

  return (
    <View className="flex-row items-start gap-sm">
      {/*
        Pinned. `overflow-hidden` covers the single frame before `onLayout`
        reports a width, when every row is zero high and the letters would
        otherwise spill over each other.
      */}
      <View className="gap-xs overflow-hidden">
        {WEEKDAYS.map((letter, index) => (
          <View
            key={index}
            style={{ height: cell }}
            className="w-lg justify-center"
          >
            <Text className="font-mono text-label text-text-5">{letter}</Text>
          </View>
        ))}
      </View>

      <ScrollView
        ref={scroll}
        horizontal
        showsHorizontalScrollIndicator={false}
        onLayout={(event) => setPlotWidth(event.nativeEvent.layout.width)}
        /*
          Opens on today, at the right edge. Today is what the screen is for;
          the past is what you scroll back to. `animated: false` because a grid
          that slides into place on every visit is animation for its own sake —
          DESIGN.md §7. A no-op while the content fits, which is the common case.
        */
        onContentSizeChange={() =>
          scroll.current?.scrollToEnd({ animated: false })
        }
        className="flex-1"
      >
        <View style={{ width: contentWidth }} className="gap-sm">
          <View className="gap-xs">
            {grid.rows.map((row, index) => (
              <View key={index} className="flex-row gap-xs">
                {row.map((day) => (
                  <Day key={day.dayMs} day={day} size={cell} />
                ))}
              </View>
            ))}
          </View>

          {/*
            The axis is laid out in month spans rather than a label per column:
            a month is four or five columns and `MAY` is wider than one of them,
            so each label gets the width its own month occupies and sits at its
            left edge — where the month starts.

            No gap between spans, unlike the rows above. A span is a run of
            columns rather than a column, so gapping them would distribute the
            same total width differently from the grid and walk each label off
            the month it names. Contiguous, the two disagree by at most one gap
            across the whole width — the flex unit is short by `gap / columns`,
            so the error is bounded by a single 4px gap however long the history
            gets, rather than accumulating with it.
          */}
          <View className="flex-row">
            {/*
              The columns before the first session carry no label, because there
              is no month there to name — only held-open width. It has to be the
              same held-open width, or every label after it walks off its month.
              Zero once the history is wider than a quarter.
            */}
            {grid.leading > 0 ? <View style={{ flex: grid.leading }} /> : null}
            {grid.months.map((month) => (
              <View
                key={month.monthMs}
                /*
                  A ratio derived from the data — how many columns this month
                  covers — not a design value, and so no token can express it.
                  The same exemption `Screen` takes for the safe-area inset.
                */
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
  );
}

function Day({ day, size }: { day: GridDay; size: number }) {
  // Both ends of the window: nothing was being recorded then, so neither mark
  // is true. They hold their width and draw nothing.
  if (day.state === 'before' || day.state === 'future') {
    return <View style={{ width: size, height: size }} />;
  }

  return (
    <View
      // Square by measurement rather than by `aspect-square`, because the width
      // is now a number this component computed rather than a share of a row.
      style={{ width: size, height: size }}
      className={
        day.state === 'trained'
          ? 'rounded-none bg-text'
          : 'rounded-none border border-mark'
      }
    />
  );
}
