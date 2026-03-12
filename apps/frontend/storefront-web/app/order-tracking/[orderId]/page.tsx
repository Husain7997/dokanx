import { OrderTimeline } from "@dokanx/ui";
import { headers } from "next/headers";

import { createServerApi } from "@/lib/server-api";
import { getTenantConfig } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function OrderTrackingPage({
  params
}: {
  params: Promise<{ orderId: string }>;
}) {
  const tenant = getTenantConfig((await headers()).get("host") || "localhost:3000");
  const orderId = (await params).orderId;
  const order = await createServerApi(tenant).order.track(orderId);

  return (
    <OrderTimeline
      items={[
        {
          title: `Order ${order.data?.id || orderId}`,
          description: order.data?.status || "Tracking initialized",
          time: order.data?.createdAt || "Now"
        }
      ]}
    />
  );
}
