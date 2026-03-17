"use client";

import { useEffect, useState } from "react";
import { Card, CardDescription, CardTitle, DataTable } from "@dokanx/ui";

import { listProducts } from "@/lib/admin-runtime-api";

type ProductRow = {
  _id?: string;
  name?: string;
  price?: number;
  stock?: number;
  shopId?: string;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [error, setError] = useState<string | null>(null);

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
        ]}
        rows={products.map((product) => ({
          name: product.name || "Product",
          price: `${product.price ?? 0} BDT`,
          stock: String(product.stock ?? 0),
          shop: product.shopId ? String(product.shopId).slice(-6) : "Unknown",
        }))}
      />
    </div>
  );
}
