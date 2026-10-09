module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/__mocks__/@react-native-async-storage/async-storage.ts',
    '^react-native-url-polyfill/auto$': '<rootDir>/__mocks__/reactNativeUrlPolyfill.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((@)?react-native|@react-navigation|react-native-screens|react-native-safe-area-context)/)',
  ],
};
