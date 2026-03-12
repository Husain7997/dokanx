import { CartPanel } from "@dokanx/ui";
import { headers } from "next/headers";

import { createServerApi } from "@/lib/server-api";
import { getTenantConfig } from "@/lib/tenant";

export default async function CartPage() {
  const tenant = getTenantConfig((await headers()).get("host") || "localhost:3000");
  const cart = await createServerApi(tenant).cart.get();

  return (
    <CartPanel
      items={(cart.data?.items || []).map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price
      }))}
    />
  );
}
