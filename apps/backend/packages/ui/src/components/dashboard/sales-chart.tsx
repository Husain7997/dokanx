import type { ChartDatum } from "../ui/chart";
import { ChartCard } from "./chart-card";

export function SalesChart({ data }: { data: ChartDatum[] }) {
  return <ChartCard title="Sales" description="Sales performance overview" data={data} />;
}
