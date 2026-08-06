import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

/**
 * FEATURES.md §8 — the hold timer reaching its target.
 *
 * A hold usually means the phone is on the floor or propped against a wall
 * rather than in your hand, so a haptic alone can go unfelt. The sound is what
 * actually reaches you; `lib/haptics.ts` fires alongside for the case where it
 * does not.
 *
 * **Fire-and-forget, and every failure is swallowed** — the same contract as
 * the haptics module. A device on silent, without an audio route, or mid-call
 * must never turn a completed hold into an error: the set is already on disk by
 * the time any of this runs.
 *
 * No `setAudioModeAsync` call. Its defaults are already what an alert wants —
 * `playsInSilentMode` is true, and `interruptionMode` is `mixWithOthers`, so a
 * beep does not stop whatever you are listening to while you train.
 */

const source = require('../assets/beep.wav');

/**
 * Built once, lazily, and kept. A player per beep would allocate a decoder for
 * every set and make the first sound lag behind the moment it is reporting.
 */
let player: AudioPlayer | null = null;

function ensurePlayer(): AudioPlayer | null {
  if (player) {
    return player;
  }

  try {
    player = createAudioPlayer(source);
  } catch {
    player = null;
  }

  return player;
}

/**
 * The hold reached its target.
 *
 * Rewinds first: after the first set the player sits at the end of the clip,
 * and `play` from there is silence. The seek is asynchronous, so playback is
 * chained onto it rather than raced against it.
 */
export function beepTargetReached(): void {
  const current = ensurePlayer();

  if (!current) {
    return;
  }

  current
    .seekTo(0)
    .then(() => current.play())
    .catch(() => {
      // Deliberately silent. See the contract above.
    });
}
