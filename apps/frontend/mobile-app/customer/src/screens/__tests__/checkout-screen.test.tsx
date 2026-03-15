import React from "react";
import { render } from "@testing-library/react-native";

import { CheckoutScreen } from "../checkout-screen";

test("renders checkout screen", () => {
  const { getByText } = render(<CheckoutScreen />);
  expect(getByText("Checkout")).toBeTruthy();
});
