import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, View } from 'react-native';

import { ProgressTrack } from '@/components/ui/progress-track';
import { Text } from '@/components/ui/text';
import { formatClock } from '@/lib/format';
import { tapRestOver } from '@/lib/haptics';
import { beepRestOver, beepTargetReached } from '@/lib/sound';
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
 * What the card is doing.
 *
 * `thenHold` is decided when the set is recorded rather than when the rest
 * ends, for the same reason `SetLog` takes its count as a prop: the set counter
 * is a live query, and asking it fifteen seconds later would be asking a
 * different question than the one the round was started under.
 */
type Phase =
  | { kind: 'idle' }
  | { kind: 'hold'; timer: Timer }
  | { kind: 'rest'; timer: Timer; thenHold: boolean };

/**
 * Timing a hold (FEATURES.md §8), the logging UI for a duration-primary
 * exercise, and the rest that follows it (§8.2).
 *
 * **With a target it counts down** and records itself at zero, so three
 * 30-second holds are three taps and no typing. **Without one it counts up**
 * and records what it read when stopped.
 *
 * **With a rest configured, a round is a cycle**: hold, record, rest, hold,
 * until the planned sets are done. Ten 60-second rounds of jump rope with 15
 * seconds between them is one tap, phone on the floor, never picked up — which
 * is the only way that exercise is trainable at all. The cycle is bounded on
 * purpose (see `thenHold` below): the app decides when your rest ends, and
 * never how many efforts you made.
 *
 * **The hold starts itself only after a rest it ran.** Nothing else auto-starts
 * a hold, because a hold that begins on its own records at zero whether or not
 * you were on the rope — which writes a set that never happened, and a number
 * that is not true is worse than a number you had to tap for.
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
  restMs,
  setsRemaining,
  onComplete,
  disabled,
}: {
  /** The duration target in millis, or null to count up instead. */
  targetMs: number | null;
  /** The entry's rest in millis, or null for no rest at all (§8.2). */
  restMs: number | null;
  /**
   * Sets still needed to reach the target, counting the one about to be
   * recorded, or null when the entry has no set target. Read before the write
   * for the reason given on `Phase`.
   */
  setsRemaining: number | null;
  /** Given the seconds held. Resolves once the set is on disk. */
  onComplete: (seconds: number) => Promise<void>;
  disabled?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [tick, setTick] = useState(0);

  /**
   * The auto-record must happen exactly once. A ref rather than state because
   * a re-render must not re-arm it, and because it has to be readable
   * synchronously by the effect that sets it.
   */
  const firing = useRef(false);

  /**
   * Whether this entry cycles at all (§8.2). All three are required: without a
   * duration target there is no hold to start, and without a set target there
   * is no end condition — and a loop that records efforts with nothing to stop
   * it is the one shape this must never take.
   */
  const cycles = targetMs !== null && restMs !== null && setsRemaining !== null;

  const running =
    phase.kind !== 'idle' &&
    (phase.kind === 'rest' || phase.timer.pausedAt === null);

  useEffect(() => {
    if (!running) {
      return;
    }

    const id = setInterval(() => setTick((n) => n + 1), TICK_MS);
    return () => clearInterval(id);
  }, [running]);

  /**
   * **Leaving the app ends a rest, and with it the cycle.**
   *
   * The timing would survive — every figure is derived from a timestamp — but
   * the training would not. Coming back after five minutes to find that four
   * more rounds had been recorded is the app inventing history, so the rest is
   * simply dropped and the next hold is yours to start.
   *
   * A hold in progress is left exactly as it was, and still records on return
   * (§8.1): you were holding, and that one is real.
   *
   * `background` only, never `inactive` — the latter fires for a pulled-down
   * notification shade and for the banner of a call you declined, and losing a
   * circuit to either of those would be absurd.
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'background') {
        return;
      }

      setPhase((current) =>
        current.kind === 'rest' ? { kind: 'idle' } : current,
      );
    });

    return () => subscription.remove();
  }, []);

  const record = (seconds: number) => {
    if (firing.current) {
      return;
    }
    firing.current = true;

    /*
      The rest starts when you stopped, not when SQLite finished. They are
      milliseconds apart, but the write is not part of your rest and a slow one
      must not lengthen it.
    */
    const restFrom = Date.now();

    const next: Phase =
      restMs === null
        ? { kind: 'idle' }
        : {
            kind: 'rest',
            timer: startTimer(restFrom),
            // Bounded here, at the top of the round. `> 1` because the count
            // includes the set being written: one left means this was it.
            thenHold: cycles && (setsRemaining ?? 0) > 1,
          };

    void onComplete(seconds).finally(() => {
      setPhase(next);
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
    if (phase.kind !== 'hold' || targetMs === null || firing.current) {
      return;
    }

    if (phase.timer.pausedAt !== null) {
      return;
    }

    if (!hasElapsed(phase.timer, targetMs, Date.now())) {
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
  }, [tick, phase, targetMs]);

  /**
   * The rest is over: sound, buzz, and either the next hold or nothing.
   *
   * `announce` is false when you skipped it by hand. You are holding the phone
   * and looking at it, so a beep would be telling you what you just did.
   */
  const endRest = (announce: boolean) => {
    if (phase.kind !== 'rest') {
      return;
    }

    if (announce) {
      // Both, unlike the hold ending. There is no write here to carry a haptic
      // of its own, and this is the signal that means *move* rather than
      // *that counted*.
      beepRestOver();
      tapRestOver();
    }

    setPhase(
      phase.thenHold
        ? { kind: 'hold', timer: startTimer(Date.now()) }
        : { kind: 'idle' },
    );
  };

  useEffect(() => {
    if (phase.kind !== 'rest' || restMs === null) {
      return;
    }

    if (!hasElapsed(phase.timer, restMs, Date.now())) {
      return;
    }

    endRest(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, phase, restMs]);

  const now = Date.now();

  const figure =
    phase.kind === 'idle'
      ? formatClock(targetMs ?? 0)
      : phase.kind === 'rest'
        ? formatClock(remainingMs(phase.timer, restMs ?? 0, now))
        : formatClock(
            targetMs === null
              ? elapsedMs(phase.timer, now)
              : remainingMs(phase.timer, targetMs, now),
          );

  /**
   * §6.3 — state is conveyed by the figure and a hairline track, never by a
   * colour change. Counting up has no end to measure against, so it gets no
   * track rather than a misleading one.
   */
  const against =
    phase.kind === 'rest' ? restMs : phase.kind === 'hold' ? targetMs : null;

  const progress =
    phase.kind !== 'idle' && against !== null && against > 0
      ? Math.min(1, elapsedMs(phase.timer, now) / against)
      : 0;

  const press = () => {
    if (phase.kind === 'idle') {
      setPhase({ kind: 'hold', timer: startTimer(Date.now()) });
      return;
    }

    // Skipping is the same event as the rest running out, minus the
    // announcement — including starting the next hold when the cycle says so.
    if (phase.kind === 'rest') {
      endRest(false);
      return;
    }

    if (phase.timer.pausedAt !== null) {
      setPhase({ kind: 'hold', timer: resumeTimer(phase.timer, Date.now()) });
      return;
    }

    // Running: stop, and record what was actually held.
    record(Math.round(elapsedMs(phase.timer, Date.now()) / 1000));
  };

  /**
   * The label names the tap, except during a rest, which is the one state the
   * card entered by itself. There it has to say what is happening before it
   * says what pressing does — a large figure counting down is otherwise
   * indistinguishable from the hold it just replaced.
   */
  const label =
    phase.kind === 'idle'
      ? 'Start'
      : phase.kind === 'rest'
        ? 'Rest · tap to skip'
        : phase.timer.pausedAt !== null
          ? 'Resume'
          : 'Stop';

  /**
   * §8.2 — quitting a cycle is not the same intention as advancing it, so it
   * never shares the card's tap target. It replaces `Pause`, which a cycle has
   * no use for: pausing a round you are not going to finish is stopping it.
   */
  const cycling = phase.kind === 'rest' ? phase.thenHold : cycles;

  return (
    <View className="gap-sm">
      {/* §6.3 — the tap target is the whole card, not a button inside it. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          phase.kind === 'rest'
            ? `Resting, ${figure}. Tap to skip`
            : `${label} the timer, ${figure}`
        }
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

      {against !== null || targetMs !== null ? (
        <ProgressTrack progress={progress} />
      ) : null}

      {phase.kind !== 'idle' && cycling ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Stop the cycle"
          onPress={() => setPhase({ kind: 'idle' })}
          className="min-h-touch items-center justify-center"
        >
          <Text className="text-bodySm text-text-2">Stop</Text>
        </Pressable>
      ) : phase.kind === 'hold' && phase.timer.pausedAt === null ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pause the timer"
          onPress={() =>
            setPhase({ kind: 'hold', timer: pauseTimer(phase.timer, Date.now()) })
          }
          className="min-h-touch items-center justify-center"
        >
          <Text className="text-bodySm text-text-2">Pause</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
