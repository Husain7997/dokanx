import { Card, CardDescription, CardTitle } from "../ui/card";

export function ActivityFeed({
  items
}: {
  items: { title: string; description: string; time: string }[];
}) {
  return (
    <Card>
      <CardTitle>Activity Feed</CardTitle>
      <div className="mt-6 grid gap-5">
        {items.map((item) => (
          <div key={`${item.title}-${item.time}`} className="flex gap-4">
            <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
            <div>
              <p className="text-sm font-medium">{item.title}</p>
              <CardDescription className="mt-1">{item.description}</CardDescription>
              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {item.time}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
