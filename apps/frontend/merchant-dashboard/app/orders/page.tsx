"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, CardDescription, CardTitle, Input } from "@dokanx/ui";

import { listOrders, refundPayment, updateOrderStatus } from "@/lib/runtime-api";

type OrderRow = {
  _id?: string;
  status?: string;
  totalAmount?: number;
  createdAt?: string;
  items?: Array<{ product?: { name?: string } }>;
};

const statusOptions = [
  "PLACED",
  "PAYMENT_PENDING",
  "PAYMENT_FAILED",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function refresh() {
    const response = await listOrders();
    setOrders(Array.isArray(response.data) ? (response.data as OrderRow[]) : []);
  }

  useEffect(() => {
    void refresh();
  }, []);

  const filteredOrders = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return orders;
    return orders.filter((order) => String(order._id || "").toLowerCase().includes(needle));
  }, [orders, query]);

  async function handleStatusUpdate(orderId: string, status: string) {
    setBusyId(orderId);
    setError(null);
    try {
      await updateOrderStatus(orderId, status);
      setStatusMessage(`Order ${orderId.slice(-6)} updated to ${status}.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update order.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRefund(order: OrderRow) {
    if (!order._id) return;
    setBusyId(order._id);
    setError(null);
    try {
      await refundPayment(order._id, Number(order.totalAmount || 0), "Merchant refund");
      setStatusMessage(`Refund initiated for ${order._id.slice(-6)}.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refund failed.");
    } finally {
      setBusyId(null);
    }
  }

  function handlePrintInvoice(order: OrderRow) {
    if (!order._id) return;
    const html = buildInvoiceHtml(order);
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Orders</p>
        <h1 className="dx-display text-3xl">Order management</h1>
        <p className="text-sm text-muted-foreground">Update statuses, print invoices, and manage refunds.</p>
      </div>

      <Card>
        <CardTitle>Order filters</CardTitle>
        <CardDescription className="mt-2">Search by order ID to jump to a record.</CardDescription>
        <div className="mt-4 flex flex-wrap gap-3">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order ID" />
          <Button variant="secondary" onClick={() => setQuery("")}>Clear</Button>
        </div>
      </Card>

      {error ? (
        <Card>
          <CardTitle>Orders</CardTitle>
          <CardDescription className="mt-2">{error}</CardDescription>
        </Card>
      ) : null}

      <div className="grid gap-4">
        {filteredOrders.map((order) => (
          <Card key={String(order._id || "")}>
            <CardTitle>Order #{String(order._id || "").slice(-6)}</CardTitle>
            <CardDescription className="mt-2">
              {order.items?.[0]?.product?.name || "Multiple items"} â€¢ {order.totalAmount ?? 0} BDT
            </CardDescription>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>Status: {order.status || "PLACED"}</span>
              <span>{order.createdAt ? new Date(order.createdAt).toLocaleString() : "Pending"}</span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <select
                className="h-11 rounded-full border border-border bg-background px-4 text-sm"
                defaultValue={order.status || "PLACED"}
                onChange={(event) => {
                  if (!order._id) return;
                  void handleStatusUpdate(order._id, event.target.value);
                }}
                disabled={busyId === order._id}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <Button variant="secondary" onClick={() => handlePrintInvoice(order)}>
                Print invoice
              </Button>
              <Button
                variant="secondary"
                onClick={() => order._id && handleStatusUpdate(order._id, "CANCELLED")}
                disabled={busyId === order._id}
              >
                Cancel order
              </Button>
              <Button
                onClick={() => handleRefund(order)}
                disabled={busyId === order._id}
              >
                Refund
              </Button>
            </div>
          </Card>
        ))}
        {!filteredOrders.length ? (
          <Card>
            <CardTitle>No orders</CardTitle>
            <CardDescription className="mt-2">No orders match the current filters.</CardDescription>
          </Card>
        ) : null}
      </div>

      {statusMessage ? <p className="text-xs text-emerald-700">{statusMessage}</p> : null}
    </div>
  );
}

function buildInvoiceHtml(order: OrderRow) {
  const rows = (order.items || [])
    .map((item) => `<tr><td>${item.product?.name || "Item"}</td><td>1</td></tr>`)
    .join("");
  return `
    <html>
      <head>
        <title>Invoice ${order._id}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 32px; }
          h1 { font-size: 20px; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
          th { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <h1>Invoice</h1>
        <p>Order ID: ${order._id || ""}</p>
        <p>Status: ${order.status || "PLACED"}</p>
        <p>Total: ${order.totalAmount ?? 0} BDT</p>
        <table>
          <thead><tr><th>Item</th><th>Qty</th></tr></thead>
          <tbody>${rows || "<tr><td colspan='2'>No items</td></tr>"}</tbody>
        </table>
      </body>
    </html>
  `;
}
