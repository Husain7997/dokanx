"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@dokanx/auth";
import {
  Alert,
  AnalyticsCards,
  Badge,
  Button,
  InventoryTable,
  OrdersTable,
  SearchInput,
  SelectDropdown,
  TextInput
} from "@dokanx/ui";

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
  const [query, setQuery] = useState("");

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

  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return products;
    return products.filter((item) => {
      const name = String(item.name || "").toLowerCase();
      const category = String(item.category || "").toLowerCase();
      const id = String(item._id || "").toLowerCase();
      return name.includes(needle) || category.includes(needle) || id.includes(needle);
    });
  }, [products, query]);

  const selectedProduct = useMemo(
    () => products.find((item) => String(item._id || "") === selectedProductId) || null,
    [products, selectedProductId],
  );

  const inventoryRows = useMemo(
    () =>
      filteredProducts.slice(0, 8).map((item, index) => ({
        item: item.name || `Product ${index + 1}`,
        sku: String(item._id || `DX-SKU-${index + 1}`),
        stock: String(item.stock || 0),
        state: Number(item.stock || 0) <= 5 ? "Low" : "Healthy",
      })),
    [filteredProducts],
  );

  const productOptions = useMemo(
    () => [
      { label: "Create a new product", value: "" },
      ...products.map((product) => ({
        label: product.name || String(product._id || "Product"),
        value: String(product._id || ""),
      })),
    ],
    [products],
  );

  const stats = useMemo(() => {
    const activeProducts = products.length;
    const lowStock = products.filter((item) => Number(item.stock || 0) <= 5).length;
    const healthyStock = products.filter((item) => Number(item.stock || 0) > 5).length;
    const stockValue = products.reduce((sum, item) => sum + Number(item.stock || 0) * Number(item.price || 0), 0);
    return [
      { label: "Active products", value: String(activeProducts), meta: "Sellable catalog" },
      { label: "Low stock", value: String(lowStock), meta: "Needs replenishment" },
      { label: "Healthy stock", value: String(healthyStock), meta: "Safe inventory" },
      { label: "Stock value", value: `${stockValue} BDT`, meta: "Approx inventory value" },
    ];
  }, [products]);

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

      <WorkspaceCard
        title="Catalog command workspace"
        description="Search the catalog, review stock health, and run create or update actions without losing context."
      >
        <div className="grid gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl flex-1">
              <SearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by product name, category, or ID" />
            </div>
            <Button variant="secondary" onClick={() => void loadProducts(selectedProductId)} disabled={loadingProducts}>
              Refresh catalog
            </Button>
          </div>
          <AnalyticsCards items={stats} />
        </div>
      </WorkspaceCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_380px]">
        <WorkspaceCard
          title="Product editor"
          description="Use one structured workspace for new launches, catalog updates, and retirements."
        >
          <div className="grid gap-5">
            <div className="rounded-3xl border border-border/60 bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Selection</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{selectedProduct?.name || "Creating a new product"}</p>
                </div>
                <Badge variant={selectedProduct ? Number(selectedProduct.stock || 0) <= 5 ? "warning" : "success" : "neutral"}>
                  {selectedProduct ? `${selectedProduct.stock || 0} in stock` : "Draft mode"}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {selectedProduct ? `Category: ${selectedProduct.category || "General"} • Price: ${selectedProduct.price || 0} BDT` : "Choose an existing product or prepare a fresh listing for the shop."}
              </p>
            </div>

            <SelectDropdown
              label="Existing products"
              value={selectedProductId}
              onValueChange={setSelectedProductId}
              options={productOptions}
              disabled={loadingProducts || !products.length}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <TextInput label="Name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
              <TextInput label="Category" value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} />
              <TextInput label="Price" value={draft.price} onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))} />
              <TextInput label="Stock" value={draft.stock} onChange={(event) => setDraft((current) => ({ ...current, stock: event.target.value }))} />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleCreateProduct} loading={submitting} loadingText="Saving product">Create product</Button>
              <Button variant="secondary" onClick={handleUpdateProduct} disabled={submitting || !selectedProductId}>Update product</Button>
              <Button variant="ghost" onClick={handleDeleteProduct} disabled={submitting || !selectedProductId}>Archive product</Button>
            </div>

            {message ? <Alert variant="info">{message}</Alert> : null}
          </div>
        </WorkspaceCard>

        <div className="grid gap-6">
          <WorkspaceCard
            title="Stock adjustment"
            description="Use small manual corrections without leaving the catalog editor."
          >
            <div className="grid gap-4">
              <TextInput label="Stock delta" value={inventoryDelta} onChange={(event) => setInventoryDelta(event.target.value)} />
              <TextInput label="Adjustment note" value={inventoryNote} onChange={(event) => setInventoryNote(event.target.value)} />
              <Button onClick={handleAdjustInventory} disabled={submitting || !selectedProductId}>Adjust inventory</Button>
            </div>
          </WorkspaceCard>

          <WorkspaceCard
            title="Operator cues"
            description="A compact view for what the team should watch while updating catalog data."
          >
            <OrdersTable
              rows={[
                { order: "Low stock", customer: `${stats[1]?.value || "0"} products`, total: "Replenishment", status: "Watch" },
                { order: "Filtered rows", customer: `${filteredProducts.length}`, total: "Visible now", status: query ? "Search" : "All" },
              ]}
            />
          </WorkspaceCard>
        </div>
      </div>

      <WorkspaceCard
        title="Catalog visibility"
        description="The list below reflects the current filtered catalog so the team can review stock posture quickly."
      >
        <div className="grid gap-4">
          <InventoryTable rows={inventoryRows} />
          {!loadingProducts && !filteredProducts.length ? (
            <div className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-center">
              <p className="font-medium text-foreground">No products match this search</p>
              <p className="mt-1 text-xs text-muted-foreground">Clear the search or create a new product from the editor above.</p>
            </div>
          ) : null}
        </div>
      </WorkspaceCard>
    </div>
  );
}
