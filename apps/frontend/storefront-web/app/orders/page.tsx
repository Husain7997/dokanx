import { OrderTimeline } from "@dokanx/ui";
import { headers } from "next/headers";

import { getOrdersData } from "@/lib/server-data";
import { getTenantConfig } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const tenant = getTenantConfig((await headers()).get("host") || "localhost:3000");
  const orders = await getOrdersData(tenant);

  return (
    <OrderTimeline
      items={orders.slice(0, 6).map((order) => ({
        title: `Order ${order.id || order._id || ""}`,
        description: order.status,
        time: order.createdAt || "Pending"
      }))}
    />
  );
}
