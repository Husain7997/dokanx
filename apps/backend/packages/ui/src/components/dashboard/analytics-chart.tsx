import type { ChartDatum } from "../ui/chart";
import { Card, CardTitle } from "../ui/card";
import { Chart } from "../ui/chart";

export function AnalyticsChart({
  title,
  data
}: {
  title: string;
  data: ChartDatum[];
}) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <Chart className="mt-6" data={data} />
    </Card>
  );
}
