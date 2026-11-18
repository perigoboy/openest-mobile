// tests/__mocks__/react-native-safe-area-context.js
const React = require('react');
const { View } = require('react-native');

const MockSafeAreaView = ({ children, ...props }) =>
  React.createElement(View, props, children);

const MockSafeAreaProvider = ({ children }) =>
  React.createElement(View, null, children);

// Contextos usados internamente pelo React Navigation (ex.: BottomTabView).
// Sem eles, renderizar um navegador real no Jest quebra com
// "Cannot read properties of undefined (reading 'Consumer')".
const ZERO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_FRAME = { x: 0, y: 0, width: 390, height: 844 };
const SafeAreaInsetsContext = React.createContext(ZERO_INSETS);
const SafeAreaFrameContext = React.createContext(DEFAULT_FRAME);

module.exports = {
  SafeAreaInsetsContext,
  SafeAreaFrameContext,
  SafeAreaView: MockSafeAreaView,
  SafeAreaProvider: MockSafeAreaProvider,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  initialWindowMetrics: {
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
    frame: { x: 0, y: 0, width: 390, height: 844 },
  },
};