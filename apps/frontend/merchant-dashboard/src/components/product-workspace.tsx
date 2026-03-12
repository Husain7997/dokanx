"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@dokanx/auth";
import { Button, Input, InventoryTable, OrdersTable } from "@dokanx/ui";

import { adjustInventory, createProduct, deleteProduct, listShopProducts, updateProduct } from "@/lib/runtime-api";

import { OwnerSessionPanel } from "./owner-session-panel";
import { WorkspaceCard } from "./workspace-card";

type DraftProduct = {
  name: string;
  category: string;
  price: string;
  stock: string;
};

type ProductRecord = {
  _id?: string;
  name?: string;
  category?: string;
  price?: number;
  stock?: number;
  isActive?: boolean;
};

export function ProductWorkspace() {
  const auth = useAuth();
  const [draft, setDraft] = useState<DraftProduct>({
    name: "Creator Lamp",
    category: "Home Tech",
    price: "2600",
    stock: "14",
  });
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [inventoryDelta, setInventoryDelta] = useState("1");
  const [inventoryNote, setInventoryNote] = useState("Manual merchant adjustment");
  const [message, setMessage] = useState<string | null>("Owner auth is required before protected catalog writes can succeed.");
  const [submitting, setSubmitting] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const shopId = String(auth.user?.shopId || "");

  async function loadProducts(nextSelectedId?: string) {
    if (!shopId) return;

    setLoadingProducts(true);
    try {
      const response = await listShopProducts(shopId);
      const rows = (response.data || []).filter((item) => item.isActive !== false);
      setProducts(rows);
      setSelectedProductId((current) => nextSelectedId || current || String(rows[0]?._id || ""));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load products.");
    } finally {
      setLoadingProducts(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, [shopId]);

  useEffect(() => {
    if (!selectedProductId) return;
    const selected = products.find((item) => String(item._id || "") === selectedProductId);
    if (!selected) return;

    setDraft({
      name: selected.name || "",
      category: selected.category || "",
      price: String(selected.price || 0),
      stock: String(selected.stock || 0),
    });
  }, [selectedProductId, products]);

  const inventoryRows = useMemo(
    () =>
      products.slice(0, 6).map((item, index) => ({
        item: item.name || `Product ${index + 1}`,
        sku: String(item._id || `DX-SKU-${index + 1}`),
        stock: String(item.stock || 0),
        state: Number(item.stock || 0) <= 5 ? "Low" : "Healthy",
      })),
    [products],
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
      const createdId = String(response.product?._id || response.data?._id || "");
      await loadProducts(createdId);
      setMessage(`Created product in backend: ${String(response.product?.name || response.data?.name || draft.name)}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create product.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateProduct() {
    if (!selectedProductId) {
      setMessage("Select a product before updating it.");
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const response = await updateProduct(selectedProductId, {
        name: draft.name,
        category: draft.category,
        price: Number(draft.price),
        stock: Number(draft.stock),
      });
      await loadProducts(selectedProductId);
      setMessage(`Updated product: ${String(response.data?.name || draft.name)}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update product.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteProduct() {
    if (!selectedProductId) {
      setMessage("Select a product before archiving it.");
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      await deleteProduct(selectedProductId);
      setSelectedProductId("");
      await loadProducts();
      setMessage("Product archived.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to archive product.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAdjustInventory() {
    if (!selectedProductId) {
      setMessage("Select a product before adjusting inventory.");
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const response = await adjustInventory({
        product: selectedProductId,
        quantity: Number(inventoryDelta),
        note: inventoryNote,
      });
      await loadProducts(selectedProductId);
      setMessage(response.message || "Inventory adjusted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to adjust inventory.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6">
      <OwnerSessionPanel title="Owner session for catalog mutations" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_420px]">
        <WorkspaceCard
          title="Catalog write workspace"
          description="Create, update, archive, and adjust stock from one owner-authenticated workspace."
        >
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm">
              <span>Existing products</span>
              <select
                className="h-11 rounded-full border border-border bg-background px-4 text-sm"
                value={selectedProductId}
                onChange={(event) => setSelectedProductId(event.target.value)}
                disabled={loadingProducts || !products.length}
              >
                <option value="">Create a new product</option>
                {products.map((product) => (
                  <option key={String(product._id || "")} value={String(product._id || "")}>
                    {product.name || product._id}
                  </option>
                ))}
              </select>
            </label>

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
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={handleCreateProduct} disabled={submitting}>
              {submitting ? "Working..." : "Create Product"}
            </Button>
            <Button variant="secondary" onClick={handleUpdateProduct} disabled={submitting || !selectedProductId}>
              Update Product
            </Button>
            <Button variant="ghost" onClick={handleDeleteProduct} disabled={submitting || !selectedProductId}>
              Archive Product
            </Button>
          </div>

          <div className="mt-8 grid gap-4 rounded-3xl border border-border/60 bg-muted/20 p-4 md:grid-cols-[140px_minmax(0,1fr)_auto]">
            <label className="grid gap-2 text-sm">
              <span>Stock delta</span>
              <Input value={inventoryDelta} onChange={(event) => setInventoryDelta(event.target.value)} />
            </label>
            <label className="grid gap-2 text-sm">
              <span>Adjustment note</span>
              <Input value={inventoryNote} onChange={(event) => setInventoryNote(event.target.value)} />
            </label>
            <div className="flex items-end">
              <Button className="w-full" onClick={handleAdjustInventory} disabled={submitting || !selectedProductId}>
                Adjust Inventory
              </Button>
            </div>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">{message}</p>
        </WorkspaceCard>

        <WorkspaceCard
          title="Current catalog health"
          description="Live rows reflect loaded backend products while the side panel stays useful during edits."
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
