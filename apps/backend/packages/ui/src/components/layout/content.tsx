import type { HTMLAttributes } from "react";

import { cn } from "../../lib/utils";

export function Content({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <main className={cn("flex-1 px-6 py-6", className)} {...props} />;
}
