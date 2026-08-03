/**
 * expo-splash-screen (57.0.5) always writes a `windowSplashScreenAnimatedIcon`
 * item pointing at `@drawable/splashscreen_logo`, but only generates that
 * drawable when a splash image is configured. Our splash is a background colour
 * only, so the reference dangles and Android resource linking fails.
 *
 * Strip the item. Android falls back to the launcher icon over
 * `splashscreen_background`.
 *
 * Remove this plugin once splash artwork exists — DESIGN.md §12, Phase 11.
 *
 * Must be listed BEFORE expo-splash-screen in app.json: Expo runs mod actions in
 * reverse registration order, so an earlier entry runs after a later one.
 */
const { withAndroidStyles } = require('expo/config-plugins');

const SPLASH_STYLE = 'Theme.App.SplashScreen';
const ICON_ITEM = 'windowSplashScreenAnimatedIcon';

module.exports = function withSplashNoIcon(config) {
  return withAndroidStyles(config, (config) => {
    for (const style of config.modResults.resources.style ?? []) {
      if (style.$.name !== SPLASH_STYLE) continue;
      style.item = (style.item ?? []).filter((item) => item.$.name !== ICON_ITEM);
    }
    return config;
  });
};
