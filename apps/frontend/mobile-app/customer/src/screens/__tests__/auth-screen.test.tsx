import React from "react";
import { render } from "@testing-library/react-native";

import { AuthScreen } from "../auth-screen";

test("renders auth screen", () => {
  const { getByText } = render(<AuthScreen />);
  expect(getByText("Welcome back")).toBeTruthy();
});
