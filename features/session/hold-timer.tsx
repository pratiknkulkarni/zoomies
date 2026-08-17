import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { ProgressTrack } from '@/components/ui/progress-track';
import { Text } from '@/components/ui/text';
import { formatClock } from '@/lib/format';
import { beepTargetReached } from '@/lib/sound';
import {
  elapsedMs,
  hasElapsed,
  pauseTimer,
  remainingMs,
  resumeTimer,
  startTimer,
  type Timer,
} from '@/lib/timers';
import { cn } from '@/lib/utils';

/** How often the figure repaints. It never accumulates — see below. */
const TICK_MS = 200;

/**
 * Timing a hold (FEATURES.md §8), the logging UI for a duration-primary
 * exercise.
 *
 * **With a target it counts down** and records itself at zero, so three
 * 30-second holds are three taps and no typing. **Without one it counts up**
 * and records what it read when stopped.
 *
 * The interval below drives *repainting only*. It never adds to anything: every
 * figure is re-derived from the start timestamp by `lib/timers.ts`, which is
 * what makes a minute spent in another app cost nothing (invariant 4). Deleting
 * the interval would freeze the display, not the timing.
 *
 * State is local on purpose. Leaving the screen mid-hold discards it and
 * records nothing — you have stopped holding, and nothing that was ever a set
 * is lost.
 */
export function HoldTimer({
  targetMs,
  onComplete,
  disabled,
}: {
  /** The duration target in millis, or null to count up instead. */
  targetMs: number | null;
  /** Given the seconds held. Resolves once the set is on disk. */
  onComplete: (seconds: number) => Promise<void>;
  disabled?: boolean;
}) {
  const [timer, setTimer] = useState<Timer | null>(null);
  const [tick, setTick] = useState(0);

  /**
   * The auto-record must happen exactly once. A ref rather than state because
   * a re-render must not re-arm it, and because it has to be readable
   * synchronously by the effect that sets it.
   */
  const firing = useRef(false);

  const running = timer !== null && timer.pausedAt === null;

  useEffect(() => {
    if (!running) {
      return;
    }

    const id = setInterval(() => setTick((n) => n + 1), TICK_MS);
    return () => clearInterval(id);
  }, [running]);

  const record = (seconds: number) => {
    if (firing.current) {
      return;
    }
    firing.current = true;

    void onComplete(seconds).finally(() => {
      setTimer(null);
      firing.current = false;
    });
  };

  /**
   * Reaching the target is the only thing that records on its own. In an effect
   * rather than in render, because it beeps and writes — and it depends on
   * `tick` so it is re-checked on every repaint rather than only when something
   * else happens to change.
   */
  useEffect(() => {
    if (!running || !timer || targetMs === null || firing.current) {
      return;
    }

    if (!hasElapsed(timer, targetMs, Date.now())) {
      return;
    }

    // Sound only. The haptic follows from the save itself in `SetLog`, which
    // knows whether this set also finished the exercise — two signals for two
    // different facts, rather than two buzzes for one.
    beepTargetReached();
    record(Math.round(targetMs / 1000));
    // `record` is stable enough for this: it is guarded by `firing` and reads
    // nothing that changes between renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, running, timer, targetMs]);

  const now = Date.now();

  const figure =
    timer === null
      ? formatClock(targetMs ?? 0)
      : formatClock(
          targetMs === null
            ? elapsedMs(timer, now)
            : remainingMs(timer, targetMs, now),
        );

  /**
   * §6.3 — state is conveyed by the figure and a hairline track, never by a
   * colour change. Counting up has no end to measure against, so it gets no
   * track rather than a misleading one.
   */
  const progress =
    timer !== null && targetMs !== null && targetMs > 0
      ? Math.min(1, elapsedMs(timer, now) / targetMs)
      : 0;

  const press = () => {
    if (timer === null) {
      setTimer(startTimer(Date.now()));
      return;
    }

    if (timer.pausedAt !== null) {
      setTimer(resumeTimer(timer, Date.now()));
      return;
    }

    // Running: stop, and record what was actually held.
    record(Math.round(elapsedMs(timer, Date.now()) / 1000));
  };

  const label =
    timer === null ? 'Start' : timer.pausedAt !== null ? 'Resume' : 'Stop';

  return (
    <View className="gap-sm">
      {/* §6.3 — the tap target is the whole card, not a button inside it. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} the timer, ${figure}`}
        accessibilityState={{ disabled: disabled ?? false }}
        disabled={disabled}
        onPress={press}
        className={cn(
          'items-center justify-center gap-sm rounded-card bg-muted py-xl active:bg-surface',
          disabled && 'opacity-50',
        )}
      >
        <Text className="font-mono text-display text-text">{figure}</Text>
        <Text className="text-bodySm text-text-2">{label}</Text>
      </Pressable>

      {targetMs !== null ? <ProgressTrack progress={progress} /> : null}

      {running ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pause the timer"
          onPress={() => setTimer(pauseTimer(timer, Date.now()))}
          className="min-h-touch items-center justify-center"
        >
          <Text className="text-bodySm text-text-2">Pause</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
