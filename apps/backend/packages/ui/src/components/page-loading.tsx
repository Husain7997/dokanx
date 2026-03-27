import { Skeleton } from "./ui/skeleton";

type PageLoadingProps = {
  label?: string;
  title?: string;
  compact?: boolean;
};

export function PageLoading({
  label = "Loading workspace",
  title = "Preparing your page",
  compact = false,
}: PageLoadingProps) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 sm:gap-6">
      <div className="rounded-[28px] border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur sm:p-6">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
              {label}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <Skeleton className="h-8 w-56 max-w-[75vw] sm:h-10 sm:w-72" />
                <p className="text-sm text-muted-foreground">{title}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
                <Skeleton className="h-10 w-full sm:w-28" />
                <Skeleton className="h-10 w-full sm:w-32" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: compact ? 2 : 4 }).map((_, index) => (
          <div
            key={`metric-${index}`}
            className="rounded-[24px] border border-border/70 bg-card/85 p-4 shadow-sm backdrop-blur sm:p-5"
          >
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-4 h-8 w-20" />
            <Skeleton className="mt-3 h-2.5 w-28" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.9fr)]">
        <div className="rounded-[28px] border border-border/70 bg-card/85 p-4 shadow-sm backdrop-blur sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-9 w-20" />
          </div>
          <div className="mt-6 grid gap-3">
            {Array.from({ length: compact ? 3 : 5 }).map((_, index) => (
              <div
                key={`feed-${index}`}
                className="flex items-center gap-3 rounded-[22px] border border-border/60 bg-background/70 px-3 py-3 sm:px-4"
              >
                <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3 w-32 max-w-[60%]" />
                  <Skeleton className="h-2.5 w-full" />
                  <Skeleton className="h-2.5 w-4/5" />
                </div>
                <Skeleton className="hidden h-8 w-16 rounded-full sm:block" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[28px] border border-border/70 bg-card/85 p-4 shadow-sm backdrop-blur sm:p-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-44" />
            </div>
            <Skeleton className="mt-6 h-48 w-full rounded-[22px]" />
          </div>
          <div className="rounded-[28px] border border-border/70 bg-card/85 p-4 shadow-sm backdrop-blur sm:p-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-36" />
            </div>
            <div className="mt-5 grid gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`side-${index}`} className="rounded-[20px] border border-border/60 px-4 py-4">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-3 h-2.5 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
