#!/usr/bin/env bash
#
# Regenerates the README screenshots from a seeded database.
#
#   npm run deploy          # a debug build, so a database can be pushed
#   npm run apk:release     # a release build, so the captures are clean
#   npm run screenshots
#
# Reproducible on purpose. `dummy-data.py --seed` writes the same history every
# time, so a regenerated screenshot differs only where the interface did, and a
# redesign is one command away from an honest README rather than a set of images
# quietly going stale.
#
# **It needs both build types, for opposite reasons.**
#
# Pushing a database into the sandbox goes through `adb run-as`, which Android
# refuses for a build that is not debuggable — so the debug build has to be
# installed first. But the debug build is an expo-dev-client, and it floats a
# dev-menu button over every screen, which would appear in all twelve images.
#
# So: push with debug, then install the release APK over it. `adb install -r`
# keeps application data, and both build types share a signature
# (plugins/with-release-signing.js), so the swap costs nothing.
#
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

PKG=com.zoomies.app
OUT=media
DB=/tmp/zoomies-shots.db
IDS=/tmp/zoomies-shot-ids.env
RELEASE_APK=android/app/build/outputs/apk/release/app-release.apk
ADB=(adb ${ZOOMIES_DEVICE:+-s "$ZOOMIES_DEVICE"})

"${ADB[@]}" shell run-as "$PKG" true 2>/dev/null || {
  echo "run-as was refused, so the installed build is not debuggable." >&2
  echo "Run 'npm run deploy' first, then this again." >&2
  exit 1
}
[ -f "$RELEASE_APK" ] || {
  echo "No release APK at $RELEASE_APK." >&2
  echo "Run 'npm run apk:release' first — capturing from the debug build puts" >&2
  echo "the dev-client menu button in every image." >&2
  exit 1
}

# ---------------------------------------------------------------------------
# A database worth photographing
# ---------------------------------------------------------------------------

echo "== Seeding 40 weeks of history"
python3 scripts/dummy-data.py --weeks 40 --seed 7 --out "$DB" >/dev/null
python3 scripts/screenshot-fixture.py "$DB" "$IDS"
# shellcheck disable=SC1090
. "$IDS"

echo "== Pushing it onto the device"
"${ADB[@]}" shell am force-stop "$PKG"
# Via /data/local/tmp: `adb push` cannot write into the sandbox, and `run-as`
# can only read from somewhere world-readable. Each `run-as` runs one command
# with its own arguments — wrapping them in `sh -c` loses the quoting.
"${ADB[@]}" push "$DB" /data/local/tmp/zoomies.db >/dev/null
"${ADB[@]}" shell run-as "$PKG" cp /data/local/tmp/zoomies.db files/SQLite/zoomies.db
# The previous database's write-ahead log would be replayed over the new file
# when it is opened, which either corrupts it or undoes it.
"${ADB[@]}" shell run-as "$PKG" rm -f files/SQLite/zoomies.db-wal
"${ADB[@]}" shell run-as "$PKG" rm -f files/SQLite/zoomies.db-shm
"${ADB[@]}" shell rm -f /data/local/tmp/zoomies.db

echo "== Swapping in the release build"
"${ADB[@]}" install -r "$RELEASE_APK" >/dev/null

mkdir -p "$OUT"

# ---------------------------------------------------------------------------
# Capture
# ---------------------------------------------------------------------------

shoot() {
  "${ADB[@]}" shell am start -a android.intent.action.VIEW -d "zoomies://$1" "$PKG" >/dev/null 2>&1
  sleep 4
  "${ADB[@]}" exec-out screencap -p > "$OUT/$2.png"
  echo "   $OUT/$2.png"
}

for mode in no yes; do
  if [ "$mode" = yes ]; then s="-dark"; else s=""; fi
  echo "== Capturing ${s:+dark}${s:-light}"

  # The seeded database carries no appearance row, so the application follows
  # the system — which is the default it ships with.
  "${ADB[@]}" shell cmd uimode night "$mode" >/dev/null
  sleep 2
  "${ADB[@]}" shell am force-stop "$PKG"
  "${ADB[@]}" shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
  sleep 8

  shoot ""                              "home$s"
  shoot "session/$LIVE_SESSION"         "session$s"
  shoot "history"                       "history$s"
  shoot "history/$HISTORY_SESSION"      "session-detail$s"
  shoot "exercise/$EXERCISE"            "exercise$s"
  shoot "look-back"                     "look-back$s"
done

"${ADB[@]}" shell cmd uimode night auto >/dev/null

echo
echo "Twelve images in $OUT/. The phone is left holding the seeded database —"
echo "reinstall or reset before logging anything real into it."
