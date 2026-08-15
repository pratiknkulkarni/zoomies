#!/usr/bin/env bash
#
# One command from a commit on `main` to an installable, versioned APK on the
# repository's releases page.
#
#   npm run release -- patch     1.0.0 -> 1.0.1
#   npm run release -- minor     1.0.0 -> 1.1.0
#   npm run release -- major     1.0.0 -> 2.0.0
#   npm run release -- 1.4.2     exactly that
#
# The checks come first and the push comes last, so a release that is going to
# fail fails before anything is tagged or published. Nothing here is
# recoverable-by-force: a bad tag has to be deleted in two places.
#
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

BUMP="${1:-}"
[ -n "$BUMP" ] || { echo "usage: npm run release -- patch|minor|major|X.Y.Z" >&2; exit 1; }

say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }

# ---------------------------------------------------------------------------
# 1. Refuse to release from a state that cannot be reproduced later
# ---------------------------------------------------------------------------

say "Checking the working tree"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
[ "$BRANCH" = "main" ] || { echo "On $BRANCH. Releases are cut from main." >&2; exit 1; }

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is dirty. Commit or stash first:" >&2
  git status --short >&2
  exit 1
fi

git fetch --quiet origin main
LOCAL="$(git rev-parse @)"
REMOTE="$(git rev-parse @{u})"
if [ "$LOCAL" != "$REMOTE" ]; then
  echo "main and origin/main have diverged. Pull or push first." >&2
  exit 1
fi

# The keystore is the difference between an APK that upgrades the one on the
# phone and one that demands an uninstall, which would take the database with
# it. Checked here rather than left to Gradle, whose failure is a null path.
if ! grep -q '^ZOOMIES_UPLOAD_STORE_FILE=' "$HOME/.gradle/gradle.properties" 2>/dev/null; then
  echo "No signing credentials in ~/.gradle/gradle.properties." >&2
  echo "See plugins/with-release-signing.js for the four properties needed." >&2
  exit 1
fi
KEYSTORE="$(sed -n 's/^ZOOMIES_UPLOAD_STORE_FILE=//p' "$HOME/.gradle/gradle.properties")"
[ -f "$KEYSTORE" ] || { echo "Keystore missing: $KEYSTORE" >&2; exit 1; }

# ---------------------------------------------------------------------------
# 2. Everything that can say no
# ---------------------------------------------------------------------------

say "Typecheck"; npm run --silent typecheck
say "Lint";      npm run --silent lint
say "Tests";     npm run --silent test

# ---------------------------------------------------------------------------
# 3. Version
# ---------------------------------------------------------------------------

say "Bumping the version"

read -r VERSION VERSION_CODE <<EOF
$(python3 scripts/version.py "$BUMP")
EOF
TAG="v$VERSION"

if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Tag $TAG already exists." >&2
  exit 1
fi
echo "$VERSION  (versionCode $VERSION_CODE)"

# `prebuild` is what copies version and versionCode out of app.json and into
# build.gradle, so it has to follow the bump rather than precede it. It also
# clears android/, which takes local.properties with it — CLAUDE.md says why
# that file is the one prebuild will not recreate.
say "Prebuild"
npx expo prebuild --platform android --no-install
printf 'sdk.dir=%s/Android/Sdk\n' "$HOME" > android/local.properties

# ---------------------------------------------------------------------------
# 4. Build, and prove it is signed with the right key
# ---------------------------------------------------------------------------

say "Building the release APK"
npm run --silent apk:release

APK=android/app/build/outputs/apk/release/app-release.apk
[ -f "$APK" ] || { echo "Gradle produced no APK at $APK" >&2; exit 1; }

# `apksigner`, not `keytool -printcert -jarfile`: Gradle signs with v2/v3 and
# leaves the v1 JAR signature off, so keytool reports an unsigned jar and the
# check would pass on a debug-signed APK — silently, which is the one outcome
# worth guarding against.
APKSIGNER="$(find "$HOME/Android/Sdk/build-tools" -maxdepth 2 -name apksigner 2>/dev/null | sort -r | head -1)"
if [ -z "$APKSIGNER" ]; then
  echo "No apksigner in the Android SDK build-tools; cannot verify the signature." >&2
  exit 1
fi
if "$APKSIGNER" verify --print-certs "$APK" | grep -q 'CN=Android Debug'; then
  echo "This APK is signed with the debug key — the signing plugin did not apply." >&2
  echo "Installing it would make every properly signed build after it unable to" >&2
  echo "upgrade the phone without an uninstall." >&2
  exit 1
fi

NAMED="/tmp/zoomies-$VERSION.apk"
cp "$APK" "$NAMED"

# ---------------------------------------------------------------------------
# 5. Commit, tag, push, publish
# ---------------------------------------------------------------------------

say "Tagging $TAG"

PREV="$(git describe --tags --abbrev=0 2>/dev/null || true)"
NOTES="$(mktemp)"
{
  if [ -n "$PREV" ]; then
    git log "$PREV..HEAD" --no-merges --format='- %s'
  else
    echo "- First release."
  fi
  echo
  echo "Install by downloading the APK below on the phone. It installs over"
  echo "any previous Zoomies without touching the database."
} > "$NOTES"

git add app.json package.json package-lock.json
git commit -q -m "Release $TAG"
git tag -a "$TAG" -m "Zoomies $VERSION"
git push --quiet origin main
git push --quiet origin "$TAG"

say "Publishing to Gitea"
scripts/gitea.sh release "$TAG" "Zoomies $VERSION" "$NOTES" "$NAMED"
rm -f "$NOTES"

# ---------------------------------------------------------------------------
# 6. The phone, if it is here
# ---------------------------------------------------------------------------

if [ -n "$(adb devices | awk 'NR>1 && $2=="device"')" ]; then
  say "Installing on the attached device"
  adb ${ZOOMIES_DEVICE:+-s $ZOOMIES_DEVICE} install -r "$NAMED"
else
  say "No device attached — download the APK from the releases page instead."
fi
