import { OrdersTable } from "@dokanx/ui";

import { createServerApi } from "@/lib/server-api";

export default async function OrdersPage() {
  const orders = await createServerApi().order.list();

  return (
    <OrdersTable
      rows={(orders.data || []).map((order) => ({
        order: String(order.id || order._id || ""),
        customer: order.shopId || "Tenant",
        total: String(order.totalAmount),
        status: order.status
      }))}
    />
  );
}
