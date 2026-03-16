"use client";

import { useEffect, useState } from "react";
import { Card, CardDescription, CardTitle, OrdersTable } from "@dokanx/ui";

import { listOrders } from "@/lib/admin-runtime-api";

type OrderRow = {
  _id?: string;
  status?: string;
  totalAmount?: number;
  shop?: { name?: string };
  user?: { name?: string; email?: string };
};

export const dynamic = "force-dynamic";

export default function Page() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await listOrders();
        if (!active) return;
        setOrders(Array.isArray(response.data) ? (response.data as OrderRow[]) : []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load orders.");
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
        <h1 className="dx-display text-3xl">Orders</h1>
        <p className="text-sm text-muted-foreground">Operational oversight for orders</p>
      </div>
      {error ? (
        <Card>
          <CardTitle>Orders</CardTitle>
          <CardDescription className="mt-2">{error}</CardDescription>
        </Card>
      ) : null}
      <OrdersTable
        rows={orders.map((order) => ({
          order: String(order._id || ""),
          customer: order.user?.name || order.user?.email || "Customer",
          total: `${order.totalAmount ?? 0} BDT`,
          status: order.status || "PENDING",
        }))}
      />
    </div>
  );
}
