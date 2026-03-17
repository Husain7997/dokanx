"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardDescription,
  CardTitle,
  Grid,
  OrdersTable,
  ProgressBar,
  ChartJsBarChart,
  ChartJsLineChart,
  ChartJsPieChart,
  SelectDropdown,
  TextInput
} from "@dokanx/ui";

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
};

const disputeStatusOptions = ["NONE", "OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"].map((status) => ({
  label: status.replace(/_/g, " "),
  value: status
}));

const disputeReasonOptions = [
  "NONE",
  "CUSTOMER_CLAIM",
  "DELIVERY_DELAY",
  "DAMAGED",
  "PAYMENT_ISSUE",
  "FRAUD",
  "OTHER"
].map((reason) => ({
  label: reason.replace(/_/g, " "),
  value: reason
}));

const exportPresetOptions = ["summary", "resolution", "notes", "full"].map((preset) => ({
  label: preset.charAt(0).toUpperCase() + preset.slice(1),
  value: preset
}));

export const dynamic = "force-dynamic";

export default function Page() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [reasonDraft, setReasonDraft] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<Array<{ _id?: string; action?: string; targetId?: string; createdAt?: string; meta?: Record<string, unknown>; performedBy?: { name?: string; email?: string } }>>([]);
  const [exportPreset, setExportPreset] = useState("summary");
  const [disputeStatusFilter, setDisputeStatusFilter] = useState("ALL");
  const [disputeReasonFilter, setDisputeReasonFilter] = useState("ALL");

  const courierProviders = [
    { name: "Pathao Courier", focus: "Fast city coverage", region: "Dhaka core" },
    { name: "Paperfly", focus: "Nationwide B2C delivery", region: "All districts" },
    { name: "Steadfast", focus: "Reliable intercity", region: "Dhaka ↔ Sylhet" },
    { name: "RedX", focus: "High volume routes", region: "Growth corridors" },
  ];

  const selectionSignals = [
    { label: "Delivery speed", value: "Same-day vs 48-hour SLA" },
    { label: "Success rate", value: "Return ratio below 3%" },
    { label: "Shipping cost", value: "Merchant target margin" },
    { label: "Coverage", value: "Destination fit" },
    { label: "Merchant preference", value: "Manual override" },
  ];

  const trackingEvents = [
    "Shipment Created",
    "Picked Up",
    "In Transit",
    "Out for Delivery",
    "Delivered",
    "Failed Delivery",
    "Returned",
  ];

  const statusSyncMethods = [
    { title: "Webhook updates", detail: "Courier pushes real-time updates to DokanX." },
    { title: "Polling worker", detail: "Scheduled sync every 10-30 minutes." },
    { title: "Manual refresh", detail: "Ops team can request an instant sync." },
  ];

  const codFlow = [
    "Order Delivered",
    "Courier collects cash",
    "Courier settlement report",
    "Merchant wallet credit",
  ];

  const failureHandling = [
    { reason: "Customer not reachable", action: "Reschedule delivery, notify buyer" },
    { reason: "Address incorrect", action: "Request address validation, hold shipment" },
    { reason: "Customer rejected", action: "Trigger return workflow" },
  ];

  const analyticsMetrics = [
    { label: "Avg delivery time", value: "2.4 days", trend: "+0.2 days" },
    { label: "Delivery success rate", value: "94.6%", trend: "+1.2%" },
    { label: "Courier performance", value: "Top: Pathao", trend: "SLA 97%" },
    { label: "Failure rate", value: "3.1%", trend: "-0.4%" },
  ];

  const merchantTools = [
    "Create shipment",
    "Print shipping label",
    "Track delivery",
    "View courier reports",
  ];

  const logisticsApis = [
    "POST /shipments/create",
    "GET /shipments/track",
    "POST /shipments/cancel",
    "GET /couriers/list",
  ];

  const shipmentFields = [
    "shipment_id",
    "order_id",
    "courier_provider",
    "tracking_number",
    "status",
    "delivery_fee",
    "created_at",
  ];

  const intelligenceRoadmap = [
    "Demand forecasting",
    "Route optimization",
    "Warehouse suggestion",
    "Delivery time prediction",
  ];

  const summary = useMemo(() => {
    const refunded = orders.filter((order) => order.status === "REFUNDED" || order.paymentStatus === "FAILED").length;
    const disputes = orders.filter((order) => order.status === "CANCELLED" || order.disputeStatus !== "NONE").length;
    const shipped = shipments.filter((shipment) => shipment.status === "SHIPPED" || shipment.status === "DELIVERED").length;
    return {
      total: orders.length,
      refunded,
      disputes,
      shipped,
      shipments: shipments.length
    };
  }, [orders, shipments]);

  const disputeReasonSummary = useMemo(() => buildReasonSummary(orders), [orders]);
  const disputeReasonChart = useMemo(
    () => disputeReasonSummary.map((row) => ({ name: row.label, value: row.count })),
    [disputeReasonSummary]
  );
  const chartJsDisputeData = useMemo(() => {
    const labels = disputeReasonSummary.map((row) => row.label);
    const values = disputeReasonSummary.map((row) => row.count);
    return {
      labels,
      datasets: [
        {
          label: "Disputes",
          data: values,
          backgroundColor: [
            "hsl(221 83% 53% / 0.7)",
            "hsl(160 84% 39% / 0.7)",
            "hsl(38 92% 50% / 0.7)",
            "hsl(142 71% 45% / 0.7)",
            "hsl(25 95% 53% / 0.7)"
          ],
          borderColor: "hsl(221 83% 53%)",
          borderWidth: 2,
          borderRadius: 6
        }
      ]
    };
  }, [disputeReasonSummary]);

  const chartJsOptions = useMemo(
    () => ({
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: { color: "hsl(220 9% 46%)", usePointStyle: true, boxWidth: 8 }
        },
        tooltip: {
          callbacks: {
            label: (context: any) => `Disputes: ${context.parsed?.y ?? 0}`
          }
        }
      },
      scales: {
        x: { ticks: { color: "hsl(220 9% 46%)", font: { size: 12 } }, grid: { display: false } },
        y: { ticks: { color: "hsl(220 9% 46%)", font: { size: 12 } }, grid: { color: "hsl(214 32% 91%)" } }
      }
    }),
    []
  );

  const chartJsPieData = useMemo(() => {
    const labels = disputeReasonSummary.map((row) => row.label);
    const values = disputeReasonSummary.map((row) => row.count);
    return {
      labels,
      datasets: [
        {
          label: "Dispute reasons",
          data: values,
          backgroundColor: [
            "hsl(221 83% 53% / 0.8)",
            "hsl(160 84% 39% / 0.8)",
            "hsl(38 92% 50% / 0.8)",
            "hsl(142 71% 45% / 0.8)",
            "hsl(25 95% 53% / 0.8)"
          ],
          borderColor: "hsl(210 40% 98%)",
          borderWidth: 2
        }
      ]
    };
  }, [disputeReasonSummary]);

  const chartJsPieOptions = useMemo(
    () => ({
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "hsl(220 9% 46%)", usePointStyle: true, boxWidth: 8 }
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const total = disputeReasonSummary.reduce((sum, row) => sum + row.count, 0) || 1;
              const value = context.parsed || 0;
              const percent = Math.round((value / total) * 100);
              return `${context.label || "Reason"}: ${value} (${percent}%)`;
            }
          }
        }
      }
    }),
    [disputeReasonSummary]
  );

  const disputeDaily = useMemo(() => buildDailyDisputeSeries(orders, 7), [orders]);
  const chartJsDisputeLine = useMemo(() => {
    const values = disputeDaily.map((row) => row.value);
    const average =
      values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    return {
      labels: disputeDaily.map((row) => row.label),
      datasets: [
        {
          label: "Disputes per day",
          data: values,
          borderColor: "hsl(160 84% 39%)",
          backgroundColor: "hsl(160 84% 39% / 0.2)",
          pointBackgroundColor: "hsl(160 84% 39%)",
          pointRadius: 3,
          tension: 0.35,
          fill: true
        },
        {
          label: "Avg baseline",
          data: values.map(() => Number(average.toFixed(1))),
          borderColor: "hsl(221 83% 53% / 0.6)",
          borderDash: [6, 6],
          pointRadius: 0
        }
      ]
    };
  }, [disputeDaily]);

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

  const disputeLogs = useMemo(
    () => auditLogs.filter((log) => log.action === "ORDER_DISPUTE_UPDATE" && log.targetId),
    [auditLogs]
  );

  const disputeResolutionMap = useMemo(() => {
    const map = new Map<string, Date>();
    disputeLogs.forEach((log) => {
      const status = String((log.meta as Record<string, unknown>)?.disputeStatus || "");
      if (!["RESOLVED", "REJECTED"].includes(status)) return;
      if (!log.createdAt) return;
      const timestamp = new Date(log.createdAt);
      if (Number.isNaN(timestamp.getTime())) return;
      const key = String(log.targetId || "");
      const existing = map.get(key);
      if (!existing || timestamp < existing) {
        map.set(key, timestamp);
      }
    });
    return map;
  }, [disputeLogs]);

  const disputeQueue = useMemo(() => {
    return orders.filter((order) => {
      if ((order.disputeStatus || "NONE") === "NONE") return false;
      if (disputeStatusFilter !== "ALL" && (order.disputeStatus || "NONE") !== disputeStatusFilter) return false;
      if (disputeReasonFilter !== "ALL" && (order.disputeReason || "NONE") !== disputeReasonFilter) return false;
      return true;
    });
  }, [orders, disputeReasonFilter, disputeStatusFilter]);

  return (
    <div className="grid gap-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="dx-display text-3xl">Orders</h1>
        <p className="text-sm text-muted-foreground">Operational oversight for orders</p>
      </div>
      {error ? <Alert variant="error">{error}</Alert> : null}

      <Grid minColumnWidth="220px" className="gap-4">
        <Card>
          <CardTitle>Total orders</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{summary.total}</p>
          <p className="mt-1 text-xs text-muted-foreground">All orders in the system</p>
        </Card>
        <Card>
          <CardTitle>Refund requests</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{summary.refunded}</p>
          <div className="mt-3">
            <ProgressBar value={summary.total ? (summary.refunded / summary.total) * 100 : 0} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Share of orders flagged</p>
        </Card>
        <Card>
          <CardTitle>Disputes</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{summary.disputes}</p>
          <div className="mt-3">
            <ProgressBar value={summary.total ? (summary.disputes / summary.total) * 100 : 0} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Orders under review</p>
        </Card>
        <Card>
          <CardTitle>Shipments</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{summary.shipments}</p>
          <p className="mt-1 text-xs text-muted-foreground">{summary.shipped} delivered or shipped</p>
        </Card>
      </Grid>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Orders overview</CardTitle>
            <CardDescription className="mt-2">Live operational feed for the latest orders.</CardDescription>
          </div>
          <Badge variant="success">Live</Badge>
        </div>
        <div className="mt-4">
          <OrdersTable
            rows={orders.map((order) => ({
              order: String(order._id || ""),
              customer: order.user?.name || order.user?.email || "Customer",
              total: `${order.totalAmount ?? 0} BDT`,
              status: order.status || "PENDING",
            }))}
          />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Refund requests</CardTitle>
          <CardDescription className="mt-2">Orders flagged as refunded or failed payment.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {orders
              .filter((order) => order.status === "REFUNDED" || order.paymentStatus === "FAILED")
              .slice(0, 6)
              .map((order) => (
                <div
                  key={String(order._id)}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/60 px-4 py-3"
                >
                  <span>#{String(order._id || "").slice(-6)}</span>
                  <Badge variant="warning">{order.status || order.paymentStatus || "REFUND"}</Badge>
                  <span>{order.totalAmount ?? 0} BDT</span>
                </div>
              ))}
            {!orders.some((order) => order.status === "REFUNDED" || order.paymentStatus === "FAILED") ? (
              <p>No refund requests.</p>
            ) : null}
          </div>
        </Card>
        <Card>
          <CardTitle>Dispute watch</CardTitle>
          <CardDescription className="mt-2">Cancelled or disputed orders.</CardDescription>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            {orders
              .filter((order) => order.status === "CANCELLED" || order.disputeStatus !== "NONE")
              .slice(0, 6)
              .map((order) => (
                <div key={String(order._id)} className="grid gap-3 rounded-2xl border border-border/60 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>#{String(order._id || "").slice(-6)}</span>
                    <Badge variant="danger">{order.disputeStatus || "OPEN"}</Badge>
                    <span>{order.totalAmount ?? 0} BDT</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)_auto]">
                    <SelectDropdown
                      label="Status"
                      options={disputeStatusOptions}
                      value={order.disputeStatus || "OPEN"}
                      disabled={busyId === order._id}
                      onValueChange={async (value) => {
                        if (!order._id) return;
                        setBusyId(order._id);
                        try {
                          await updateOrderDispute(order._id, {
                            disputeStatus: value,
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
                    />
                    <SelectDropdown
                      label="Reason"
                      options={disputeReasonOptions}
                      value={reasonDraft[order._id || ""] ?? order.disputeReason ?? "NONE"}
                      onValueChange={(value) =>
                        setReasonDraft((current) => ({ ...current, [order._id || ""]: value }))
                      }
                      disabled={busyId === order._id}
                    />
                    <TextInput
                      placeholder="Admin notes"
                      value={notesDraft[order._id || ""] ?? order.adminNotes ?? ""}
                      onChange={(event) =>
                        setNotesDraft((current) => ({ ...current, [order._id || ""]: event.target.value }))
                      }
                      wrapperClassName="md:col-span-1"
                      className="h-10"
                      disabled={busyId === order._id}
                    />
                    <Button
                      size="sm"
                      variant="secondary"
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
                    </Button>
                  </div>
                  <div className="rounded-xl bg-accent/40 px-3 py-2 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Dispute timeline</p>
                    {auditLogs
                      .filter(
                        (log) =>
                          log.action === "ORDER_DISPUTE_UPDATE" &&
                          String(log.targetId || "") === String(order._id || "")
                      )
                      .slice(0, 3)
                      .map((log) => (
                        <div key={String(log._id)} className="mt-2 flex flex-wrap justify-between gap-2">
                          <span>{log.createdAt ? new Date(log.createdAt).toLocaleString() : "Update"}</span>
                          <span>{log.performedBy?.name || log.performedBy?.email || "Admin"}</span>
                          <span>{String((log.meta as Record<string, unknown>)?.disputeStatus || "")}</span>
                          <span>{String((log.meta as Record<string, unknown>)?.disputeReason || "")}</span>
                        </div>
                      ))}
                    {!auditLogs.some(
                      (log) =>
                        log.action === "ORDER_DISPUTE_UPDATE" &&
                        String(log.targetId || "") === String(order._id || "")
                    ) ? (
                      <p className="mt-2">No dispute updates yet.</p>
                    ) : null}
                  </div>
                </div>
              ))}
            {!orders.some((order) => order.status === "CANCELLED" || order.disputeStatus !== "NONE") ? (
              <p>No disputes flagged.</p>
            ) : null}
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>Tracking status</CardTitle>
        <CardDescription className="mt-2">Live shipment updates across carriers.</CardDescription>
        <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
          {shipments.slice(0, 8).map((shipment) => (
            <div
              key={String(shipment._id || shipment.trackingNumber)}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/60 px-4 py-3"
            >
              <span>{shipment.orderId ? String(shipment.orderId).slice(-6) : "Order"}</span>
              <span>{shipment.carrier || "Carrier"}</span>
              <Badge variant={shipment.status === "DELIVERED" ? "success" : "neutral"}>
                {shipment.status || "CREATED"}
              </Badge>
              <span>{shipment.trackingNumber || "Tracking pending"}</span>
            </div>
          ))}
          {!shipments.length ? <p>No shipments tracked yet.</p> : null}
        </div>
      </Card>

      <div className="grid gap-6">
        <div className="rounded-3xl border border-border/70 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 px-6 py-6 text-white shadow-lg">
          <p className="text-xs uppercase tracking-[0.24em] text-emerald-200">DokanX Logistics</p>
          <h2 className="mt-2 text-2xl font-semibold">Logistics & Delivery Intelligence System</h2>
          <p className="mt-3 max-w-2xl text-sm text-emerald-100/80">
            AI-assisted orchestration for courier selection, live tracking, COD reconciliation, and performance analytics
            across Bangladesh.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {[
              "Fast delivery",
              "Courier optimization",
              "Delivery tracking",
              "Cost optimization",
              "Reliable shipping",
            ].map((goal) => (
              <div key={goal} className="rounded-2xl border border-emerald-200/20 bg-emerald-950/40 px-3 py-2 text-xs">
                {goal}
              </div>
            ))}
          </div>
        </div>

        <Grid minColumnWidth="220px" className="gap-4">
          <Card>
            <CardTitle>Courier aggregation</CardTitle>
            <CardDescription className="mt-2">Adapter-based courier abstraction layer.</CardDescription>
            <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
              {courierProviders.map((provider) => (
                <div key={provider.name} className="rounded-2xl border border-border/60 px-4 py-3">
                  <p className="font-medium text-foreground">{provider.name}</p>
                  <p className="text-xs text-muted-foreground">{provider.focus}</p>
                  <Badge className="mt-2" variant="neutral">
                    {provider.region}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle>Smart courier selection</CardTitle>
            <CardDescription className="mt-2">Decision engine picks best carrier.</CardDescription>
            <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
              {selectionSignals.map((signal) => (
                <div key={signal.label} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/60 px-4 py-3">
                  <span className="font-medium text-foreground">{signal.label}</span>
                  <span>{signal.value}</span>
                </div>
              ))}
              <div className="rounded-2xl border border-border/60 bg-accent/40 px-4 py-3 text-xs">
                Dhaka → Dhaka: Pathao • Dhaka → Sylhet: Steadfast
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle>Tracking timeline</CardTitle>
            <CardDescription className="mt-2">Customer + merchant visibility.</CardDescription>
            <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
              {trackingEvents.map((event, index) => (
                <div key={event} className="flex items-center justify-between gap-2 rounded-2xl border border-border/60 px-4 py-2">
                  <span>{event}</span>
                  <Badge variant={index === 4 ? "success" : "neutral"}>{index + 1}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </Grid>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardTitle>Courier status sync</CardTitle>
            <CardDescription className="mt-2">Webhook + polling orchestration.</CardDescription>
            <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
              {statusSyncMethods.map((method) => (
                <div key={method.title} className="rounded-2xl border border-border/60 px-4 py-3">
                  <p className="font-medium text-foreground">{method.title}</p>
                  <p className="text-xs text-muted-foreground">{method.detail}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle>COD reconciliation</CardTitle>
            <CardDescription className="mt-2">Automated settlement credits.</CardDescription>
            <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
              {codFlow.map((step, index) => (
                <div key={step} className="flex items-center justify-between gap-2 rounded-2xl border border-border/60 px-4 py-2">
                  <span>{step}</span>
                  <Badge variant={index === codFlow.length - 1 ? "success" : "neutral"}>{index + 1}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardTitle>Delivery failure handling</CardTitle>
            <CardDescription className="mt-2">Automated recovery workflows.</CardDescription>
            <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
              {failureHandling.map((item) => (
                <div key={item.reason} className="rounded-2xl border border-border/60 px-4 py-3">
                  <p className="font-medium text-foreground">{item.reason}</p>
                  <p className="text-xs text-muted-foreground">{item.action}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle>Logistics analytics</CardTitle>
            <CardDescription className="mt-2">Courier performance intelligence.</CardDescription>
            <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
              {analyticsMetrics.map((metric) => (
                <div key={metric.label} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/60 px-4 py-3">
                  <div>
                    <p className="font-medium text-foreground">{metric.label}</p>
                    <p className="text-xs text-muted-foreground">{metric.trend}</p>
                  </div>
                  <Badge variant="secondary">{metric.value}</Badge>
                </div>
              ))}
              <div className="rounded-2xl border border-border/60 bg-accent/40 px-4 py-3 text-xs">
                Admin dashboard aggregates courier SLA, SLA breaches, and delivery heatmaps.
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardTitle>Merchant shipping tools</CardTitle>
            <CardDescription className="mt-2">Self-serve fulfillment actions.</CardDescription>
            <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
              {merchantTools.map((tool) => (
                <div key={tool} className="rounded-2xl border border-border/60 px-4 py-2">
                  {tool}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle>Logistics API surface</CardTitle>
            <CardDescription className="mt-2">Public endpoints for integrations.</CardDescription>
            <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
              {logisticsApis.map((endpoint) => (
                <div key={endpoint} className="rounded-2xl border border-border/60 px-4 py-2">
                  <code className="text-xs">{endpoint}</code>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle>Shipment database</CardTitle>
            <CardDescription className="mt-2">Core fields for persistence.</CardDescription>
            <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
              {shipmentFields.map((field) => (
                <div key={field} className="rounded-2xl border border-border/60 px-4 py-2">
                  <code className="text-xs">{field}</code>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card>
          <CardTitle>Logistics intelligence roadmap</CardTitle>
          <CardDescription className="mt-2">Next AI layer for proactive optimization.</CardDescription>
          <div className="mt-4 grid gap-3 md:grid-cols-4 text-sm text-muted-foreground">
            {intelligenceRoadmap.map((item) => (
              <div key={item} className="rounded-2xl border border-border/60 px-4 py-3">
                {item}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>Dispute analytics</CardTitle>
        <CardDescription className="mt-2">Resolution reasons and admin notes export.</CardDescription>
        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="grid gap-4">
            <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
              {disputeReasonChart.length ? (
                <ChartJsPieChart data={chartJsPieData} options={chartJsPieOptions} height={240} />
              ) : (
                <p className="text-sm text-muted-foreground">No dispute data to chart yet.</p>
              )}
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
              {disputeReasonChart.length ? (
                <ChartJsBarChart data={chartJsDisputeData} options={chartJsOptions} height={240} />
              ) : (
                <p className="text-sm text-muted-foreground">No dispute data to chart yet.</p>
              )}
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
              {disputeReasonChart.length ? (
                <ChartJsLineChart data={chartJsDisputeLine} options={chartJsOptions} height={220} />
              ) : (
                <p className="text-sm text-muted-foreground">No dispute trend data yet.</p>
              )}
            </div>
          </div>
          <div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {disputeReasonSummary.map((row) => (
                <span key={row.label} className="rounded-full border border-border/60 px-3 py-1">
                  {row.label}: {row.count}
                </span>
              ))}
            </div>
            <div className="mt-4 grid gap-3">
              <SelectDropdown
                label="Export preset"
                options={exportPresetOptions}
                value={exportPreset}
                onValueChange={setExportPreset}
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    const rows = orders
                      .filter(
                        (order) =>
                          (order.adminNotes || "").trim() ||
                          order.disputeStatus !== "NONE" ||
                          order.disputeReason !== "NONE"
                      )
                      .map((order) => ({
                        orderId: order._id || "",
                        disputeStatus: order.disputeStatus || "NONE",
                        disputeReason: order.disputeReason || "NONE",
                        adminNotes: order.adminNotes || "",
                        createdAt: order.createdAt || "",
                      }))
                      .map((row) => applyDisputeExportPreset(row, exportPreset));
                    const csv = buildCsv(rows);
                    downloadCsv(csv, `disputes-${exportPreset}-${new Date().toISOString().slice(0, 10)}.csv`);
                  }}
                >
                  Export preset
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const rows = orders
                      .filter(
                        (order) =>
                          (order.adminNotes || "").trim() ||
                          order.disputeStatus !== "NONE" ||
                          order.disputeReason !== "NONE"
                      )
                      .map((order) => ({
                        orderId: order._id || "",
                        disputeStatus: order.disputeStatus || "NONE",
                        disputeReason: order.disputeReason || "NONE",
                        adminNotes: order.adminNotes || "",
                        createdAt: order.createdAt || "",
                      }));
                    const csv = buildCsv(rows);
                    downloadCsv(csv, `disputes-summary-${new Date().toISOString().slice(0, 10)}.csv`);
                  }}
                >
                  Export summary
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Dispute workflow deep-dive</CardTitle>
            <CardDescription className="mt-2">Track SLA, resolution time, and status queues.</CardDescription>
          </div>
          <Badge variant="warning">Review queue</Badge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <SelectDropdown
            label="Status"
            options={[{ label: "All", value: "ALL" }, ...disputeStatusOptions]}
            value={disputeStatusFilter}
            onValueChange={setDisputeStatusFilter}
          />
          <SelectDropdown
            label="Reason"
            options={[{ label: "All", value: "ALL" }, ...disputeReasonOptions]}
            value={disputeReasonFilter}
            onValueChange={setDisputeReasonFilter}
          />
          <div className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 text-sm text-muted-foreground">
            Total queue: <span className="font-semibold text-foreground">{disputeQueue.length}</span>
          </div>
        </div>
        <div className="mt-4">
          <DataTable
            columns={[
              { key: "order", header: "Order" },
              { key: "status", header: "Status" },
              { key: "reason", header: "Reason" },
              { key: "opened", header: "Opened" },
              { key: "age", header: "Age (hrs)" },
              { key: "sla", header: "SLA" },
            ]}
            rows={disputeQueue.slice(0, 10).map((order) => {
              const createdAt = order.createdAt ? new Date(order.createdAt) : null;
              const resolvedAt = order._id ? disputeResolutionMap.get(String(order._id)) : null;
              const ageHours = createdAt ? Math.round((Date.now() - createdAt.getTime()) / (1000 * 60 * 60)) : 0;
              const resolutionHours =
                createdAt && resolvedAt
                  ? Math.round((resolvedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60))
                  : null;
              const slaHours = resolutionHours ?? ageHours;
              const slaBreached = slaHours > 72;
              return {
                id: String(order._id || ""),
                order: order._id ? String(order._id).slice(-6) : "Order",
                status: order.disputeStatus || "OPEN",
                reason: order.disputeReason || "NONE",
                opened: createdAt ? createdAt.toLocaleDateString() : "Unknown",
                age: resolutionHours ?? ageHours,
                sla: slaBreached ? "Breached" : "On track",
              };
            })}
          />
          {!disputeQueue.length ? (
            <p className="mt-3 text-sm text-muted-foreground">No disputes match the filters.</p>
          ) : null}
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

function buildDailyDisputeSeries(orders: OrderRow[], days: number) {
  const today = new Date();
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = date.toLocaleDateString();
    buckets.set(key, 0);
  }
  orders.forEach((order) => {
    if (!order.createdAt) return;
    if ((order.disputeStatus || "NONE") === "NONE") return;
    const key = new Date(order.createdAt).toLocaleDateString();
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }
  });
  return Array.from(buckets.entries()).map(([label, value]) => ({ label, value }));
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

function applyDisputeExportPreset(row: Record<string, string>, preset: string) {
  if (preset === "resolution") {
    return {
      orderId: row.orderId,
      disputeStatus: row.disputeStatus,
      disputeReason: row.disputeReason,
      createdAt: row.createdAt,
    };
  }
  if (preset === "notes") {
    return {
      orderId: row.orderId,
      adminNotes: row.adminNotes,
      createdAt: row.createdAt,
    };
  }
  if (preset === "full") {
    return row;
  }
  return {
    orderId: row.orderId,
    disputeStatus: row.disputeStatus,
    disputeReason: row.disputeReason,
  };
}
