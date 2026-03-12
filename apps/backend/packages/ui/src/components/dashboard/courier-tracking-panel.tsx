import { Badge } from "../ui/badge";
import { Card, CardDescription, CardTitle } from "../ui/card";

export function CourierTrackingPanel({
  courier,
  status,
  checkpoints
}: {
  courier: string;
  status: string;
  checkpoints: { label: string; time: string }[];
}) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <CardTitle>{courier}</CardTitle>
          <CardDescription className="mt-1">Courier status tracking</CardDescription>
        </div>
        <Badge variant="success">{status}</Badge>
      </div>
      <div className="mt-6 grid gap-4">
        {checkpoints.map((point) => (
          <div key={`${point.label}-${point.time}`} className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] bg-accent p-3">
            <span className="text-sm">{point.label}</span>
            <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{point.time}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
