import type { ChartDatum } from "../ui/chart";
import { Card, CardDescription, CardTitle } from "../ui/card";
import { Chart } from "../ui/chart";

export function ChartCard({
  title,
  description,
  data
}: {
  title: string;
  description?: string;
  data: ChartDatum[];
}) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      {description ? <CardDescription className="mt-2">{description}</CardDescription> : null}
      <Chart className="mt-6" data={data} />
    </Card>
  );
}
