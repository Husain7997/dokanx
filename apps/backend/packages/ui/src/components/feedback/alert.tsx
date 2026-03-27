import type { HTMLAttributes } from "react";

import { cn } from "../../lib/utils";

const variantClasses = {
  success: "border-[hsl(var(--success))] bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]",
  warning: "border-[hsl(var(--warning))] bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))]",
  error: "border-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/0.12)] text-[hsl(var(--destructive))]",
  info: "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]"
};

export function Alert({
  className,
  variant = "info",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  variant?: keyof typeof variantClasses;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border px-4 py-3 text-sm",
        variantClasses[variant],
        className
      )}
      role="status"
      {...props}
    />
  );
}
