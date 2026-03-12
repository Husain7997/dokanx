import { cn } from "../../lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[var(--radius-md)] bg-gradient-to-r from-accent via-muted to-accent",
        className
      )}
    />
  );
}
