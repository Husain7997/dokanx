import type { InputHTMLAttributes } from "react";

import { Input } from "./input";

export function DatePicker(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return <Input type="date" {...props} />;
}
