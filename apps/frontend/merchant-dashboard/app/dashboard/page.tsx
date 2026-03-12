import { AnalyticsCards, SalesChart } from "@dokanx/ui";

import { createServerApi } from "@/lib/server-api";

export default async function DashboardPage() {
  const analytics = await createServerApi().analytics.warehouse();
  const metrics = analytics.data || [];

  return (
    <div className="grid gap-6">
      <AnalyticsCards
        items={metrics.slice(0, 4).map((metric) => ({
          label: metric.label,
          value: String(metric.value)
        }))}
      />
      <SalesChart
        data={metrics.slice(0, 6).map((metric) => ({
          label: metric.label,
          value: metric.value
        }))}
      />
    </div>
  );
}
