import React from "react";
import { View } from "react-native";

import { RootNavigator } from "./navigation/root-navigator";

console.log("[merchant-app] app module loaded");

export default function App() {
  console.log("[merchant-app] app function invoked");
  return (
    <View style={{ flex: 1, backgroundColor: "#f4f7fb" }}>
      <RootNavigator />
    </View>
  );
}
