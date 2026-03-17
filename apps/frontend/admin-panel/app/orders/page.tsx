"use client";

import { useEffect, useState } from "react";
import { Card, CardDescription, CardTitle, OrdersTable } from "@dokanx/ui";

import { listAuditLogs, listOrders, listShipments, updateOrderDispute } from "@/lib/admin-runtime-api";

type OrderRow = {
  _id?: string;
  status?: string;
  paymentStatus?: string;
  disputeStatus?: string;
  disputeReason?: string;
  adminNotes?: string;
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
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [reasonDraft, setReasonDraft] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<Array<{ _id?: string; action?: string; targetId?: string; createdAt?: string; meta?: Record<string, unknown> }>>([]);

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
        const auditResponse = await listAuditLogs();
        if (!active) return;
        setAuditLogs(Array.isArray(auditResponse.data) ? auditResponse.data : []);
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
            {orders.filter((order) => order.status === "CANCELLED" || order.disputeStatus !== "NONE").slice(0, 6).map((order) => (
              <div key={String(order._id)} className="grid gap-2 rounded-2xl border border-border/60 px-4 py-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <span>#{String(order._id || "").slice(-6)}</span>
                  <span>{order.disputeStatus || "OPEN"}</span>
                  <span>{order.totalAmount ?? 0} BDT</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="h-9 rounded-full border border-border bg-background px-3 text-xs"
                    defaultValue={order.disputeStatus || "OPEN"}
                    onChange={async (event) => {
                      if (!order._id) return;
                      setBusyId(order._id);
                      try {
                        await updateOrderDispute(order._id, {
                          disputeStatus: event.target.value,
                          disputeReason: reasonDraft[order._id || ""] || order.disputeReason || "NONE",
                        });
                        const response = await listOrders();
                        setOrders(Array.isArray(response.data) ? (response.data as OrderRow[]) : []);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Unable to update dispute.");
                      } finally {
                        setBusyId(null);
                      }
                    }}
                    disabled={busyId === order._id}
                  >
                    {["NONE", "OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"].map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-9 rounded-full border border-border bg-background px-3 text-xs"
                    value={reasonDraft[order._id || ""] ?? order.disputeReason ?? "NONE"}
                    onChange={(event) =>
                      setReasonDraft((current) => ({ ...current, [order._id || ""]: event.target.value }))
                    }
                  >
                    {["NONE", "CUSTOMER_CLAIM", "DELIVERY_DELAY", "DAMAGED", "PAYMENT_ISSUE", "FRAUD", "OTHER"].map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                  <input
                    className="h-9 flex-1 rounded-full border border-border bg-background px-3 text-xs"
                    placeholder="Admin notes"
                    value={notesDraft[order._id || ""] ?? order.adminNotes ?? ""}
                    onChange={(event) =>
                      setNotesDraft((current) => ({ ...current, [order._id || ""]: event.target.value }))
                    }
                  />
                  <button
                    className="rounded-full border border-border/60 px-3 py-1 text-xs"
                    onClick={async () => {
                      if (!order._id) return;
                      setBusyId(order._id);
                      try {
                        await updateOrderDispute(order._id, {
                          adminNotes: notesDraft[order._id || ""] ?? "",
                          disputeReason: reasonDraft[order._id || ""] || order.disputeReason || "NONE",
                        });
                        const response = await listOrders();
                        setOrders(Array.isArray(response.data) ? (response.data as OrderRow[]) : []);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Unable to save notes.");
                      } finally {
                        setBusyId(null);
                      }
                    }}
                    disabled={busyId === order._id}
                  >
                    Save notes
                  </button>
                </div>
                <div className="rounded-xl bg-accent/40 px-3 py-2 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Dispute timeline</p>
                  {auditLogs
                    .filter((log) => log.action === "ORDER_DISPUTE_UPDATE" && String(log.targetId || "") === String(order._id || ""))
                    .slice(0, 3)
                    .map((log) => (
                      <div key={String(log._id)} className="mt-2 flex flex-wrap justify-between gap-2">
                        <span>{log.createdAt ? new Date(log.createdAt).toLocaleString() : "Update"}</span>
                        <span>{String((log.meta as Record<string, unknown>)?.disputeStatus || "")}</span>
                        <span>{String((log.meta as Record<string, unknown>)?.disputeReason || "")}</span>
                      </div>
                    ))}
                  {!auditLogs.some((log) => log.action === "ORDER_DISPUTE_UPDATE" && String(log.targetId || "") === String(order._id || "")) ? (
                    <p className="mt-2">No dispute updates yet.</p>
                  ) : null}
                </div>
              </div>
            ))}
            {!orders.some((order) => order.status === "CANCELLED" || order.disputeStatus !== "NONE") ? <p>No disputes flagged.</p> : null}
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
      <Card>
        <CardTitle>Dispute analytics</CardTitle>
        <CardDescription className="mt-2">Resolution reasons and admin notes export.</CardDescription>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {buildReasonSummary(orders).map((row) => (
            <span key={row.label} className="rounded-full border border-border/60 px-3 py-1">
              {row.label}: {row.count}
            </span>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            className="rounded-full border border-border/60 px-3 py-2 text-xs"
            onClick={() => {
              const rows = orders
                .filter((order) => (order.adminNotes || "").trim() || order.disputeStatus !== "NONE" || order.disputeReason !== "NONE")
                .map((order) => ({
                  orderId: order._id || "",
                  disputeStatus: order.disputeStatus || "NONE",
                  disputeReason: order.disputeReason || "NONE",
                  adminNotes: order.adminNotes || "",
                  createdAt: order.createdAt || "",
                }));
              const csv = buildCsv(rows);
              downloadCsv(csv, `disputes-${new Date().toISOString().slice(0, 10)}.csv`);
            }}
          >
            Export dispute notes
          </button>
        </div>
      </Card>
    </div>
  );
}

function buildReasonSummary(orders: OrderRow[]) {
  const map = new Map<string, number>();
  orders.forEach((order) => {
    const key = order.disputeReason || "NONE";
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries()).map(([label, count]) => ({ label, count }));
}

function buildCsv(rows: Array<Record<string, string | number>>) {
  const headers = rows.length ? Object.keys(rows[0]) : ["orderId", "disputeStatus", "disputeReason", "adminNotes", "createdAt"];
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((key) => `"${String(row[key] ?? "").replace(/\"/g, '""')}"`)
        .join(",")
    ),
  ];
  return lines.join("\n");
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
