import React from "react";
import { render } from "@testing-library/react-native";
import { NavigationContainer } from "@react-navigation/native";

import { CartScreen } from "../cart-screen";

test("renders cart screen", () => {
  const { getByText } = render(
    <NavigationContainer>
      <CartScreen />
    </NavigationContainer>
  );
  expect(getByText("Cart Summary")).toBeTruthy();
});
