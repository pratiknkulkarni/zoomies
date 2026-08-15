const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Signs release builds with a real keystore instead of the debug one.
 *
 * Expo's template points `buildTypes.release.signingConfig` at
 * `signingConfigs.debug` and says so in a comment. That is fine until the day
 * the debug keystore is not the same file it was — a new machine, a restored
 * home directory — and then the next APK refuses to install over the one on
 * the phone, and the only way out is an uninstall, which takes the training
 * database with it. Invariant 1 says never lose a set; this is that invariant
 * read across an upgrade rather than across a force-quit.
 *
 * This is a config plugin rather than an edit to `android/app/build.gradle`
 * because `android/` is generated. CLAUDE.md documents `expo prebuild --clean`
 * as the recovery when the native project breaks, and a hand-edit would be
 * silently erased by exactly that command.
 *
 * The credentials live in `~/.gradle/gradle.properties`, which is a machine
 * file and not part of any repository:
 *
 *     ZOOMIES_UPLOAD_STORE_FILE=/home/you/.config/zoomies/zoomies-release.jks
 *     ZOOMIES_UPLOAD_KEY_ALIAS=zoomies
 *     ZOOMIES_UPLOAD_STORE_PASSWORD=...
 *     ZOOMIES_UPLOAD_KEY_PASSWORD=...
 *
 * On a machine without them the release config is left unconfigured on
 * purpose. An unsigned release APK will not install, which is a loud failure.
 * Falling back to the debug key would be a quiet one: installable today,
 * unable to upgrade a properly signed build ever again.
 *
 * **Debug builds are signed with the same key**, when it is available. Android
 * refuses to replace an installed app with one carrying a different signature,
 * so with two identities `npm run deploy` stops working the moment a release
 * build is on the phone, and the only way back is an uninstall — which is the
 * database. One identity also keeps the debug build usable as the escape hatch
 * that can read `zoomies.db` off the device through `run-as`, which a release
 * build cannot do.
 *
 * Where the credentials are absent, debug falls back to Expo's own
 * `debug.keystore` so that a fresh clone still builds and runs.
 */

const MARKER = 'ZOOMIES_UPLOAD_STORE_FILE';

const RELEASE_SIGNING_CONFIG = `
        release {
            // Configured from ~/.gradle/gradle.properties. Absent on a machine
            // that has never released — see plugins/with-release-signing.js.
            if (project.hasProperty('ZOOMIES_UPLOAD_STORE_FILE')) {
                storeFile file(ZOOMIES_UPLOAD_STORE_FILE)
                storePassword ZOOMIES_UPLOAD_STORE_PASSWORD
                keyAlias ZOOMIES_UPLOAD_KEY_ALIAS
                keyPassword ZOOMIES_UPLOAD_KEY_PASSWORD
            }
        }`;

const DEBUG_SIGNING_CONFIG = `        debug {
            // Same key as release when there is one, so that a debug build can
            // replace an installed release build instead of being refused for
            // its signature. See the note at the top of this plugin.
            if (project.hasProperty('ZOOMIES_UPLOAD_STORE_FILE')) {
                storeFile file(ZOOMIES_UPLOAD_STORE_FILE)
                storePassword ZOOMIES_UPLOAD_STORE_PASSWORD
                keyAlias ZOOMIES_UPLOAD_KEY_ALIAS
                keyPassword ZOOMIES_UPLOAD_KEY_PASSWORD
            } else {
                storeFile file('debug.keystore')
                storePassword 'android'
                keyAlias 'androiddebugkey'
                keyPassword 'android'
            }
        }`;

/** The debug block exactly as the Expo template writes it. */
const TEMPLATE_DEBUG_CONFIG =
  /        debug \{\n\s*storeFile file\('debug\.keystore'\)\n\s*storePassword 'android'\n\s*keyAlias 'androiddebugkey'\n\s*keyPassword 'android'\n        \}/;

function useOneKeyForDebugToo(contents) {
  if (!TEMPLATE_DEBUG_CONFIG.test(contents)) {
    throw new Error(
      'with-release-signing: the debug signingConfig in app/build.gradle is ' +
        'not the shape the Expo template writes. The plugin needs updating.'
    );
  }
  return contents.replace(TEMPLATE_DEBUG_CONFIG, DEBUG_SIGNING_CONFIG);
}

function addReleaseSigningConfig(contents) {
  const anchor = contents.indexOf('signingConfigs {');
  if (anchor === -1) {
    throw new Error(
      'with-release-signing: no `signingConfigs {` block in app/build.gradle. ' +
        'The Expo template changed shape; the plugin needs updating.'
    );
  }
  const insertAt = anchor + 'signingConfigs {'.length;
  return contents.slice(0, insertAt) + RELEASE_SIGNING_CONFIG + contents.slice(insertAt);
}

/**
 * `signingConfig signingConfigs.debug` appears twice — once for the debug build
 * type and once for release. Anchoring on `buildTypes {` and taking the first
 * `release {` after it reaches the second occurrence without depending on the
 * comment Expo writes above it.
 */
function pointReleaseAtIt(contents) {
  const pattern = /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/;
  if (!pattern.test(contents)) {
    throw new Error(
      'with-release-signing: could not find the release build type signing ' +
        'config in app/build.gradle. The Expo template changed shape; the ' +
        'plugin needs updating.'
    );
  }
  return contents.replace(pattern, '$1signingConfig signingConfigs.release');
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') {
      throw new Error(
        `with-release-signing: expected a groovy build.gradle, got ${mod.modResults.language}.`
      );
    }
    // Idempotent: prebuild runs on every release, and without this a second run
    // would nest a second release block inside the first.
    if (mod.modResults.contents.includes(MARKER)) {
      return mod;
    }
    let contents = useOneKeyForDebugToo(mod.modResults.contents);
    contents = addReleaseSigningConfig(contents);
    contents = pointReleaseAtIt(contents);
    mod.modResults.contents = contents;
    return mod;
  });
};
