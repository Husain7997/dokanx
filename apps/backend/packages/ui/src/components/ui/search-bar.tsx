import type { InputHTMLAttributes } from "react";

import { Button } from "./button";
import { Input } from "./input";

export function SearchBar(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex w-full items-center gap-2">
      <Input {...props} />
      <Button type="button" variant="outline">
        Search
      </Button>
    </div>
  );
}
