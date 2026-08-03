module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      // Drizzle's generated migrations are .sql files imported as strings so
      // they ship inside the bundle and run on launch with no filesystem read.
      ['inline-import', { extensions: ['.sql'] }],
      // Reanimated 4 moved its worklet transform into react-native-worklets.
      // Must stay last.
      'react-native-worklets/plugin',
    ],
  };
};
