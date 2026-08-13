import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import type { DaysGrid, GridDay } from '@/lib/dashboard';
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
 * The days-trained grid (FEATURES.md §11.3, DESIGN.md §6.12).
 *
 * Seven rows by up to thirteen columns, filled where something was logged. Made
 * of `View`s, which is the whole argument for it: it answers both the week and
 * the quarter, and it is the reason this phase installs no charting stack.
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
 * Columns are `flex-1` over a **fixed** thirteen, which is the only reason that
 * works. `flex-1` over however many columns the history happened to fill made
 * week two a pair of squares the width of a thumb; sizing the square by how new
 * the user is was never intended and reads as a broken layout. Thirteen columns
 * always, blank where there is nothing to say.
 */
export function DayGrid({ grid }: { grid: DaysGrid }) {
  return (
    <View className="gap-sm">
      <View className="gap-xs">
        {grid.rows.map((row, index) => (
          <View key={index} className="flex-row items-center gap-sm">
            <Text className="w-lg font-mono text-label text-text-5">
              {WEEKDAYS[index] ?? ''}
            </Text>
            <View className="flex-1 flex-row gap-xs">
              {row.map((day) => (
                <Day key={day.dayMs} day={day} />
              ))}
            </View>
          </View>
        ))}
      </View>

      {/*
        The axis is laid out in month spans rather than a label per column: a
        month is four or five columns and `MAY` is wider than one of them, so
        each label gets the width its own month occupies and sits at its left
        edge — where the month starts.
      */}
      <View className="flex-row gap-sm">
        <View className="w-lg" />
        {/*
          No gap between spans, unlike the rows above. A span is a run of
          columns rather than a column, so gapping them would distribute the
          same total width differently from the grid and walk each label off
          the month it names. Contiguous, the two agree to within a pixel.
        */}
        <View className="flex-1 flex-row">
          {/*
            The columns before the first session carry no label, because there
            is no month there to name — only held-open width. It has to be the
            same held-open width, or every label after it walks off its month.
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
    </View>
  );
}

function Day({ day }: { day: GridDay }) {
  // Both ends of the window: nothing was being recorded then, so neither mark
  // is true. They hold their width and draw nothing.
  if (day.state === 'before' || day.state === 'future') {
    return <View className="aspect-square flex-1" />;
  }

  return (
    <View
      className={
        day.state === 'trained'
          ? 'aspect-square flex-1 rounded-none bg-text'
          : 'aspect-square flex-1 rounded-none border border-mark'
      }
    />
  );
}
