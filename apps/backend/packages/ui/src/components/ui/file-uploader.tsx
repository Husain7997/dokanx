import type { InputHTMLAttributes } from "react";

import { cn } from "../../lib/utils";

export function FileUploader({
  className,
  label = "Upload file",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border bg-card px-4 py-8 text-center",
        className
      )}
    >
      <span className="text-sm font-medium">{label}</span>
      <span className="mt-1 text-xs text-muted-foreground">Drag and drop or browse</span>
      <input className="sr-only" type="file" {...props} />
    </label>
  );
}
