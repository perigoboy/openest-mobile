// tests/__mocks__/react-native-safe-area-context.js
const React = require('react');
const { View } = require('react-native');

const MockSafeAreaView = ({ children, ...props }) =>
  React.createElement(View, props, children);

const MockSafeAreaProvider = ({ children }) =>
  React.createElement(View, null, children);

module.exports = {
  SafeAreaView: MockSafeAreaView,
  SafeAreaProvider: MockSafeAreaProvider,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  initialWindowMetrics: {
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
    frame: { x: 0, y: 0, width: 390, height: 844 },
  },
};