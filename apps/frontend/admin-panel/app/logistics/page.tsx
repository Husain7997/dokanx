"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Card, CardDescription, CardTitle, DataTable, Grid, Input, ProgressBar, SelectDropdown } from "@dokanx/ui";

import { listCarriers, listShipments } from "@/lib/admin-runtime-api";

type ShipmentRow = {
  _id?: string;
  orderId?: string;
  trackingNumber?: string;
  carrier?: string;
  status?: string;
  createdAt?: string;
  events?: Array<{ status?: string; message?: string; timestamp?: string }>;
};

type CarrierRow = {
  id?: string;
  name?: string;
  supportsTracking?: boolean;
};

const trackingStages = [
  { key: "CREATED", label: "Shipment Created" },
  { key: "PICKED_UP", label: "Picked Up" },
  { key: "IN_TRANSIT", label: "In Transit" },
  { key: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { key: "DELIVERED", label: "Delivered" },
  { key: "FAILED", label: "Failed Delivery" },
  { key: "RETURNED", label: "Returned" },
];

export const dynamic = "force-dynamic";

export default function LogisticsPage() {
  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [carriers, setCarriers] = useState<CarrierRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [carrierFilter, setCarrierFilter] = useState("ALL");

  const deliveryStats = useMemo(() => {
    const total = shipments.length;
    const delivered = shipments.filter((shipment) => shipment.status === "DELIVERED").length;
    const failed = shipments.filter((shipment) =>
      ["FAILED", "RETURNED"].includes(String(shipment.status || "").toUpperCase())
    ).length;
    const inTransit = shipments.filter((shipment) =>
      ["IN_TRANSIT", "OUT_FOR_DELIVERY", "PICKED_UP"].includes(String(shipment.status || "").toUpperCase())
    ).length;
    const carrierCount = new Map<string, number>();
    shipments.forEach((shipment) => {
      const key = shipment.carrier || "Unknown";
      carrierCount.set(key, (carrierCount.get(key) || 0) + 1);
    });
    const topCourier = Array.from(carrierCount.entries()).sort((a, b) => b[1] - a[1])[0];
    const deliveryTimes = shipments
      .map((shipment) => {
        if (!shipment.createdAt || !shipment.events?.length) return null;
        const deliveredEvent = shipment.events.find(
          (event) => String(event.status || "").toUpperCase() === "DELIVERED"
        );
        if (!deliveredEvent?.timestamp) return null;
        const start = new Date(shipment.createdAt).getTime();
        const end = new Date(deliveredEvent.timestamp).getTime();
        if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
        return (end - start) / (1000 * 60 * 60 * 24);
      })
      .filter((value): value is number => value !== null);
    const avgDeliveryDays = deliveryTimes.length
      ? deliveryTimes.reduce((sum, value) => sum + value, 0) / deliveryTimes.length
      : null;
    const successRate = total ? (delivered / total) * 100 : 0;
    const failureRate = total ? (failed / total) * 100 : 0;
    return {
      total,
      delivered,
      failed,
      inTransit,
      topCourier,
      avgDeliveryDays,
      successRate,
      failureRate,
      carrierCount,
    };
  }, [shipments]);

  const timeline = useMemo(
    () =>
      trackingStages.map((stage) => {
        const count = shipments.reduce((sum, shipment) => {
          const statusMatch = String(shipment.status || "").toUpperCase() === stage.key;
          const eventMatch = shipment.events?.some(
            (event) => String(event.status || "").toUpperCase() === stage.key
          );
          return sum + (statusMatch || eventMatch ? 1 : 0);
        }, 0);
        return { ...stage, count };
      }),
    [shipments]
  );

  const carrierBreakdown = useMemo(() => {
    if (!shipments.length) return [];
    const totals = new Map<string, number>();
    shipments.forEach((shipment) => {
      const key = shipment.carrier || "Unknown";
      totals.set(key, (totals.get(key) || 0) + 1);
    });
    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        percent: deliveryStats.total ? Math.round((count / deliveryStats.total) * 100) : 0,
      }));
  }, [shipments, deliveryStats.total]);

  const carrierOptions = useMemo(() => {
    const values = Array.from(new Set(shipments.map((shipment) => shipment.carrier || "Unknown")));
    return [{ label: "All carriers", value: "ALL" }, ...values.map((value) => ({ label: value, value }))];
  }, [shipments]);

  const statusOptions = useMemo(() => {
    const values = Array.from(new Set(shipments.map((shipment) => shipment.status || "CREATED")));
    return [{ label: "All statuses", value: "ALL" }, ...values.map((value) => ({ label: value, value }))];
  }, [shipments]);

  const filteredShipments = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return shipments.filter((shipment) => {
      if (statusFilter !== "ALL" && String(shipment.status || "CREATED") !== statusFilter) return false;
      if (carrierFilter !== "ALL" && String(shipment.carrier || "Unknown") !== carrierFilter) return false;
      if (!needle) return true;
      return [shipment.orderId, shipment.trackingNumber, shipment.carrier, shipment.status]
        .some((value) => String(value || "").toLowerCase().includes(needle));
    });
  }, [carrierFilter, query, shipments, statusFilter]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [shipmentResponse, carrierResponse] = await Promise.all([
          listShipments(150),
          listCarriers(),
        ]);
        if (!active) return;
        setShipments(Array.isArray(shipmentResponse.data) ? (shipmentResponse.data as ShipmentRow[]) : []);
        setCarriers(Array.isArray(carrierResponse.data) ? (carrierResponse.data as CarrierRow[]) : []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load logistics metrics.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="grid gap-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="dx-display text-3xl">Logistics</h1>
        <p className="text-sm text-muted-foreground">Courier orchestration, tracking, and SLA intelligence.</p>
      </div>
      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="grid gap-3 md:grid-cols-4">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search order / tracking / carrier"
        />
        <SelectDropdown
          label="Status"
          value={statusFilter}
          onValueChange={setStatusFilter}
          options={statusOptions}
        />
        <SelectDropdown
          label="Carrier"
          value={carrierFilter}
          onValueChange={setCarrierFilter}
          options={carrierOptions}
        />
        <Button
          variant="outline"
          onClick={() => {
            const csv = buildCsv(
              filteredShipments.map((shipment) => ({
                orderId: shipment.orderId || "",
                trackingNumber: shipment.trackingNumber || "",
                carrier: shipment.carrier || "",
                status: shipment.status || "",
                createdAt: shipment.createdAt || "",
              }))
            );
            downloadCsv(csv, `logistics-shipments-${new Date().toISOString().slice(0, 10)}.csv`);
          }}
        >
          Export CSV
        </Button>
      </div>

      <Grid minColumnWidth="220px" className="gap-4">
        <Card>
          <CardTitle>Total shipments</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{deliveryStats.total}</p>
          <p className="mt-1 text-xs text-muted-foreground">Across all merchants</p>
        </Card>
        <Card>
          <CardTitle>Delivered</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{deliveryStats.delivered}</p>
          <div className="mt-3">
            <ProgressBar value={deliveryStats.total ? (deliveryStats.delivered / deliveryStats.total) * 100 : 0} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{deliveryStats.successRate.toFixed(1)}% success rate</p>
        </Card>
        <Card>
          <CardTitle>In transit</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{deliveryStats.inTransit}</p>
          <p className="mt-1 text-xs text-muted-foreground">Active delivery workload</p>
        </Card>
        <Card>
          <CardTitle>Failed / returned</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{deliveryStats.failed}</p>
          <p className="mt-1 text-xs text-muted-foreground">{deliveryStats.failureRate.toFixed(1)}% failure rate</p>
        </Card>
      </Grid>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Courier aggregation</CardTitle>
          <CardDescription className="mt-2">Active courier integrations and volume share.</CardDescription>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            {(carriers.length ? carriers : []).map((carrier) => {
              const count = deliveryStats.carrierCount.get(carrier.name || carrier.id || "Courier") || 0;
              return (
                <div key={String(carrier.id || carrier.name)} className="rounded-2xl border border-border/60 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{carrier.name || carrier.id || "Courier"}</span>
                    <Badge variant={carrier.supportsTracking ? "success" : "warning"}>
                      {carrier.supportsTracking ? "Tracking" : "Manual"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{count} shipments routed</p>
                </div>
              );
            })}
            {!carriers.length ? <p>No couriers configured yet.</p> : null}
          </div>
        </Card>

        <Card>
          <CardTitle>Courier performance</CardTitle>
          <CardDescription className="mt-2">Delivery mix across couriers.</CardDescription>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            {carrierBreakdown.map((row) => (
              <div key={row.name} className="rounded-2xl border border-border/60 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{row.name}</span>
                  <Badge variant="secondary">{row.count} shipments</Badge>
                </div>
                <div className="mt-3">
                  <ProgressBar value={row.percent} />
                </div>
              </div>
            ))}
            {!carrierBreakdown.length ? <p>No shipment volume yet.</p> : null}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>Tracking lifecycle</CardTitle>
          <CardDescription className="mt-2">Shipment status distribution.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
            {timeline.map((stage) => (
              <div key={stage.key} className="flex items-center justify-between gap-2 rounded-2xl border border-border/60 px-4 py-2">
                <span>{stage.label}</span>
                <Badge variant={stage.key === "DELIVERED" ? "success" : "neutral"}>
                  {stage.count}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Delivery SLA</CardTitle>
          <CardDescription className="mt-2">Time-to-deliver trends.</CardDescription>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            <div className="rounded-2xl border border-border/60 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Average delivery</p>
              <p className="mt-2 text-xl font-semibold text-foreground">
                {deliveryStats.avgDeliveryDays ? `${deliveryStats.avgDeliveryDays.toFixed(1)} days` : "No data yet"}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Top courier</p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {deliveryStats.topCourier ? deliveryStats.topCourier[0] : "Awaiting volume"}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Success rate</p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {deliveryStats.total ? `${deliveryStats.successRate.toFixed(1)}%` : "No data yet"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>Shipment operations</CardTitle>
        <CardDescription className="mt-2">Filtered shipment drilldown with latest known state.</CardDescription>
        <DataTable
          columns={[
            { key: "order", header: "Order" },
            { key: "tracking", header: "Tracking" },
            { key: "carrier", header: "Carrier" },
            { key: "status", header: "Status" },
            { key: "latestEvent", header: "Latest event" },
          ]}
          rows={filteredShipments.slice(0, 12).map((shipment) => {
            const latestEvent = shipment.events?.[shipment.events.length - 1];
            return {
              id: String(shipment._id || shipment.trackingNumber || ""),
              order: shipment.orderId ? String(shipment.orderId).slice(-6) : "Order",
              tracking: shipment.trackingNumber || "Pending",
              carrier: shipment.carrier || "Unknown",
              status: shipment.status || "CREATED",
              latestEvent: latestEvent?.message || latestEvent?.status || "No event yet",
            };
          })}
        />
        {!filteredShipments.length ? (
          <p className="mt-3 text-sm text-muted-foreground">No shipments match the current filters.</p>
        ) : null}
      </Card>
    </div>
  );
}

function buildCsv(rows: Array<Record<string, string | number>>) {
  const headers = rows.length ? Object.keys(rows[0]) : ["orderId", "trackingNumber", "carrier", "status", "createdAt"];
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
