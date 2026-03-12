import { headers } from "next/headers";

import { OrderTrackingWorkspace } from "@/components/order-tracking-workspace";
import { getTenantConfig } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function OrderTrackingPage({
  params
}: {
  params: Promise<{ orderId: string }>;
}) {
  getTenantConfig((await headers()).get("host") || "localhost:3000");
  const orderId = (await params).orderId;

  return <OrderTrackingWorkspace orderId={orderId} />;
}
