"use client";

import { useMemo, useState } from "react";
import { Button, Input, InventoryTable, OrdersTable } from "@dokanx/ui";

import { WorkspaceCard } from "./workspace-card";

type DraftProduct = {
  name: string;
  category: string;
  price: string;
  stock: string;
};

export function ProductWorkspace() {
  const [draft, setDraft] = useState<DraftProduct>({
    name: "Creator Lamp",
    category: "Home Tech",
    price: "2600",
    stock: "14",
  });
  const [message, setMessage] = useState("Draft mode active. Submit is currently local until backend write mutation is wired.");

  const inventoryRows = useMemo(
    () => [
      { item: draft.name, sku: "DX-SKU-001", stock: draft.stock, state: Number(draft.stock) <= 5 ? "Low" : "Healthy" },
      { item: "Studio Wireless Headphones", sku: "DX-SKU-002", stock: "12", state: "Healthy" },
      { item: "Portable Speaker", sku: "DX-SKU-003", stock: "4", state: "Low" },
    ],
    [draft.name, draft.stock],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_420px]">
      <WorkspaceCard
        title="Product draft"
        description="Catalog CRUD surface is now interactive. The next backend pass can connect this form to product create and update endpoints."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm">
            <span>Name</span>
            <Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Category</span>
            <Input value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Price</span>
            <Input value={draft.price} onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))} />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Stock</span>
            <Input value={draft.stock} onChange={(event) => setDraft((current) => ({ ...current, stock: event.target.value }))} />
          </label>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => setMessage(`Saved local draft for ${draft.name}.`)}>Save Draft</Button>
          <Button variant="secondary" onClick={() => setMessage(`Queued publish flow for ${draft.name}.`)}>
            Queue Publish
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      </WorkspaceCard>

      <WorkspaceCard
        title="Recent catalog activity"
        description="Side panel shows how inventory and latest order context can sit beside the draft editor."
      >
        <div className="grid gap-6">
          <InventoryTable rows={inventoryRows} />
          <OrdersTable
            rows={[
              { order: "DX-2091", customer: "Nadia", total: "5400 BDT", status: "Packed" },
              { order: "DX-2084", customer: "Rafi", total: "2600 BDT", status: "Pending" },
            ]}
          />
        </div>
      </WorkspaceCard>
    </div>
  );
}
