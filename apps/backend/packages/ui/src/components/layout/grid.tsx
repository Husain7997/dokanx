import type { CSSProperties, HTMLAttributes } from "react";

import { cn } from "../../lib/utils";

export function Grid({
  columns = 3,
  gap = "1.5rem",
  minColumnWidth,
  className,
  style,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  columns?: number;
  gap?: string;
  minColumnWidth?: string;
}) {
  const template = minColumnWidth
    ? `repeat(auto-fit, minmax(${minColumnWidth}, 1fr))`
    : `repeat(${columns}, minmax(0, 1fr))`;

  return (
    <div
      className={cn("grid", className)}
      style={{
        gridTemplateColumns: template,
        gap,
        ...style
      } as CSSProperties}
      {...props}
    />
  );
}
