import React from "react";
import { render } from "@testing-library/react-native";

import { CartScreen } from "../cart-screen";

test("renders cart screen", () => {
  const { getByText } = render(<CartScreen />);
  expect(getByText("Cart Summary")).toBeTruthy();
});
