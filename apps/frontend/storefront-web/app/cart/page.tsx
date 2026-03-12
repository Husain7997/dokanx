import { headers } from "next/headers";

import { CartWorkspace } from "@/components/cart-workspace";
import { getCartData, getProductsData } from "@/lib/server-data";
import { getTenantConfig } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const tenant = getTenantConfig((await headers()).get("host") || "localhost:3000");
  const [cart, products] = await Promise.all([
    getCartData(tenant),
    getProductsData(tenant, { limit: "8", minStock: "1" }),
  ]);

  return <CartWorkspace initialCart={cart} initialProducts={products} />;
}
