const React = require("react");
const { SafeAreaView: NativeSafeAreaView, View } = require("react-native");

function SafeAreaProvider({ children }) {
  return React.createElement(View, { style: { flex: 1 } }, children);
}

function SafeAreaView(props) {
  return React.createElement(NativeSafeAreaView, props, props.children);
}

function useSafeAreaInsets() {
  return { top: 0, right: 0, bottom: 0, left: 0 };
}

function useSafeAreaFrame() {
  return { x: 0, y: 0, width: 0, height: 0 };
}

module.exports = {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
  useSafeAreaFrame,
  initialWindowMetrics: null,
};
