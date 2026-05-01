"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert, AnalyticsCards, Badge, Button, Card, CardDescription, CardTitle, DataTable, Input, Select } from "@dokanx/ui";

import { listOrders, refundOrderPayment, updateOrderDispute } from "@/lib/admin-runtime-api";

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
  createdAt?: string;
  deliveryStatus?: string;
};

type DisputeRow = {
  _id: string;
  orderId: string;
  type: string;
  status: string;
  reason: string;
  createdAt?: string;
};

export const dynamic = "force-dynamic";

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadOrders() {
    setError(null);
    try {
      const response = await listOrders();
      setOrders(Array.isArray(response.data) ? (response.data as OrderRow[]) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load orders.");
    }
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  useEffect(() => {
    setSearchQuery(searchParams.get("q") || "");
    setFilterStatus(searchParams.get("status") || "ALL");
  }, [searchParams]);

  const summary = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((order) => ["PLACED", "CONFIRMED", "PROCESSING"].includes(String(order.status || ""))).length;
    const paid = orders.filter((order) => order.paymentStatus === "SUCCESS").length;
    const disputed = orders.filter((order) => order.disputeStatus && order.disputeStatus !== "NONE").length;
    const delivered = orders.filter((order) => order.status === "DELIVERED").length;
    const cancelled = orders.filter((order) => order.status === "CANCELLED").length;
    return [
      { label: "Total orders", value: String(total), meta: "All merchant orders" },
      { label: "Pending", value: String(pending), meta: "Awaiting fulfillment" },
      { label: "Paid", value: String(paid), meta: "Successful payments" },
      { label: "Disputed", value: String(disputed), meta: "Needs review" },
      { label: "Delivered", value: String(delivered), meta: "Completed orders" },
      { label: "Cancelled", value: String(cancelled), meta: "Closed unsuccessfully" },
    ];
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return orders.filter((order) => {
      const statusMatch = filterStatus === "ALL" || order.status === filterStatus;
      const paymentMatch = filterPaymentStatus === "ALL" || order.paymentStatus === filterPaymentStatus;
      const searchMatch =
        !query ||
        String(order._id || "").toLowerCase().includes(query) ||
        String(order.user?.name || "").toLowerCase().includes(query) ||
        String(order.user?.email || "").toLowerCase().includes(query) ||
        String(order.shop?.name || "").toLowerCase().includes(query);
      return statusMatch && paymentMatch && searchMatch;
    });
  }, [filterPaymentStatus, filterStatus, orders, searchQuery]);

  const disputes = useMemo<DisputeRow[]>(() => {
    return orders
      .filter((order) => order.disputeStatus && order.disputeStatus !== "NONE")
      .map((order) => ({
        _id: `DSP-${String(order._id || "")}`,
        orderId: String(order._id || ""),
        type: order.disputeReason || "GENERAL",
        status: order.disputeStatus || "OPEN",
        reason: order.adminNotes || order.disputeReason || "No dispute note provided",
        createdAt: order.createdAt,
      }));
  }, [orders]);

  async function handleForceCancel(orderId: string) {
    if (!orderId) return;
    setBusyOrderId(orderId);
    setStatusMessage(null);
    setError(null);
    try {
      await updateOrderDispute(orderId, {
        disputeStatus: "IN_REVIEW",
        disputeReason: "ADMIN_FORCE_CANCEL",
        adminNotes: "Admin requested cancellation review from the global order console.",
      });
      setStatusMessage(`Cancellation review queued for order ${orderId.slice(-6)}.`);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to queue order cancellation.");
    } finally {
      setBusyOrderId(null);
    }
  }

  async function handleRefund(orderId: string, amount?: number) {
    if (!orderId || !Number(amount || 0)) return;
    setBusyOrderId(orderId);
    setStatusMessage(null);
    setError(null);
    try {
      await refundOrderPayment({
        orderId,
        amount: Number(amount || 0),
        reason: "Admin console refund",
      });
      setStatusMessage(`Refund processed for order ${orderId.slice(-6)}.`);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to process refund.");
    } finally {
      setBusyOrderId(null);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-[28px] border border-white/10 bg-[#0B1E3C] px-6 py-6 text-white shadow-[0_24px_60px_rgba(11,30,60,0.24)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-[#FFD49F]">DokanX Admin</p>
            <h1 className="dx-display text-3xl">Global Order Management</h1>
            <p className="text-sm text-slate-200">
              Monitor platform-wide orders, review dispute signals, and trigger refund or cancellation workflows from one place.
            </p>
          </div>
          <Badge variant="secondary" className="border-white/15 bg-white/10 text-white">
            {orders.length} orders
          </Badge>
        </div>
      </div>

      <AnalyticsCards items={summary} />

      {error ? <Alert variant="warning">{error}</Alert> : null}
      {statusMessage ? <Alert variant="info">{statusMessage}</Alert> : null}

      <Card>
        <CardTitle>Order control center</CardTitle>
        <CardDescription className="mt-2">
          Filter all orders by lifecycle state, search by customer or merchant, and jump into detail pages for deeper review.
        </CardDescription>
        <div className="mt-4 flex flex-wrap gap-4">
          <Input
            placeholder="Search orders, customers, merchants..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="max-w-sm"
          />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <option value="ALL">All status</option>
            <option value="PLACED">Placed</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
          <Select value={filterPaymentStatus} onValueChange={setFilterPaymentStatus}>
            <option value="ALL">All payments</option>
            <option value="SUCCESS">Paid</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </Select>
        </div>
        <div className="mt-4">
          <DataTable
            columns={[
              { key: "orderId", header: "Order ID" },
              { key: "customer", header: "Customer" },
              { key: "merchant", header: "Merchant" },
              { key: "amount", header: "Amount" },
              { key: "status", header: "Order status" },
              { key: "payment", header: "Payment" },
              { key: "delivery", header: "Delivery" },
              { key: "createdAt", header: "Created" },
              {
                key: "actions",
                header: "Actions",
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" asChild>
                      <a href={`/orders/${String(row._id || "")}`}>View</a>
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={busyOrderId === row._id}
                      onClick={() => handleForceCancel(String(row._id || ""))}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyOrderId === row._id || !Number(row.totalAmount || 0)}
                      onClick={() => handleRefund(String(row._id || ""), Number(row.totalAmount || 0))}
                    >
                      Refund
                    </Button>
                  </div>
                ),
              },
            ]}
            rows={filteredOrders.map((order) => ({
              _id: order._id,
              orderId: `#${String(order._id || "").slice(-6)}`,
              customer: order.user?.name || order.user?.email || "Unknown",
              merchant: order.shop?.name || "Unknown",
              amount: `${Number(order.totalAmount || 0).toFixed(2)} BDT`,
              status: (
                <Badge
                  variant={
                    order.status === "DELIVERED"
                      ? "success"
                      : order.status === "CANCELLED"
                        ? "warning"
                        : "neutral"
                  }
                >
                  {order.status || "PLACED"}
                </Badge>
              ),
              payment: (
                <Badge variant={order.paymentStatus === "SUCCESS" ? "success" : order.paymentStatus === "FAILED" ? "warning" : "neutral"}>
                  {order.paymentStatus || "PENDING"}
                </Badge>
              ),
              delivery: order.deliveryStatus || "Pending",
              createdAt: order.createdAt ? new Date(order.createdAt).toLocaleString() : "N/A",
              totalAmount: order.totalAmount,
            }))}
          />
        </div>
      </Card>

      <Card>
        <CardTitle>Dispute resolution queue</CardTitle>
        <CardDescription className="mt-2">
          Orders carrying dispute flags or admin review notes are surfaced here for faster follow-up.
        </CardDescription>
        <div className="mt-4">
          <DataTable
            columns={[
              { key: "disputeId", header: "Dispute ID" },
              { key: "orderId", header: "Order ID" },
              { key: "type", header: "Type" },
              { key: "reason", header: "Reason" },
              { key: "status", header: "Status" },
              { key: "createdAt", header: "Created" },
            ]}
            rows={disputes.map((dispute) => ({
              disputeId: `#${dispute._id.slice(-6)}`,
              orderId: `#${dispute.orderId.slice(-6)}`,
              type: dispute.type,
              reason: dispute.reason,
              status: (
                <Badge variant={dispute.status === "RESOLVED" ? "success" : dispute.status === "REJECTED" ? "warning" : "neutral"}>
                  {dispute.status}
                </Badge>
              ),
              createdAt: dispute.createdAt ? new Date(dispute.createdAt).toLocaleDateString() : "N/A",
            }))}
          />
        </div>
      </Card>
    </div>
  );
}
