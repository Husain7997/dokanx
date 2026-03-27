const React = require("react");
const {
  Pressable,
  SafeAreaView,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableHighlight,
  TouchableNativeFeedback,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} = require("react-native");

const makePassthrough = (Component) => React.forwardRef((props, ref) => React.createElement(Component, { ...props, ref }, props.children));

const GestureHandlerRootView = makePassthrough(View);
const GestureDetector = makePassthrough(View);
const PanGestureHandler = makePassthrough(View);
const TapGestureHandler = makePassthrough(View);
const LongPressGestureHandler = makePassthrough(View);
const FlingGestureHandler = makePassthrough(View);
const PinchGestureHandler = makePassthrough(View);
const RotationGestureHandler = makePassthrough(View);
const ForceTouchGestureHandler = makePassthrough(View);
const NativeViewGestureHandler = makePassthrough(View);
const RawButton = makePassthrough(Pressable);
const BaseButton = makePassthrough(Pressable);
const BorderlessButton = makePassthrough(Pressable);
const RectButton = makePassthrough(Pressable);
const gestureHandlerRootHOC = (Component) => Component;
const createNativeWrapper = (Component) => Component;
const Directions = { RIGHT: 1, LEFT: 2, UP: 4, DOWN: 8 };
const State = { UNDETERMINED: 0, FAILED: 1, BEGAN: 2, CANCELLED: 3, ACTIVE: 4, END: 5 };
const PointerType = { TOUCH: 0, STYLUS: 1, MOUSE: 2, KEY: 3, OTHER: 4 };
const Gesture = {
  Fling: () => ({ enabled: () => Gesture.Fling() }),
  Pan: () => ({ enabled: () => Gesture.Pan() }),
  Tap: () => ({ enabled: () => Gesture.Tap() }),
  LongPress: () => ({ enabled: () => Gesture.LongPress() }),
  Native: () => ({ enabled: () => Gesture.Native() }),
  Race: (...gestures) => ({ gestures }),
  Simultaneous: (...gestures) => ({ gestures }),
  Exclusive: (...gestures) => ({ gestures }),
};

module.exports = {
  BaseButton,
  BorderlessButton,
  Directions,
  FlingGestureHandler,
  ForceTouchGestureHandler,
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
  LongPressGestureHandler,
  NativeViewGestureHandler,
  PanGestureHandler,
  PinchGestureHandler,
  PointerType,
  RawButton,
  RectButton,
  RotationGestureHandler,
  SafeAreaView,
  ScrollView,
  State,
  Switch,
  TapGestureHandler,
  Text,
  TextInput,
  TouchableHighlight,
  TouchableNativeFeedback,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  createNativeWrapper,
  gestureHandlerRootHOC,
};
