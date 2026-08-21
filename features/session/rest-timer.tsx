import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, View } from 'react-native';

import { ProgressTrack } from '@/components/ui/progress-track';
import { Text } from '@/components/ui/text';
import { cueDue } from '@/lib/countdown';
import { formatClock } from '@/lib/format';
import { tapRestOver } from '@/lib/haptics';
import { beepCountdown, beepRestOver } from '@/lib/sound';
import { hasElapsed, remainingMs, startTimer } from '@/lib/timers';

/** How often the figure repaints. It never accumulates — see `hold-timer`. */
const TICK_MS = 200;

/**
 * The rest between counted sets (FEATURES.md §8.2).
 *
 * **A row, not a card.** The hold's rest gets the display figure because on
 * that screen the clock *is* the screen; a counted exercise logs from a bar
 * pinned under the thumb, and the largest figure in the application does not
 * belong in it. Same countdown, same sound, a twelfth of the height.
 *
 * **It never starts anything.** There is no hold to chain into on a counted
 * exercise, so the cycle of §8.2 does not apply here: rest runs out, says so,
 * and leaves the next set to you. That asymmetry is the feature — the app
 * decides when your rest ends, and never when your effort begins.
 */
export function RestTimer({
  startedAt,
  restMs,
  onEnd,
}: {
  /** When the rest began, or null when there is none running. */
  startedAt: number | null;
  restMs: number;
  onEnd: () => void;
}) {
  const [tick, setTick] = useState(0);

  /**
   * The end fires exactly once. A ref rather than state because a re-render
   * must not re-arm it, and because it has to be readable synchronously by the
   * effect that sets it — `onEnd` clears `startedAt`, but not before this
   * effect could run again.
   */
  const ended = useRef(false);

  /** The last mark the countdown announced, or null before it has said one. */
  const announced = useRef<number | null>(null);

  useEffect(() => {
    ended.current = false;
    announced.current = null;
  }, [startedAt]);

  useEffect(() => {
    if (startedAt === null) {
      return;
    }

    const id = setInterval(() => setTick((n) => n + 1), TICK_MS);
    return () => clearInterval(id);
  }, [startedAt]);

  /**
   * Leaving the app drops the rest rather than announcing it late — the same
   * rule the cycle follows, and for the same reason. `background` only, so a
   * notification shade does not cost you the countdown.
   */
  useEffect(() => {
    if (startedAt === null) {
      return;
    }

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        onEnd();
      }
    });

    return () => subscription.remove();
  }, [startedAt, onEnd]);

  const timer = startedAt === null ? null : startTimer(startedAt);

  useEffect(() => {
    if (!timer || ended.current) {
      return;
    }

    const now = Date.now();

    /*
      The same three seconds the hold card counts, from the same module — a
      rest is a rest, and one of them announcing itself differently would be
      two vocabularies for one fact. The tone that ends it plays here, on the
      last second, rather than below at zero.
    */
    const due = cueDue(remainingMs(timer, restMs, now), announced.current);

    if (due) {
      announced.current = due.mark;

      if (due.cue === 'tick') {
        beepCountdown();
      } else {
        beepRestOver();
      }
    }

    if (!hasElapsed(timer, restMs, now)) {
      return;
    }

    ended.current = true;
    tapRestOver();
    onEnd();
    // Re-checked on every repaint rather than only when something else happens
    // to change, which is what `tick` is for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, startedAt, restMs]);

  if (!timer) {
    return null;
  }

  const now = Date.now();
  const left = remainingMs(timer, restMs, now);

  return (
    <View className="gap-xs">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Resting, ${formatClock(left)}. Tap to skip`}
        onPress={onEnd}
        className="min-h-touch flex-row items-center justify-between active:bg-muted"
      >
        <Text className="text-bodySm text-text-2">Rest · tap to skip</Text>
        <Text className="font-mono text-metricSm text-text">
          {formatClock(left)}
        </Text>
      </Pressable>

      {/* A rest of no length has no progress to draw, and dividing by it is
          how a track ends up rendering NaN. */}
      <ProgressTrack
        progress={restMs > 0 ? Math.min(1, (restMs - left) / restMs) : 0}
      />
    </View>
  );
}
