import { AnalyticsCards, ChartCard } from "@dokanx/ui";

import { createServerApi } from "@/lib/server-api";

export default async function AnalyticsPage() {
  const metrics = await createServerApi().analytics.adminMetrics();
  const cards = Object.entries(metrics.data || {}).slice(0, 4);

  return (
    <div className="grid gap-6">
      <AnalyticsCards
        items={cards.map(([label, value]) => ({
          label,
          value: typeof value === "object" ? "Available" : String(value)
        }))}
      />
      <ChartCard
        title="Platform Snapshot"
        description="Admin metrics integration layer"
        data={cards.map(([label], index) => ({
          label,
          value: index + 1
        }))}
      />
    </div>
  );
}
