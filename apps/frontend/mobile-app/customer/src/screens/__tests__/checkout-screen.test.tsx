import React from "react";
import { render } from "@testing-library/react-native";
import { NavigationContainer } from "@react-navigation/native";

import { CheckoutScreen } from "../checkout-screen";

test("renders checkout screen", () => {
  const { getByText } = render(
    <NavigationContainer>
      <CheckoutScreen />
    </NavigationContainer>
  );
  expect(getByText("Checkout")).toBeTruthy();
});
