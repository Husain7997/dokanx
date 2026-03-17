"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardDescription, CardTitle, DataTable } from "@dokanx/ui";

import { listMerchants, listOrders, listProducts } from "@/lib/admin-runtime-api";

type MerchantRow = {
  _id?: string;
  name?: string;
  email?: string;
  isBlocked?: boolean;
  shopId?: { _id?: string; name?: string; domain?: string; slug?: string; isActive?: boolean };
};

type OrderRow = {
  _id?: string;
  totalAmount?: number;
  status?: string;
  shop?: { _id?: string; name?: string };
};

type ProductRow = {
  _id?: string;
  name?: string;
  price?: number;
  stock?: number;
  shopId?: string;
};

export default function MerchantDetailPage() {
  const params = useParams();
  const merchantId = String(params.merchantId || "");
  const [merchant, setMerchant] = useState<MerchantRow | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [merchantsResponse, ordersResponse, productsResponse] = await Promise.all([
          listMerchants(),
          listOrders(),
          listProducts(),
        ]);
        if (!active) return;
        const list = Array.isArray(merchantsResponse.data) ? (merchantsResponse.data as MerchantRow[]) : [];
        const current = list.find((row) => String(row._id || "") === merchantId) || null;
        setMerchant(current);
        const shopId = current?.shopId?._id ? String(current.shopId._id) : "";
        const orderRows = Array.isArray(ordersResponse.data) ? (ordersResponse.data as OrderRow[]) : [];
        setOrders(orderRows.filter((order) => String(order.shop?._id || "") === shopId));
        const productRows = Array.isArray(productsResponse.data) ? (productsResponse.data as ProductRow[]) : [];
        setProducts(productRows.filter((product) => String(product.shopId || "") === shopId));
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load merchant detail.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [merchantId]);

  const revenue = useMemo(() => orders.reduce((acc, row) => acc + Number(row.totalAmount || 0), 0), [orders]);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="dx-display text-3xl">Merchant detail</h1>
        <p className="text-sm text-muted-foreground">Store info, catalog, and revenue summary.</p>
      </div>
      {error ? (
        <Card>
          <CardTitle>Merchant detail</CardTitle>
          <CardDescription className="mt-2">{error}</CardDescription>
        </Card>
      ) : null}

      <Card>
        <CardTitle>{merchant?.name || "Merchant"}</CardTitle>
        <CardDescription className="mt-2">
          {merchant?.email || "No email"} â€¢ {merchant?.shopId?.name || "No shop"}
        </CardDescription>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>Status: {merchant?.isBlocked ? "Blocked" : "Active"}</span>
          <span>Shop domain: {merchant?.shopId?.domain || merchant?.shopId?.slug || "N/A"}</span>
          <span>Products: {products.length}</span>
          <span>Orders: {orders.length}</span>
          <span>Revenue: {revenue} BDT</span>
        </div>
      </Card>

      <DataTable
        columns={[
          { key: "order", header: "Order" },
          { key: "status", header: "Status" },
          { key: "amount", header: "Amount" },
        ]}
        rows={orders.slice(0, 8).map((order) => ({
          order: String(order._id || "").slice(-6),
          status: order.status || "PLACED",
          amount: `${order.totalAmount ?? 0} BDT`,
        }))}
      />

      <DataTable
        columns={[
          { key: "product", header: "Product" },
          { key: "price", header: "Price" },
          { key: "stock", header: "Stock" },
        ]}
        rows={products.slice(0, 8).map((product) => ({
          product: product.name || "Product",
          price: `${product.price ?? 0} BDT`,
          stock: String(product.stock ?? 0),
        }))}
      />
    </div>
  );
}
