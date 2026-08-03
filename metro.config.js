const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Let Metro resolve the .sql migration files that babel-plugin-inline-import
// inlines. Without this the generated migrations are invisible to the bundler.
config.resolver.sourceExts.push('sql');

module.exports = withNativeWind(config, { input: './global.css' });
