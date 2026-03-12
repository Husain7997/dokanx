import { Card, CardDescription, CardTitle } from "../ui/card";

export type AnalyticsCardItem = {
  label: string;
  value: string;
  meta?: string;
};

export function AnalyticsCards({ items }: { items: AnalyticsCardItem[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardDescription>{item.label}</CardDescription>
          <CardTitle className="mt-3 text-3xl">{item.value}</CardTitle>
          {item.meta ? <p className="mt-2 text-sm text-muted-foreground">{item.meta}</p> : null}
        </Card>
      ))}
    </div>
  );
}
