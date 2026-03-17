"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, CardDescription, CardTitle, DataTable, Grid, SelectDropdown, TextInput } from "@dokanx/ui";

import { listAuditLogs, listOrders, listShipments, updateOrderDispute } from "@/lib/admin-runtime-api";

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
  const [refundStatus, setRefundStatus] = useState("NONE");
  const [disputeStatus, setDisputeStatus] = useState("NONE");
  const [disputeReason, setDisputeReason] = useState("NONE");
  const [adminNotes, setAdminNotes] = useState("");
  const [busy, setBusy] = useState(false);

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
        const current = list.find((row) => String(row._id || "") === orderId) || null;
        setRefundStatus(current?.paymentStatus || "NONE");
        setDisputeStatus(current?.disputeStatus || "NONE");
        setDisputeReason(current?.disputeReason || "NONE");
        setAdminNotes(current?.adminNotes || "");
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

  const disputeStatusOptions = [
    { label: "None", value: "NONE" },
    { label: "Open", value: "OPEN" },
    { label: "In review", value: "IN_REVIEW" },
    { label: "Resolved", value: "RESOLVED" },
    { label: "Rejected", value: "REJECTED" },
  ];

  const disputeReasonOptions = [
    { label: "None", value: "NONE" },
    { label: "Customer claim", value: "CUSTOMER_CLAIM" },
    { label: "Delivery delay", value: "DELIVERY_DELAY" },
    { label: "Damaged", value: "DAMAGED" },
    { label: "Payment issue", value: "PAYMENT_ISSUE" },
    { label: "Fraud", value: "FRAUD" },
    { label: "Other", value: "OTHER" },
  ];

  async function handleSaveDispute() {
    if (!orderId) return;
    setBusy(true);
    setError(null);
    try {
      await updateOrderDispute(orderId, {
        disputeStatus,
        disputeReason,
        adminNotes,
      });
      const response = await listOrders();
      const list = Array.isArray(response.data) ? (response.data as OrderRow[]) : [];
      setOrder(list.find((row) => String(row._id || "") === orderId) || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update dispute.");
    } finally {
      setBusy(false);
    }
  }

  function handleRefundAction(action: "REQUEST" | "APPROVE" | "DECLINE") {
    setRefundStatus(action === "REQUEST" ? "REQUESTED" : action === "APPROVE" ? "APPROVED" : "DECLINED");
  }

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
        <Card>
          <CardTitle>Refund & dispute actions</CardTitle>
          <CardDescription className="mt-2">Manual overrides for refunds and dispute states.</CardDescription>
          <div className="mt-4 grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/60 px-4 py-3 text-sm text-muted-foreground">
              <span>Refund status</span>
              <Badge variant={refundStatus === "APPROVED" ? "success" : refundStatus === "DECLINED" ? "danger" : "neutral"}>
                {refundStatus}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => handleRefundAction("REQUEST")}>Request</Button>
              <Button size="sm" variant="outline" onClick={() => handleRefundAction("APPROVE")}>Approve</Button>
              <Button size="sm" variant="ghost" onClick={() => handleRefundAction("DECLINE")}>Decline</Button>
            </div>
            <SelectDropdown label="Dispute status" options={disputeStatusOptions} value={disputeStatus} onValueChange={setDisputeStatus} />
            <SelectDropdown label="Dispute reason" options={disputeReasonOptions} value={disputeReason} onValueChange={setDisputeReason} />
            <TextInput value={adminNotes} onChange={(event) => setAdminNotes(event.target.value)} placeholder="Admin notes" />
            <Button onClick={handleSaveDispute} disabled={busy}>
              {busy ? "Saving..." : "Save dispute"}
            </Button>
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
