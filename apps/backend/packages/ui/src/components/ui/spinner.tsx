import { cn } from "../../lib/utils";

export function Spinner({
  className,
  label = "Loading"
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div className="inline-flex items-center gap-2" role="status" aria-live="polite">
      <span
        className={cn(
          "h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary",
          className
        )}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
