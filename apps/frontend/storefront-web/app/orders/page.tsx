import { headers } from "next/headers";

import { OrdersWorkspace } from "@/components/orders-workspace";
import { getTenantConfig } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  getTenantConfig((await headers()).get("host") || "localhost:3000");

  return <OrdersWorkspace />;
}
