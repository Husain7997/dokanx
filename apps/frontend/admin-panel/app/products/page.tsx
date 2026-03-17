"use client";

import { useEffect, useState } from "react";
import { Card, CardDescription, CardTitle, DataTable } from "@dokanx/ui";

import { listProducts, moderateProduct } from "@/lib/admin-runtime-api";

type ProductRow = {
  _id?: string;
  name?: string;
  price?: number;
  stock?: number;
  shopId?: string;
  moderationStatus?: string;
  moderationNote?: string;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await listProducts();
        if (!active) return;
        setProducts(Array.isArray(response.data) ? (response.data as ProductRow[]) : []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load products.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="dx-display text-3xl">Products</h1>
        <p className="text-sm text-muted-foreground">Moderate marketplace catalog.</p>
      </div>
      {error ? (
        <Card>
          <CardTitle>Product moderation</CardTitle>
          <CardDescription className="mt-2">{error}</CardDescription>
        </Card>
      ) : null}
      <DataTable
        columns={[
          { key: "name", header: "Product" },
          { key: "price", header: "Price" },
          { key: "stock", header: "Stock" },
          { key: "shop", header: "Shop" },
          { key: "status", header: "Moderation" },
          {
            key: "actions",
            header: "Actions",
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                {["APPROVED", "REJECTED", "FLAGGED"].map((status) => (
                  <button
                    key={status}
                    className="rounded-full border border-border/60 px-3 py-1 text-xs"
                    onClick={async () => {
                      if (!row.id) return;
                      setBusyId(row.id);
                      try {
                        await moderateProduct(row.id, { status });
                        const response = await listProducts();
                        setProducts(Array.isArray(response.data) ? (response.data as ProductRow[]) : []);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Moderation failed.");
                      } finally {
                        setBusyId(null);
                      }
                    }}
                    disabled={busyId === row.id}
                  >
                    {busyId === row.id ? "Working..." : status}
                  </button>
                ))}
              </div>
            ),
          },
        ]}
        rows={products.map((product) => ({
          id: String(product._id || ""),
          name: product.name || "Product",
          price: `${product.price ?? 0} BDT`,
          stock: String(product.stock ?? 0),
          shop: product.shopId ? String(product.shopId).slice(-6) : "Unknown",
          status: product.moderationStatus || "PENDING",
        }))}
      />
    </div>
  );
}
