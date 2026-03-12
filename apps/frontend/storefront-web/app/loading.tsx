import { Skeleton } from "@dokanx/ui";

export default function Loading() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-12 w-1/3" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
