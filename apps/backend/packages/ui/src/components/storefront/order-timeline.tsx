import { Timeline } from "../dashboard/timeline";

export function OrderTimeline({
  items
}: {
  items: { title: string; description?: string; time?: string }[];
}) {
  return <Timeline items={items} />;
}
