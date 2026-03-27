import { cn } from "../../lib/utils";

export type ChartPoint = {
  label: string;
  value: number;
  color?: string;
};

const defaultPalette = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
  "hsl(var(--success))",
  "hsl(var(--warning))"
];

function normalizePoints(data: ChartPoint[]) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return data.map((item, index) => ({
    ...item,
    color: item.color ?? defaultPalette[index % defaultPalette.length],
    ratio: item.value / max
  }));
}

export function BarChart({ data, className }: { data: ChartPoint[]; className?: string }) {
  const normalized = normalizePoints(data);

  return (
    <div className={cn("flex h-56 items-end gap-3", className)}>
      {normalized.map((item) => (
        <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
          <div
            className="w-full rounded-t-[var(--radius-md)]"
            style={{ height: `${item.ratio * 100}%`, background: item.color }}
          />
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export function LineChart({
  data,
  className
}: {
  data: ChartPoint[];
  className?: string;
}) {
  const normalized = normalizePoints(data);
  const width = 320;
  const height = 160;
  const points = normalized.map((item, index) => {
    const x = (index / Math.max(normalized.length - 1, 1)) * width;
    const y = height - item.ratio * height;
    return `${x},${y}`;
  });

  return (
    <div className={cn("w-full", className)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <polyline
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="3"
          points={points.join(" ")}
        />
      </svg>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        {normalized.map((item) => (
          <span key={item.label}>{item.label}</span>
        ))}
      </div>
    </div>
  );
}

export function AreaChart({
  data,
  className
}: {
  data: ChartPoint[];
  className?: string;
}) {
  const normalized = normalizePoints(data);
  const width = 320;
  const height = 160;
  const linePoints = normalized.map((item, index) => {
    const x = (index / Math.max(normalized.length - 1, 1)) * width;
    const y = height - item.ratio * height;
    return `${x},${y}`;
  });
  const areaPoints = [`0,${height}`, ...linePoints, `${width},${height}`];

  return (
    <div className={cn("w-full", className)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <polygon fill="hsl(var(--primary)/0.2)" points={areaPoints.join(" ")} />
        <polyline
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="3"
          points={linePoints.join(" ")}
        />
      </svg>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        {normalized.map((item) => (
          <span key={item.label}>{item.label}</span>
        ))}
      </div>
    </div>
  );
}

export function PieChart({
  data,
  className
}: {
  data: ChartPoint[];
  className?: string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  let current = 0;
  const gradient = data
    .map((item, index) => {
      const color = item.color ?? defaultPalette[index % defaultPalette.length];
      const start = (current / total) * 360;
      current += item.value;
      const end = (current / total) * 360;
      return `${color} ${start}deg ${end}deg`;
    })
    .join(", ");

  return (
    <div className={cn("flex items-center gap-6", className)}>
      <div
        className="h-40 w-40 rounded-full"
        style={{ background: `conic-gradient(${gradient})` }}
      />
      <div className="space-y-2 text-sm text-muted-foreground">
        {data.map((item, index) => (
          <div key={item.label} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: item.color ?? defaultPalette[index % defaultPalette.length] }}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export * from "./adapters";
