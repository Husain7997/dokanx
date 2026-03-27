import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-accent text-accent-foreground",
        secondary: "bg-accent text-accent-foreground",
        success: "bg-[hsl(var(--success)/0.14)] text-[hsl(var(--success))]",
        warning: "bg-[hsl(var(--warning)/0.14)] text-[hsl(var(--warning))]",
        danger: "bg-[hsl(var(--destructive)/0.14)] text-[hsl(var(--destructive))]",
        outline: "border border-border bg-card text-card-foreground"
      }
    },
    defaultVariants: {
      variant: "neutral"
    }
  }
);

export function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
