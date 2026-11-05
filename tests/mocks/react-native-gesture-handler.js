const React = require("react");
const { View } = require("react-native");

const createGesture = () => {
  const gesture = {
    onUpdate: () => gesture,
    onEnd: () => gesture,
  };
  return gesture;
};

module.exports = {
  GestureHandlerRootView: View,
  GestureDetector: ({ children }) =>
    React.createElement(React.Fragment, null, children),
  Gesture: {
    Pan: createGesture,
  },
};
