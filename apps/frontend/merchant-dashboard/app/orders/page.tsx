"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, CardDescription, CardTitle, Input } from "@dokanx/ui";

import { getShopSettings, listOrders, refundPayment, updateOrderStatus } from "@/lib/runtime-api";

type OrderRow = {
  _id?: string;
  status?: string;
  totalAmount?: number;
  createdAt?: string;
  contact?: { phone?: string; email?: string };
  user?: { name?: string; email?: string; phone?: string };
  items?: Array<{ product?: { name?: string; price?: number }; quantity?: number; price?: number }>;
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("CONFIRMED");
  const [shopProfile, setShopProfile] = useState<{ name?: string; logoUrl?: string; addressLine1?: string; addressLine2?: string; city?: string; country?: string; vatRate?: number; defaultDiscountRate?: number } | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ total: number; done: number; failures: number } | null>(null);
  const [failedIds, setFailedIds] = useState<string[]>([]);
  const [csvColumns, setCsvColumns] = useState<Record<string, boolean>>({
    id: true,
    status: true,
    totalAmount: true,
    createdAt: true,
  });

  async function refresh() {
    const response = await listOrders();
    setOrders(Array.isArray(response.data) ? (response.data as OrderRow[]) : []);
  }

  useEffect(() => {
    void refresh();
    void loadShopProfile();
  }, []);

  async function loadShopProfile() {
    try {
      const response = await getShopSettings();
      setShopProfile(response.data || null);
    } catch {
      setShopProfile(null);
    }
  }

  const filteredOrders = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return orders;
    return orders.filter((order) => String(order._id || "").toLowerCase().includes(needle));
  }, [orders, query]);

  async function handleBulkUpdate() {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setStatusMessage(null);
    setError(null);
    setFailedIds([]);
    setBulkProgress({ total: ids.length, done: 0, failures: 0 });
    let done = 0;
    const failures: string[] = [];
    for (const id of ids) {
      setBusyId(id);
      try {
        await updateOrderStatus(id, bulkStatus);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bulk update failed.");
        failures.push(id);
      }
      done += 1;
      setBulkProgress({ total: ids.length, done, failures: failures.length });
    }
    setBusyId(null);
    setSelectedIds(new Set());
    await refresh();
    if (failures.length) {
      setFailedIds(failures);
      setStatusMessage(`Updated ${ids.length - failures.length}/${ids.length} orders. ${failures.length} failed.`);
    } else {
      setStatusMessage(`Updated ${ids.length} orders to ${bulkStatus}.`);
    }
    setBulkProgress(null);
  }

  function handleExportCsv() {
    const rows = filteredOrders.map((order) => {
      const base = {
        id: order._id || "",
        status: order.status || "",
        totalAmount: order.totalAmount ?? 0,
        createdAt: order.createdAt || "",
      };
      const selected: Record<string, string | number> = {};
      Object.keys(csvColumns).forEach((key) => {
        if (csvColumns[key]) {
          selected[key] = base[key as keyof typeof base];
        }
      });
      return selected;
    });
    const csv = buildCsv(rows);
    downloadCsv(csv, `orders-${new Date().toISOString().slice(0, 10)}.csv`);
  }

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
    const html = buildInvoiceHtml(order, shopProfile);
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
          <Button variant="secondary" onClick={handleExportCsv}>Export CSV</Button>
        </div>
        <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">CSV columns</p>
          <div className="flex flex-wrap gap-4">
            {Object.keys(csvColumns).map((key) => (
              <label key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={csvColumns[key]}
                  onChange={(event) => {
                    setCsvColumns((current) => ({ ...current, [key]: event.target.checked }));
                  }}
                />
                {key}
              </label>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle>Bulk status update</CardTitle>
        <CardDescription className="mt-2">Apply a status to selected orders.</CardDescription>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select
            className="h-11 rounded-full border border-border bg-background px-4 text-sm"
            value={bulkStatus}
            onChange={(event) => setBulkStatus(event.target.value)}
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <Button onClick={handleBulkUpdate} disabled={!selectedIds.size}>
            Update {selectedIds.size} orders
          </Button>
        </div>
        {bulkProgress ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Processing {bulkProgress.done}/{bulkProgress.total} â€¢ Failures {bulkProgress.failures}
          </p>
        ) : null}
        {failedIds.length ? (
          <p className="mt-2 text-xs text-red-600">
            Failed order IDs: {failedIds.map((id) => id.slice(-6)).join(", ")}
          </p>
        ) : null}
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
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={order._id ? selectedIds.has(order._id) : false}
                  onChange={(event) => {
                    if (!order._id) return;
                    setSelectedIds((current) => {
                      const next = new Set(current);
                      if (event.target.checked) {
                        next.add(order._id as string);
                      } else {
                        next.delete(order._id as string);
                      }
                      return next;
                    });
                  }}
                />
                Select
              </label>
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

function buildInvoiceHtml(order: OrderRow, shopProfile: { name?: string; logoUrl?: string; addressLine1?: string; addressLine2?: string; city?: string; country?: string; vatRate?: number; defaultDiscountRate?: number } | null) {
  const rows = (order.items || [])
    .map((item) => {
      const name = item.product?.name || "Item";
      const qty = Number(item.quantity || 1);
      const price = Number(item.price || item.product?.price || 0);
      const total = price * qty;
      return `<tr><td>${name}</td><td>${qty}</td><td>${price}</td><td>${total}</td></tr>`;
    })
    .join("");
  const subtotal = (order.items || []).reduce((acc, item) => {
    const qty = Number(item.quantity || 1);
    const price = Number(item.price || item.product?.price || 0);
    return acc + price * qty;
  }, 0);
  const vatRate = Number(shopProfile?.vatRate || 0);
  const discountRate = Number(shopProfile?.defaultDiscountRate || 0);
  const vatAmount = Math.round((subtotal * vatRate) / 100);
  const discountAmount = Math.round((subtotal * discountRate) / 100);
  const grandTotal = subtotal + vatAmount - discountAmount;
  const buyerName = order.user?.name || "Guest";
  const buyerEmail = order.user?.email || order.contact?.email || "";
  const buyerPhone = order.user?.phone || order.contact?.phone || "";
  const shopName = shopProfile?.name || "DokanX Shop";
  const shopLogo = shopProfile?.logoUrl || "";
  const shopAddress = [shopProfile?.addressLine1, shopProfile?.addressLine2, shopProfile?.city, shopProfile?.country]
    .filter(Boolean)
    .join(", ");
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
          .header { display: flex; align-items: center; gap: 16px; }
          .logo { width: 60px; height: 60px; object-fit: cover; border-radius: 12px; border: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="header">
          ${shopLogo ? `<img src="${shopLogo}" class="logo" />` : ""}
          <div>
            <h1>${shopName} Invoice</h1>
            <p>Order ID: ${order._id || ""}</p>
          </div>
        </div>
        ${shopAddress ? `<p>Shop address: ${shopAddress}</p>` : ""}
        <p>Buyer: ${buyerName}</p>
        ${buyerEmail ? `<p>Email: ${buyerEmail}</p>` : ""}
        ${buyerPhone ? `<p>Phone: ${buyerPhone}</p>` : ""}
        <p>Status: ${order.status || "PLACED"}</p>
        <p>Subtotal: ${subtotal} BDT</p>
        <p>VAT (${vatRate}%): ${vatAmount} BDT</p>
        <p>Discount (${discountRate}%): -${discountAmount} BDT</p>
        <p>Total: ${grandTotal} BDT</p>
        <table>
          <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
          <tbody>${rows || "<tr><td colspan='4'>No items</td></tr>"}</tbody>
        </table>
      </body>
    </html>
  `;
}

function buildCsv(rows: Array<Record<string, string | number>>) {
  const headers = rows.length ? Object.keys(rows[0]) : ["id", "status", "totalAmount", "createdAt"];
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
