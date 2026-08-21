"""
Generates the three tones a countdown makes.

Run from the repository root:

    python3 scripts/tones.py

Regenerate rather than edit: these are outputs, not sources. `lib/sound.ts` is
the other half of this file and says what each one means.

**Three tones, and the vocabulary is what matters.** A countdown is heard from
the floor with the phone face down and eyes on the rings, so the sounds have to
carry three facts without being looked at: time is nearly up, the effort is
over, the rest is over. The count is a neutral note; the two endings resolve
away from it in opposite directions — down to stop, up to go — so which one
just played is a direction rather than something to remember.

Sine, one note, no harmonics. It has to cut through a room without becoming an
alarm, and the fade is what keeps a hard-edged 880Hz burst from clicking.
"""

import math
import struct
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"

RATE = 44100
# Matches the peak of the tones this replaces, so the app does not get louder
# or quieter on upgrade.
PEAK = 0.6

# A5 for the count, and an octave-spanning fifth either side of it for the two
# endings: E5 below, E6 above. Every pitch already existed in the tones these
# replace, which were built from the same three notes.
A5 = 880.00
E5 = 659.25
E6 = 1318.51

# 70ms reads as a tick rather than a note. 900ms is unmistakably longer at any
# distance, and lands its release just before the figure reaches zero — the
# tone begins on the last second and ends when the second does.
TICK_MS = 70
FINAL_MS = 900


def tone(freq: float, ms: int, fade_ms: float) -> bytes:
    """One faded sine, as 16-bit mono frames."""
    total = int(RATE * ms / 1000)
    fade = max(1, int(RATE * fade_ms / 1000))
    frames = []

    for i in range(total):
        # Linear in and out. Long enough to remove the click, short enough that
        # the tone still starts on time rather than swelling into place.
        envelope = min(1.0, (i + 1) / fade, (total - i) / fade)
        value = PEAK * envelope * math.sin(2 * math.pi * freq * i / RATE)
        frames.append(int(value * 32767))

    return struct.pack("<%dh" % total, *frames)


def write(name: str, frames: bytes) -> None:
    path = ASSETS / name
    with wave.open(str(path), "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(RATE)
        out.writeframes(frames)
    print("%-22s %5.0fms  %d bytes" % (name, len(frames) / 2 / RATE * 1000, len(frames)))


if __name__ == "__main__":
    write("tone-tick.wav", tone(A5, TICK_MS, 6))
    write("tone-stop.wav", tone(E5, FINAL_MS, 25))
    write("tone-go.wav", tone(E6, FINAL_MS, 25))
