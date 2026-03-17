"use client";

import { useEffect, useMemo, useState } from "react";
import { AnalyticsCards, Card, CardDescription, CardTitle } from "@dokanx/ui";

import { getShopSummary, getWalletSummary, listInventory, listOrders } from "@/lib/runtime-api";

type OrderRow = {
  _id?: string;
  status?: string;
  totalAmount?: number;
  createdAt?: string;
  items?: Array<{ product?: { name?: string } }>;
};

type InventoryRow = {
  _id?: string;
  productId?: string;
  available?: number;
  reorderPoint?: number;
  updatedAt?: string;
};

export function DashboardOverview() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [summary, setSummary] = useState<{ sales?: { totalSales?: number; totalOrders?: number } } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [ordersResponse, inventoryResponse, walletResponse, summaryResponse] = await Promise.all([
          listOrders(),
          listInventory(),
          getWalletSummary(),
          getShopSummary(),
        ]);
        if (!active) return;
        setOrders(Array.isArray(ordersResponse.data) ? (ordersResponse.data as OrderRow[]) : []);
        setInventory(Array.isArray(inventoryResponse.data) ? (inventoryResponse.data as InventoryRow[]) : []);
        setWalletBalance(Number(walletResponse.data?.balance ?? 0));
        setSummary(summaryResponse.data || null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load dashboard overview.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const today = useMemo(() => new Date(), []);
  const quickStats = useMemo(() => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter((order) =>
      ["PLACED", "PAYMENT_PENDING", "PAYMENT_FAILED", "CONFIRMED"].includes(String(order.status || ""))
    ).length;
    const revenue = orders.reduce((acc, order) => acc + Number(order.totalAmount || 0), 0);
    const todaysSales = orders
      .filter((order) => order.createdAt && isSameDay(new Date(order.createdAt), today))
      .reduce((acc, order) => acc + Number(order.totalAmount || 0), 0);
    const lowStock = inventory.filter(
      (row) => Number(row.available || 0) <= Number(row.reorderPoint || 0)
    ).length;

    return [
      { label: "Today's sales", value: `${todaysSales} BDT`, meta: "Sales today" },
      { label: "Total orders", value: String(totalOrders), meta: "All-time orders" },
      { label: "Pending orders", value: String(pendingOrders), meta: "Needs action" },
      { label: "Revenue", value: `${summary?.sales?.totalSales ?? revenue} BDT`, meta: "Lifetime revenue" },
      { label: "Wallet balance", value: `${walletBalance} BDT`, meta: "Available payout" },
      { label: "Low stock alerts", value: String(lowStock), meta: "Inventory watchlist" },
    ];
  }, [inventory, orders, summary, today, walletBalance]);

  const recentOrders = useMemo(() => orders.slice(0, 6), [orders]);
  const lowStockItems = useMemo(
    () =>
      inventory
        .filter((row) => Number(row.available || 0) <= Number(row.reorderPoint || 0))
        .slice(0, 6),
    [inventory]
  );

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Merchant</p>
        <h1 className="dx-display text-3xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your shop health at a glanceâ€”sales, inventory, and customer activity.
        </p>
      </div>

      {error ? (
        <Card>
          <CardTitle>Dashboard overview</CardTitle>
          <CardDescription className="mt-2">{error}</CardDescription>
        </Card>
      ) : null}

      <AnalyticsCards items={quickStats} />

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardTitle>Activity feed</CardTitle>
          <CardDescription className="mt-2">Recent orders and fulfillment updates.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {recentOrders.length ? (
              recentOrders.map((order) => (
                <div
                  key={String(order._id)}
                  className="flex flex-wrap justify-between gap-2 rounded-2xl border border-border/60 px-4 py-3"
                >
                  <span>Order {order._id?.slice(-6)}</span>
                  <span>{order.status || "PLACED"}</span>
                  <span>{order.totalAmount ?? 0} BDT</span>
                  <span>{order.createdAt ? new Date(order.createdAt).toLocaleString() : "Pending"}</span>
                </div>
              ))
            ) : (
              <p>No activity yet.</p>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>Inventory highlights</CardTitle>
          <CardDescription className="mt-2">Items running low in your warehouse.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {lowStockItems.length ? (
              lowStockItems.map((row) => (
                <div
                  key={String(row._id || row.productId)}
                  className="flex flex-wrap justify-between gap-2 rounded-2xl border border-border/60 px-4 py-3"
                >
                  <span>{row.productId || "Product"}</span>
                  <span>{row.available ?? 0} left</span>
                  <span>Reorder at {row.reorderPoint ?? 0}</span>
                </div>
              ))
            ) : (
              <p>No low stock alerts.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>Recent orders</CardTitle>
          <CardDescription className="mt-2">Track last confirmed purchases.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {recentOrders.length ? (
              recentOrders.map((order) => (
                <div key={String(order._id)} className="flex flex-wrap justify-between gap-2 rounded-2xl border border-border/60 px-4 py-3">
                  <span>{order.items?.[0]?.product?.name || "Order items"}</span>
                  <span>{order.totalAmount ?? 0} BDT</span>
                  <span>{order.status || "PLACED"}</span>
                </div>
              ))
            ) : (
              <p>No orders to display.</p>
            )}
          </div>
        </Card>
        <Card>
          <CardTitle>Orders vs inventory</CardTitle>
          <CardDescription className="mt-2">Balance demand with stock movement.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            <div className="flex flex-wrap justify-between gap-2 rounded-2xl border border-border/60 px-4 py-3">
              <span>Orders today</span>
              <span>
                {orders.filter((order) => order.createdAt && isSameDay(new Date(order.createdAt), today)).length}
              </span>
            </div>
            <div className="flex flex-wrap justify-between gap-2 rounded-2xl border border-border/60 px-4 py-3">
              <span>Total SKUs</span>
              <span>{inventory.length}</span>
            </div>
            <div className="flex flex-wrap justify-between gap-2 rounded-2xl border border-border/60 px-4 py-3">
              <span>Low stock items</span>
              <span>{lowStockItems.length}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
