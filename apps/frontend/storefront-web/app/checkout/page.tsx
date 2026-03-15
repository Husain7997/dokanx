import { headers } from "next/headers";

import { CheckoutWorkspace } from "@/components/checkout-workspace";
import { getCartData } from "@/lib/server-data";
import { getTenantConfig } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams?: Promise<{ shopId?: string }>;
}) {
  const tenant = getTenantConfig((await headers()).get("host") || "localhost:3000");
  const cart = await getCartData(tenant);
  const firstItem = cart.items[0] as ((typeof cart.items)[number] & { shopId?: string }) | undefined;
  const query = (await searchParams) || {};
  const suggestedShopId = query.shopId || firstItem?.shopId || null;

  return <CheckoutWorkspace cart={cart} suggestedShopId={suggestedShopId} />;
}
