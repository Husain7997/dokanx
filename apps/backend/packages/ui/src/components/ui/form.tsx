import * as LabelPrimitive from "@radix-ui/react-label";
import type { HTMLAttributes } from "react";

import { cn } from "../../lib/utils";

export const FormLabel = LabelPrimitive.Root;

export function FormField({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-2", className)} {...props} />;
}

export function FormDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function FormMessage({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-[hsl(var(--destructive))]", className)} {...props} />;
}
