import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

/**
 * FEATURES.md §8 — the two moments a timer has to announce without being
 * looked at.
 *
 * A hold usually means the phone is on the floor or propped against a wall
 * rather than in your hand, so a haptic alone can go unfelt. The sound is what
 * actually reaches you; `lib/haptics.ts` fires alongside for the case where it
 * does not.
 *
 * **Two sounds, because there are two opposite instructions.** §8.2's cycle
 * runs hands-free — ten rounds of jump rope, phone on the floor, never touched
 * — and in it one tone would have to mean both *stop* and *go*. They are told
 * apart by shape rather than pitch: the hold ends on two pulses at one note,
 * and rest ends on three climbing ones.
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

const sources = {
  target: require('../assets/beep.wav'),
  go: require('../assets/beep-go.wav'),
};

type Tone = keyof typeof sources;

/**
 * Built once each, lazily, and kept. A player per beep would allocate a decoder
 * for every set and make the first sound lag behind the moment it is reporting.
 */
const players = new Map<Tone, AudioPlayer | null>();

function ensurePlayer(tone: Tone): AudioPlayer | null {
  const existing = players.get(tone);

  if (existing !== undefined) {
    return existing;
  }

  let player: AudioPlayer | null;

  try {
    player = createAudioPlayer(sources[tone]);
  } catch {
    player = null;
  }

  // Cached even when null, so a device that cannot build a player does not
  // retry the failure on every set.
  players.set(tone, player);

  return player;
}

/**
 * Rewinds first: after the first set the player sits at the end of the clip,
 * and `play` from there is silence. The seek is asynchronous, so playback is
 * chained onto it rather than raced against it.
 */
function play(tone: Tone): void {
  const player = ensurePlayer(tone);

  if (!player) {
    return;
  }

  player
    .seekTo(0)
    .then(() => player.play())
    .catch(() => {
      // Deliberately silent. See the contract above.
    });
}

/** The hold reached its target. Stop. */
export function beepTargetReached(): void {
  play('target');
}

/**
 * Rest is over and the next set is starting (§8.2). Go.
 *
 * Fired as the hold begins rather than after it, because it is the instruction
 * to move — a beep that arrived once the countdown was already running would be
 * announcing time you had lost.
 */
export function beepRestOver(): void {
  play('go');
}
