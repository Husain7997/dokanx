import { OrderTimeline } from "@dokanx/ui";
import { headers } from "next/headers";

import { getOrdersData } from "@/lib/server-data";
import { getTenantConfig } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function OrderTrackingPage({
  params
}: {
  params: Promise<{ orderId: string }>;
}) {
  const tenant = getTenantConfig((await headers()).get("host") || "localhost:3000");
  const orderId = (await params).orderId;
  const orders = await getOrdersData(tenant);
  const order = orders.find((item) => item.id === orderId) || orders[0];

  return (
    <OrderTimeline
      items={[
        {
          title: `Order ${order?.id || orderId}`,
          description: order?.status || "Tracking initialized",
          time: order?.createdAt || "Now"
        }
      ]}
    />
  );
}
