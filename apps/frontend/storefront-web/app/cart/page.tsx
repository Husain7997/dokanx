import { CartPanel } from "@dokanx/ui";
import { headers } from "next/headers";

import { getCartData } from "@/lib/server-data";
import { getTenantConfig } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const tenant = getTenantConfig((await headers()).get("host") || "localhost:3000");
  const cart = await getCartData(tenant);

  return (
    <CartPanel
      items={(cart.items || []).map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price
      }))}
    />
  );
}
