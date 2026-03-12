"use client";

import { useMemo, useState } from "react";
import { Button, Input, InventoryTable, OrdersTable } from "@dokanx/ui";

import { createProduct } from "@/lib/runtime-api";

import { OwnerSessionPanel } from "./owner-session-panel";
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
  const [message, setMessage] = useState<string | null>("Owner auth is required before protected product create can succeed.");
  const [submitting, setSubmitting] = useState(false);

  const inventoryRows = useMemo(
    () => [
      { item: draft.name, sku: "DX-SKU-001", stock: draft.stock, state: Number(draft.stock) <= 5 ? "Low" : "Healthy" },
      { item: "Studio Wireless Headphones", sku: "DX-SKU-002", stock: "12", state: "Healthy" },
      { item: "Portable Speaker", sku: "DX-SKU-003", stock: "4", state: "Low" },
    ],
    [draft.name, draft.stock],
  );

  async function handleCreateProduct() {
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await createProduct({
        name: draft.name,
        category: draft.category,
        price: Number(draft.price),
        stock: Number(draft.stock),
      });
      const productName = String(response.data?.name || draft.name);
      setMessage(`Created product in backend: ${productName}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to create product.";
      setMessage(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6">
      <OwnerSessionPanel title="Owner session for catalog mutations" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_420px]">
        <WorkspaceCard
          title="Product draft"
          description="This form now posts directly to the backend create product endpoint for authenticated owners."
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
            <Button onClick={handleCreateProduct} disabled={submitting}>
              {submitting ? "Saving..." : "Create Product"}
            </Button>
            <Button variant="secondary" onClick={() => setMessage(`Catalog draft staged locally for ${draft.name}.`)}>
              Save Draft
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{message}</p>
        </WorkspaceCard>

        <WorkspaceCard
          title="Recent catalog activity"
          description="Side panel keeps inventory and recent order context visible while you submit protected writes."
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
    </div>
  );
}
