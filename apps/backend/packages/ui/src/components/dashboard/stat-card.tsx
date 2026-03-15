import { Badge } from "../ui/badge";
import { Card, CardDescription, CardTitle } from "../ui/card";

export function StatCard({
  label,
  value,
  trend
}: {
  label: string;
  value: string;
  trend?: string;
}) {
  return (
    <Card>
      <CardDescription>{label}</CardDescription>
      <CardTitle className="mt-3 text-3xl">{value}</CardTitle>
      {trend ? <Badge className="mt-4" variant="success">{trend}</Badge> : null}
    </Card>
  );
}
