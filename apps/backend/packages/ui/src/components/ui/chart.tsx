import { cn } from "../../lib/utils";

export type ChartDatum = {
  label: string;
  value: number;
};

export function Chart({
  data,
  className
}: {
  data: ChartDatum[];
  className?: string;
}) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className={cn("grid gap-4", className)}>
      <div className="flex h-56 items-end gap-3">
        {data.map((item) => (
          <div key={item.label} className="flex flex-1 flex-col items-center gap-3">
            <div
              className="w-full rounded-t-[var(--radius-md)] bg-gradient-to-t from-primary to-secondary"
              style={{ height: `${(item.value / max) * 100}%` }}
            />
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
