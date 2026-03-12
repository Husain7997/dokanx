import { AnalyticsCards } from "@dokanx/ui";

import { createServerApi } from "@/lib/server-api";

export default async function TenantsPage() {
  const metrics = await createServerApi().analytics.adminMetrics();

  return (
    <AnalyticsCards
      items={[
        { label: "Orders", value: String((metrics.data as { orders?: number })?.orders || 0) },
        { label: "Wallets", value: "Available" },
        { label: "Courier", value: "Monitored" },
        { label: "Finance", value: "Integrated" }
      ]}
    />
  );
}
