import { Card, CardDescription, CardTitle } from "../ui/card";

export function MetricCard({
  label,
  value,
  helper
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <Card>
      <CardDescription>{label}</CardDescription>
      <CardTitle className="mt-3">{value}</CardTitle>
      {helper ? <p className="mt-3 text-sm text-muted-foreground">{helper}</p> : null}
    </Card>
  );
}
