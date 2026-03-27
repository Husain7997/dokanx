import { Card, CardDescription, CardTitle, InventoryTable } from "@dokanx/ui";

import { createServerApi } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const inventory = await createServerApi().inventory.list();

  return (
    <Card>
      <CardTitle>Inventory overview</CardTitle>
      <CardDescription className="mt-2">Live warehouse stock snapshots.</CardDescription>
      <div className="mt-4">
        <InventoryTable
          rows={(inventory.data || []).map((row) => ({
            item: row.productId,
            sku: row.warehouseId || "Primary",
            stock: String(row.available),
            state: (row.available || 0) <= (row.reorderPoint || 0) ? "Low" : "Healthy"
          }))}
        />
      </div>
    </Card>
  );
}
