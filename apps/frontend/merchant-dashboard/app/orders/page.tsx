"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@dokanx/auth";
import {
  Alert,
  AnalyticsCards,
  Badge,
  Button,
  Card,
  CardDescription,
  CardTitle,
  Checkbox,
  ProgressBar,
  SearchInput,
  SelectDropdown
} from "@dokanx/ui";
import QRCode from "qrcode";

import { getShopSettings, listOrders, listShopClaims, refundPayment, updateClaimStatus, updateOrderStatus } from "@/lib/runtime-api";

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

const statusSelectOptions = statusOptions.map((status) => ({
  label: status.replace(/_/g, " "),
  value: status
}));

const csvPresetOptions = [
  { label: "Summary", value: "summary" },
  { label: "Finance", value: "finance" },
  { label: "Customer", value: "customer" },
  { label: "Full", value: "full" }
];

export default function OrdersPage() {
  const auth = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("CONFIRMED");
  const [shopProfile, setShopProfile] = useState<{ name?: string; logoUrl?: string; storefrontDomain?: string; addressLine1?: string; addressLine2?: string; city?: string; country?: string; vatRate?: number; defaultDiscountRate?: number } | null>(null);
  const [qrTarget, setQrTarget] = useState<"invoice" | "payment">("payment");
  const [bulkProgress, setBulkProgress] = useState<{ total: number; done: number; failures: number } | null>(null);
  const [failedIds, setFailedIds] = useState<string[]>([]);
  const [csvColumns, setCsvColumns] = useState<Record<string, boolean>>({
    id: true,
    status: true,
    totalAmount: true,
    createdAt: true,
    customerEmail: false,
    customerPhone: false,
  });
  const [csvPreset, setCsvPreset] = useState("summary");
  const [claims, setClaims] = useState<Array<Record<string, unknown>>>([]);

  async function refresh() {
    const response = await listOrders();
    setOrders(Array.isArray(response.data) ? (response.data as OrderRow[]) : []);
  }

  useEffect(() => {
    void refresh();
    void loadShopProfile();
  }, []);

  useEffect(() => {
    const shopId = auth.user?.shopId;
    if (!shopId) return;
    listShopClaims(String(shopId))
      .then((response) => {
        setClaims(Array.isArray(response.data) ? response.data : []);
      })
      .catch(() => undefined);
  }, [auth.user?.shopId]);

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

  const stats = useMemo(() => {
    const pending = orders.filter((order) => ["PLACED", "PAYMENT_PENDING", "CONFIRMED"].includes(String(order.status || "").toUpperCase())).length;
    const shipped = orders.filter((order) => String(order.status || "").toUpperCase() === "SHIPPED").length;
    const delivered = orders.filter((order) => String(order.status || "").toUpperCase() === "DELIVERED").length;
    const refunded = orders.filter((order) => String(order.status || "").toUpperCase() === "REFUNDED").length;
    const gross = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
    return [
      { label: "Visible orders", value: String(filteredOrders.length), meta: query ? "Filtered result set" : "Current order feed" },
      { label: "Action queue", value: String(pending), meta: "Pending confirmation or payment" },
      { label: "Shipped", value: String(shipped), meta: "In transit now" },
      { label: "Delivered", value: String(delivered), meta: "Completed successfully" },
      { label: "Refunded", value: String(refunded), meta: "Requires finance review" },
      { label: "Gross value", value: `${gross} BDT`, meta: "Across loaded orders" },
      { label: "Selected", value: String(selectedIds.size), meta: "Ready for bulk actions" },
      { label: "Claims", value: String(claims.length), meta: "Open customer issues" },
    ];
  }, [claims.length, filteredOrders.length, orders, query, selectedIds.size]);

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

  async function handleRetryFailedOnly() {
    if (!failedIds.length) return;
    setStatusMessage(null);
    setError(null);
    setBulkProgress({ total: failedIds.length, done: 0, failures: 0 });
    let done = 0;
    const failures: string[] = [];
    for (const id of failedIds) {
      setBusyId(id);
      try {
        await updateOrderStatus(id, bulkStatus);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Retry failed.");
        failures.push(id);
      }
      done += 1;
      setBulkProgress({ total: failedIds.length, done, failures: failures.length });
    }
    setBusyId(null);
    setFailedIds(failures);
    await refresh();
    setStatusMessage(failures.length ? `Retry finished with ${failures.length} failures.` : "Retry successful.");
    setBulkProgress(null);
  }

  function handleExportCsv() {
    const rows = filteredOrders.map((order) => {
      const base = {
        id: order._id || "",
        status: order.status || "",
        totalAmount: order.totalAmount ?? 0,
        createdAt: order.createdAt || "",
        customerEmail: order.user?.email || order.contact?.email || "",
        customerPhone: order.user?.phone || order.contact?.phone || "",
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

  async function handlePrintInvoice(order: OrderRow) {
    if (!order._id) return;
    let qrDataUrl: string | null = null;
    try {
      const baseUrl = buildBaseUrl(shopProfile?.storefrontDomain);
      const invoiceUrl = `${baseUrl}/orders/${order._id}`;
      const paymentUrl = `${baseUrl}/order-tracking/${order._id}`;
      const targetUrl = qrTarget === "invoice" ? invoiceUrl : paymentUrl;
      qrDataUrl = await QRCode.toDataURL(targetUrl, { width: 160, margin: 1 });
    } catch {
      qrDataUrl = null;
    }
    const html = buildInvoiceHtml(order, shopProfile, qrDataUrl);
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div className="grid gap-6">
      <Card className="overflow-hidden border-border/70 bg-card/92">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Orders</p>
            <h1 className="dx-display mt-2 text-3xl">Order management</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Track fulfillment, run bulk status changes, print invoices, and manage refunds from one operator workspace.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <div className="min-w-[240px] flex-1 max-w-md">
                <SearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order ID" />
              </div>
              <Button variant="secondary" onClick={() => setQuery("")}>Clear</Button>
              <Button variant="secondary" onClick={handleExportCsv}>Export CSV</Button>
            </div>
          </div>
          <div className="border-t border-border/60 bg-background/70 p-6 sm:p-8 lg:border-l lg:border-t-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Operator snapshot</p>
            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl border border-border/60 bg-card/90 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">Bulk selection</span>
                  <Badge variant={selectedIds.size ? "warning" : "neutral"}>{selectedIds.size}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{selectedIds.size ? "Orders are staged for batch update." : "No orders selected yet."}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card/90 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">Claims queue</span>
                  <Badge variant={claims.length ? "warning" : "success"}>{claims.length}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{claims.length ? "Customer issues need merchant review." : "No open claims at the moment."}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card/90 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">Invoice QR target</span>
                  <Badge variant="neutral">{qrTarget === "payment" ? "Payment" : "Invoice"}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Printed invoices will embed the current QR destination.</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <AnalyticsCards items={stats} />

      <Card>
        <CardTitle>Order filters</CardTitle>
        <CardDescription className="mt-2">Tune export shape and narrow the result set before acting.</CardDescription>
        <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">CSV columns</p>
          <div className="flex flex-wrap items-center gap-3">
            <SelectDropdown
              label="Preset"
              value={csvPreset}
              onValueChange={(value) => {
                setCsvPreset(value);
                setCsvColumns(buildPresetColumns(value));
              }}
              options={csvPresetOptions}
            />
          </div>
          <div className="flex flex-wrap gap-4">
            {Object.keys(csvColumns).map((key) => (
              <label key={key} className="flex items-center gap-2">
                <Checkbox
                  checked={csvColumns[key]}
                  onCheckedChange={(checked) => {
                    setCsvColumns((current) => ({ ...current, [key]: Boolean(checked) }));
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
        <CardDescription className="mt-2">Apply a single status to the current selection and keep retries contained.</CardDescription>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <SelectDropdown
            label="Bulk status"
            value={bulkStatus}
            onValueChange={setBulkStatus}
            options={statusSelectOptions}
          />
          <Button onClick={handleBulkUpdate} disabled={!selectedIds.size}>
            Update {selectedIds.size} orders
          </Button>
          <Button variant="secondary" onClick={handleRetryFailedOnly} disabled={!failedIds.length}>
            Retry failed only
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">QR target</span>
          {["payment", "invoice"].map((value) => (
            <label key={value} className="flex items-center gap-2">
              <Checkbox
                checked={qrTarget === value}
                onCheckedChange={() => setQrTarget(value as "payment" | "invoice")}
              />
              {value === "payment" ? "Payment link" : "Invoice link"}
            </label>
          ))}
        </div>
        {bulkProgress ? (
          <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Processing {bulkProgress.done}/{bulkProgress.total}</span>
              <span>Failures {bulkProgress.failures}</span>
            </div>
            <ProgressBar value={(bulkProgress.done / bulkProgress.total) * 100} />
          </div>
        ) : null}
        {failedIds.length ? (
          <Alert variant="error" className="mt-2">
            Failed order IDs: {failedIds.map((id) => id.slice(-6)).join(", ")}
          </Alert>
        ) : null}
      </Card>

      <Card>
        <CardTitle>Warranty and guarantee claims</CardTitle>
        <CardDescription className="mt-2">Approve, reject, or resolve customer claims from the merchant panel.</CardDescription>
        <div className="mt-4 grid gap-3">
          {claims.slice(0, 8).map((claim, index) => (
            <div key={`${String(claim._id || index)}`} className="rounded-2xl border border-border/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    {String(claim.type || "claim").toUpperCase()} {String(claim.status || "pending").toUpperCase()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Order {String(claim.orderId || "")} | Product {String(claim.productId || "")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={async () => {
                    if (!claim._id) return;
                    await updateClaimStatus(String(claim._id), { status: "approved" });
                    if (auth.user?.shopId) {
                      const response = await listShopClaims(String(auth.user.shopId));
                      setClaims(Array.isArray(response.data) ? response.data : []);
                    }
                  }}>
                    Approve
                  </Button>
                  <Button size="sm" variant="secondary" onClick={async () => {
                    if (!claim._id) return;
                    await updateClaimStatus(String(claim._id), { status: "rejected", decisionNote: "Rejected by merchant" });
                    if (auth.user?.shopId) {
                      const response = await listShopClaims(String(auth.user.shopId));
                      setClaims(Array.isArray(response.data) ? response.data : []);
                    }
                  }}>
                    Reject
                  </Button>
                  <Button size="sm" onClick={async () => {
                    if (!claim._id) return;
                    await updateClaimStatus(String(claim._id), { status: "resolved", resolutionType: "refund" });
                    if (auth.user?.shopId) {
                      const response = await listShopClaims(String(auth.user.shopId));
                      setClaims(Array.isArray(response.data) ? response.data : []);
                    }
                  }}>
                    Refund
                  </Button>
                </div>
              </div>
              {!!(claim.fraudFlags && Array.isArray(claim.fraudFlags) && claim.fraudFlags.length) ? (
                <p className="mt-2 text-xs text-muted-foreground">Fraud flags: {(claim.fraudFlags as string[]).join(", ")}</p>
              ) : null}
            </div>
          ))}
          {!claims.length ? (
            <p className="text-sm text-muted-foreground">No open claims for this shop.</p>
          ) : null}
        </div>
      </Card>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="grid gap-4">
        {filteredOrders.map((order) => (
          <Card key={String(order._id || "")} className="overflow-hidden">
            <div className="flex flex-col gap-5 p-1 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <CardTitle>Order #{String(order._id || "").slice(-6)}</CardTitle>
                  <Badge variant={resolveStatusVariant(order.status)}>
                    {order.status || "PLACED"}
                  </Badge>
                </div>
                <CardDescription className="mt-2">
                  {order.items?.[0]?.product?.name || "Multiple items"} • {order.totalAmount ?? 0} BDT
                </CardDescription>
                <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                  <div className="rounded-2xl border border-border/60 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Created</p>
                    <p className="mt-1 font-medium text-foreground">{order.createdAt ? new Date(order.createdAt).toLocaleString() : "Pending"}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Customer</p>
                    <p className="mt-1 font-medium text-foreground">{order.user?.name || order.user?.email || order.contact?.phone || "Guest checkout"}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Lead item</p>
                    <p className="mt-1 font-medium text-foreground">{order.items?.[0]?.product?.name || "Order items"}</p>
                  </div>
                </div>
              </div>
              <div className="min-w-[280px] rounded-2xl border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">Action panel</p>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox
                      checked={order._id ? selectedIds.has(order._id) : false}
                      onCheckedChange={(checked) => {
                        if (!order._id) return;
                        setSelectedIds((current) => {
                          const next = new Set(current);
                          if (checked) {
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
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span>{order.contact?.phone || order.user?.phone || "No phone saved"}</span>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <SelectDropdown
                    label="Status"
                    value={order.status || "PLACED"}
                    onValueChange={(value) => order._id && handleStatusUpdate(order._id, value)}
                    options={statusSelectOptions}
                    disabled={busyId === order._id}
                  />
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
              </div>
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

      {statusMessage ? <Alert variant="success">{statusMessage}</Alert> : null}
    </div>
  );
}

function resolveStatusVariant(status?: string) {
  const value = String(status || "").toUpperCase();
  if (["DELIVERED", "PAID", "COMPLETED"].includes(value)) return "success";
  if (["CANCELLED", "FAILED", "REFUNDED", "PAYMENT_FAILED"].includes(value)) return "danger";
  if (["PAYMENT_PENDING", "PENDING", "CONFIRMED", "SHIPPED"].includes(value)) return "warning";
  return "neutral";
}

function buildInvoiceHtml(
  order: OrderRow,
  shopProfile: { name?: string; logoUrl?: string; addressLine1?: string; addressLine2?: string; city?: string; country?: string; vatRate?: number; defaultDiscountRate?: number } | null,
  qrDataUrl: string | null
) {
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
          <div style="margin-left:auto; text-align:center;">
            ${
              qrDataUrl
                ? `<img src="${qrDataUrl}" style="width:90px;height:90px;border-radius:12px;border:1px solid #e5e7eb;" />`
                : `<div style="width:90px;height:90px;border:1px dashed #9ca3af;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#6b7280;">QR</div>`
            }
            <div style="margin-top:6px;font-size:10px;color:#6b7280;">${String(order._id || "").slice(-8)}</div>
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
        <div style="margin-top:32px;display:flex;justify-content:space-between;align-items:flex-end;">
          <div>
            <p style="font-size:12px;color:#6b7280;">Authorized signature</p>
            <div style="margin-top:24px;width:220px;border-bottom:1px solid #9ca3af;"></div>
          </div>
          <div style="text-align:right;font-size:12px;color:#6b7280;">
            <p>Thank you for your business.</p>
          </div>
        </div>
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

function buildPresetColumns(preset: string) {
  if (preset === "finance") {
    return { id: true, status: true, totalAmount: true, createdAt: true, customerEmail: false, customerPhone: false };
  }
  if (preset === "customer") {
    return { id: true, status: true, totalAmount: false, createdAt: true, customerEmail: true, customerPhone: true };
  }
  if (preset === "full") {
    return { id: true, status: true, totalAmount: true, createdAt: true, customerEmail: true, customerPhone: true };
  }
  return { id: true, status: true, totalAmount: true, createdAt: true, customerEmail: false, customerPhone: false };
}

function buildBaseUrl(domain?: string | null) {
  const fallback = typeof window !== "undefined" ? window.location.origin : "";
  if (!domain) return fallback;
  const trimmed = domain.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed.replace(/\/$/, "");
  return `https://${trimmed.replace(/\/$/, "")}`;
}
