"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Card, CardDescription, CardTitle, DataTable, Grid } from "@dokanx/ui";

import { listAuditLogs, listOrders, listShipments } from "@/lib/admin-runtime-api";

type OrderRow = {
  _id?: string;
  status?: string;
  paymentStatus?: string;
  disputeStatus?: string;
  disputeReason?: string;
  adminNotes?: string;
  totalAmount?: number;
  createdAt?: string;
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
  events?: Array<{ status?: string; message?: string; timestamp?: string }>;
};

type AuditRow = {
  _id?: string;
  action?: string;
  targetId?: string;
  createdAt?: string;
  meta?: Record<string, unknown>;
  performedBy?: { name?: string; email?: string };
};

export const dynamic = "force-dynamic";

export default function OrderDetailPage({ params }: { params: { orderId: string } }) {
  const orderId = String(params.orderId || "");
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [ordersResponse, shipmentResponse, auditResponse] = await Promise.all([
          listOrders(),
          listShipments(200),
          listAuditLogs(),
        ]);
        if (!active) return;
        const list = Array.isArray(ordersResponse.data) ? (ordersResponse.data as OrderRow[]) : [];
        setOrder(list.find((row) => String(row._id || "") === orderId) || null);
        setShipments(Array.isArray(shipmentResponse.data) ? (shipmentResponse.data as ShipmentRow[]) : []);
        setAuditLogs(Array.isArray(auditResponse.data) ? (auditResponse.data as AuditRow[]) : []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load order detail.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [orderId]);

  const orderShipments = useMemo(
    () => shipments.filter((shipment) => String(shipment.orderId || "") === orderId),
    [orderId, shipments]
  );

  const disputeTimeline = useMemo(
    () =>
      auditLogs.filter(
        (log) => log.action === "ORDER_DISPUTE_UPDATE" && String(log.targetId || "") === orderId
      ),
    [auditLogs, orderId]
  );

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
          <h1 className="dx-display text-3xl">Order #{orderId.slice(-6)}</h1>
          <p className="text-sm text-muted-foreground">Full drilldown for order operations</p>
        </div>
        <Badge variant="neutral">{order?.status || "UNKNOWN"}</Badge>
      </div>

      {error ? (
        <Card>
          <CardTitle>Order detail</CardTitle>
          <CardDescription className="mt-2">{error}</CardDescription>
        </Card>
      ) : null}

      <Grid minColumnWidth="220px" className="gap-4">
        <Card>
          <CardTitle>Total</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{order?.totalAmount ?? 0} BDT</p>
          <p className="mt-1 text-xs text-muted-foreground">Order total value</p>
        </Card>
        <Card>
          <CardTitle>Payment</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{order?.paymentStatus || "PENDING"}</p>
          <p className="mt-1 text-xs text-muted-foreground">Payment lifecycle</p>
        </Card>
        <Card>
          <CardTitle>Dispute</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{order?.disputeStatus || "NONE"}</p>
          <p className="mt-1 text-xs text-muted-foreground">{order?.disputeReason || "No dispute reason"}</p>
        </Card>
        <Card>
          <CardTitle>Created</CardTitle>
          <p className="mt-3 text-2xl font-semibold">
            {order?.createdAt ? new Date(order.createdAt).toLocaleDateString() : "Unknown"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Order date</p>
        </Card>
      </Grid>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Customer</CardTitle>
          <CardDescription className="mt-2">Buyer details</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            <div className="flex flex-wrap justify-between gap-2">
              <span>Name</span>
              <span>{order?.user?.name || "Unknown"}</span>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <span>Email</span>
              <span>{order?.user?.email || "Unknown"}</span>
            </div>
          </div>
        </Card>
        <Card>
          <CardTitle>Shop</CardTitle>
          <CardDescription className="mt-2">Merchant storefront</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            <div className="flex flex-wrap justify-between gap-2">
              <span>Shop name</span>
              <span>{order?.shop?.name || "Unknown"}</span>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <span>Order ID</span>
              <span>{order?._id || "N/A"}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>Shipments</CardTitle>
        <CardDescription className="mt-2">Shipment tracking and events</CardDescription>
        <DataTable
          columns={[
            { key: "carrier", header: "Carrier" },
            { key: "tracking", header: "Tracking" },
            { key: "status", header: "Status" },
            { key: "created", header: "Created" },
          ]}
          rows={orderShipments.map((shipment) => ({
            id: String(shipment._id || ""),
            carrier: shipment.carrier || "Carrier",
            tracking: shipment.trackingNumber || "Pending",
            status: shipment.status || "CREATED",
            created: shipment.createdAt ? new Date(shipment.createdAt).toLocaleDateString() : "Unknown",
          }))}
        />
        {!orderShipments.length ? <p className="mt-3 text-sm text-muted-foreground">No shipments yet.</p> : null}
      </Card>

      <Card>
        <CardTitle>Dispute timeline</CardTitle>
        <CardDescription className="mt-2">Admin updates for this dispute</CardDescription>
        <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
          {disputeTimeline.map((log) => (
            <div key={String(log._id)} className="flex flex-wrap justify-between gap-2 rounded-2xl border border-border/60 px-4 py-3">
              <span>{log.createdAt ? new Date(log.createdAt).toLocaleString() : "Update"}</span>
              <span>{log.performedBy?.name || log.performedBy?.email || "Admin"}</span>
              <span>{String((log.meta as Record<string, unknown>)?.disputeStatus || "")}</span>
              <span>{String((log.meta as Record<string, unknown>)?.disputeReason || "")}</span>
            </div>
          ))}
          {!disputeTimeline.length ? <p>No dispute updates yet.</p> : null}
        </div>
      </Card>
    </div>
  );
}
