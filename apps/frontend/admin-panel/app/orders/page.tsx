"use client";

import { useEffect, useState } from "react";
import { Card, CardDescription, CardTitle, OrdersTable } from "@dokanx/ui";

import { listOrders, listShipments } from "@/lib/admin-runtime-api";

type OrderRow = {
  _id?: string;
  status?: string;
  paymentStatus?: string;
  totalAmount?: number;
  shop?: { name?: string };
  user?: { name?: string; email?: string };
};

type ShipmentRow = {
  _id?: string;
  orderId?: string;
  trackingNumber?: string;
  carrier?: string;
  status?: string;
  createdAt?: string;
};

export const dynamic = "force-dynamic";

export default function Page() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await listOrders();
        if (!active) return;
        setOrders(Array.isArray(response.data) ? (response.data as OrderRow[]) : []);
        const shipmentResponse = await listShipments(100);
        if (!active) return;
        setShipments(Array.isArray(shipmentResponse.data) ? (shipmentResponse.data as ShipmentRow[]) : []);
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
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Refund requests</CardTitle>
          <CardDescription className="mt-2">Orders flagged as refunded or failed payment.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {orders.filter((order) => order.status === "REFUNDED" || order.paymentStatus === "FAILED").slice(0, 6).map((order) => (
              <div key={String(order._id)} className="flex flex-wrap justify-between gap-2 rounded-2xl border border-border/60 px-4 py-3">
                <span>#{String(order._id || "").slice(-6)}</span>
                <span>{order.status || order.paymentStatus || "REFUND"}</span>
                <span>{order.totalAmount ?? 0} BDT</span>
              </div>
            ))}
            {!orders.some((order) => order.status === "REFUNDED" || order.paymentStatus === "FAILED") ? <p>No refund requests.</p> : null}
          </div>
        </Card>
        <Card>
          <CardTitle>Dispute watch</CardTitle>
          <CardDescription className="mt-2">Cancelled or disputed orders.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {orders.filter((order) => order.status === "CANCELLED").slice(0, 6).map((order) => (
              <div key={String(order._id)} className="flex flex-wrap justify-between gap-2 rounded-2xl border border-border/60 px-4 py-3">
                <span>#{String(order._id || "").slice(-6)}</span>
                <span>{order.status || "DISPUTE"}</span>
                <span>{order.totalAmount ?? 0} BDT</span>
              </div>
            ))}
            {!orders.some((order) => order.status === "CANCELLED") ? <p>No disputes flagged.</p> : null}
          </div>
        </Card>
      </div>
      <Card>
        <CardTitle>Tracking status</CardTitle>
        <CardDescription className="mt-2">Live shipment updates across carriers.</CardDescription>
        <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
          {shipments.slice(0, 8).map((shipment) => (
            <div key={String(shipment._id || shipment.trackingNumber)} className="flex flex-wrap justify-between gap-2 rounded-2xl border border-border/60 px-4 py-3">
              <span>{shipment.orderId ? String(shipment.orderId).slice(-6) : "Order"}</span>
              <span>{shipment.carrier || "Carrier"}</span>
              <span>{shipment.status || "CREATED"}</span>
              <span>{shipment.trackingNumber || "Tracking pending"}</span>
            </div>
          ))}
          {!shipments.length ? <p>No shipments tracked yet.</p> : null}
        </div>
      </Card>
    </div>
  );
}
