import { OrderTimeline } from "@dokanx/ui";
import { headers } from "next/headers";

import { createServerApi } from "@/lib/server-api";
import { getTenantConfig } from "@/lib/tenant";

export default async function OrdersPage() {
  const tenant = getTenantConfig((await headers()).get("host") || "localhost:3000");
  const orders = await createServerApi(tenant).order.list();

  return (
    <OrderTimeline
      items={(orders.data || []).slice(0, 6).map((order) => ({
        title: `Order ${order.id || order._id || ""}`,
        description: order.status,
        time: order.createdAt || "Pending"
      }))}
    />
  );
}
