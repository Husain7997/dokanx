import React from "react";
import { render } from "@testing-library/react-native";
import { NavigationContainer } from "@react-navigation/native";

import { AuthScreen } from "../auth-screen";

test("renders auth screen", () => {
  const { getByText } = render(
    <NavigationContainer>
      <AuthScreen />
    </NavigationContainer>
  );
  expect(getByText("Welcome back")).toBeTruthy();
});
