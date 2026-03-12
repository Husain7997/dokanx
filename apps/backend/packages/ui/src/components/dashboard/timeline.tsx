import { Card, CardTitle } from "../ui/card";

export function Timeline({
  items
}: {
  items: { title: string; description?: string; time?: string }[];
}) {
  return (
    <Card>
      <CardTitle>Timeline</CardTitle>
      <ol className="mt-6 grid gap-5">
        {items.map((item) => (
          <li key={`${item.title}-${item.time ?? ""}`} className="flex gap-4">
            <div className="mt-1 h-3 w-3 rounded-full bg-primary" />
            <div>
              <p className="text-sm font-medium">{item.title}</p>
              {item.description ? <p className="mt-1 text-sm text-muted-foreground">{item.description}</p> : null}
              {item.time ? <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.time}</p> : null}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
