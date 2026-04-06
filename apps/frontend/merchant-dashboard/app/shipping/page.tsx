"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Alert, Badge, Button, Card, CardDescription, CardTitle, CourierTrackingPanel, Grid, SelectDropdown, TextInput } from "@dokanx/ui";

import { createShipment, downloadShipmentLabelPdf, listCarriers, listShipments, trackShipment } from "@/lib/runtime-api";

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

type TrackingEvent = {
  status?: string;
  message?: string;
  timestamp?: string;
};

export default function ShippingPage() {
  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [carriers, setCarriers] = useState<CarrierRow[]>([]);
  const [orderId, setOrderId] = useState("");
  const [carrier, setCarrier] = useState("");
  const [selectedShipmentId, setSelectedShipmentId] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  const [trackingStatus, setTrackingStatus] = useState("Idle");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const [shipmentResponse, carrierResponse] = await Promise.all([
      listShipments({ limit: 200, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }),
      listCarriers(),
    ]);
    setShipments(Array.isArray(shipmentResponse.data) ? (shipmentResponse.data as ShipmentRow[]) : []);
    setCarriers(Array.isArray(carrierResponse.data) ? (carrierResponse.data as CarrierRow[]) : []);
    if (!carrier && carrierResponse.data?.length) {
      setCarrier(String(carrierResponse.data[0]?.id || ""));
    }
    if (!selectedShipmentId && shipmentResponse.data?.length) {
      const first = shipmentResponse.data?.[0] as ShipmentRow;
      setSelectedShipmentId(String(first?._id || first?.trackingNumber || ""));
      if (first?.trackingNumber) setTrackingNumber(first.trackingNumber);
    }
  }

  useEffect(() => {
    void refresh();
  }, [dateFrom, dateTo]);

  const filteredShipments = useMemo(() => {
    if (!dateFrom && !dateTo) return shipments;
    const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;
    return shipments.filter((row) => {
      if (!row.createdAt) return false;
      const created = new Date(row.createdAt).getTime();
      if (Number.isNaN(created)) return false;
      if (fromTime !== null && created < fromTime) return false;
      if (toTime !== null && created > toTime) return false;
      return true;
    });
  }, [shipments, dateFrom, dateTo]);

  const statusSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    filteredShipments.forEach((row) => {
      const key = row.status || "CREATED";
      summary[key] = (summary[key] || 0) + 1;
    });
    return summary;
  }, [filteredShipments]);

  const carrierOptions = useMemo(
    () =>
      carriers.map((item) => ({
        label: item.name || item.id || "Carrier",
        value: String(item.id || "")
      })),
    [carriers]
  );

  const shipmentOptions = useMemo(
    () =>
      filteredShipments.map((item) => ({
        label: `${String(item.orderId || "").slice(-6) || "Order"} • ${item.trackingNumber || "Tracking pending"}`,
        value: String(item._id || item.trackingNumber || ""),
      })),
    [filteredShipments]
  );

  const selectedShipment = useMemo(
    () => filteredShipments.find((item) => String(item._id || item.trackingNumber || "") === selectedShipmentId),
    [filteredShipments, selectedShipmentId]
  );

  const reportStats = useMemo(() => {
    const total = filteredShipments.length;
    const delivered = filteredShipments.filter((row) => row.status === "DELIVERED").length;
    const failed = filteredShipments.filter((row) =>
      ["FAILED", "RETURNED"].includes(String(row.status || "").toUpperCase())
    ).length;
    const inTransit = filteredShipments.filter((row) =>
      ["IN_TRANSIT", "OUT_FOR_DELIVERY", "PICKED_UP"].includes(String(row.status || "").toUpperCase())
    ).length;
    const deliveryTimes = filteredShipments
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
    return {
      total,
      delivered,
      failed,
      inTransit,
      avgDeliveryDays,
      successRate: total ? (delivered / total) * 100 : 0,
      failureRate: total ? (failed / total) * 100 : 0,
    };
  }, [filteredShipments]);

  async function handleCreateShipment() {
    if (!orderId || !carrier) return;
    setError(null);
    setStatus(null);
    try {
      await createShipment({ orderId, carrier });
      setStatus("Shipment created.");
      setOrderId("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create shipment.");
    }
  }

  async function handleTrack() {
    if (!trackingNumber) return;
    setTrackingStatus("Tracking");
    setError(null);
    try {
      const response = await trackShipment(trackingNumber);
      const events = Array.isArray(response.data?.events) ? response.data?.events || [] : [];
      setTrackingEvents(events as TrackingEvent[]);
      setTrackingStatus(response.data?.status || "Tracked");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to track shipment.");
      setTrackingStatus("Failed");
    }
  }

  async function handlePrintLabel() {
    if (!selectedShipment?.trackingNumber) return;
    try {
      const blob = await downloadShipmentLabelPdf(selectedShipment.trackingNumber);
      const url = window.URL.createObjectURL(blob);
      const popup = window.open(url, "label-pdf");
      if (popup) popup.focus();
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to download label.");
    }
  }

  const checkpoints = useMemo(
    () =>
      trackingEvents.map((event) => ({
        label: `${event.status || "Update"} ${event.message ? `- ${event.message}` : ""}`.trim(),
        time: event.timestamp ? new Date(event.timestamp).toLocaleString() : "Pending",
      })),
    [trackingEvents]
  );

  return (
    <div className="grid gap-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Shipping</p>
        <h1 className="dx-display text-3xl">Merchant Shipping Dashboard</h1>
        <p className="text-sm text-muted-foreground">Create shipments, print labels, track delivery, and review dispatch reports from one operator desk.</p>
      </div>
      {error ? <Alert variant="error">{error}</Alert> : null}

      <Grid minColumnWidth="220px" className="gap-4">
        <Card>
          <CardTitle>Total shipments</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{reportStats.total}</p>
          <p className="mt-1 text-xs text-muted-foreground">All shipments for your store</p>
        </Card>
        <Card>
          <CardTitle>Delivered</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{reportStats.delivered}</p>
          <p className="mt-1 text-xs text-muted-foreground">{reportStats.successRate.toFixed(1)}% success</p>
        </Card>
        <Card>
          <CardTitle>In transit</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{reportStats.inTransit}</p>
          <p className="mt-1 text-xs text-muted-foreground">Live delivery workload</p>
        </Card>
        <Card>
          <CardTitle>Avg delivery time</CardTitle>
          <p className="mt-3 text-2xl font-semibold">
            {reportStats.avgDeliveryDays ? `${reportStats.avgDeliveryDays.toFixed(1)} days` : "No data"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{reportStats.failureRate.toFixed(1)}% failure</p>
        </Card>
      </Grid>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Create shipment</CardTitle>
          <CardDescription className="mt-2">Generate labels and assign a carrier for live orders.</CardDescription>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_200px_auto]">
            <TextInput value={orderId} onChange={(event) => setOrderId(event.target.value)} placeholder="Order ID" />
            <SelectDropdown
              label="Carrier"
              value={carrier}
              onValueChange={setCarrier}
              options={carrierOptions}
            />
            <Button onClick={handleCreateShipment} disabled={!orderId || !carrier}>
              Create
            </Button>
          </div>
          {status ? <Alert variant="success" className="mt-3">{status}</Alert> : null}
        </Card>

        <Card>
          <CardTitle>Print shipping label</CardTitle>
          <CardDescription className="mt-2">Select a shipment and generate a printable label.</CardDescription>
          <div className="mt-4 grid gap-3">
            <SelectDropdown
              label="Shipment"
              value={selectedShipmentId}
              onValueChange={setSelectedShipmentId}
              options={shipmentOptions}
            />
            <div className="rounded-2xl border border-border/60 px-4 py-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Label preview</p>
              <p>Order: {selectedShipment?.orderId || "Order pending"}</p>
              <p>Carrier: {selectedShipment?.carrier || "Carrier"}</p>
              <p>Tracking: {selectedShipment?.trackingNumber || "Tracking pending"}</p>
            </div>
            <Button variant="secondary" onClick={handlePrintLabel} disabled={!selectedShipment}>
              Download PDF label
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Tracking</CardTitle>
          <CardDescription className="mt-2">Track a shipment in real time and review the latest courier movement.</CardDescription>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <TextInput
              value={trackingNumber}
              onChange={(event) => setTrackingNumber(event.target.value)}
              placeholder="Tracking number"
            />
            <Button onClick={() => void handleTrack()} disabled={!trackingNumber}>
              Track
            </Button>
            <Button asChild variant="outline">
              <Link href="/shipping/tracking-map">Open tracking map</Link>
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {Object.keys(statusSummary).length
              ? Object.entries(statusSummary).map(([label, count]) => (
                  <Badge key={label} variant="neutral">
                    {label}: {count}
                  </Badge>
                ))
               : <span className="text-sm text-muted-foreground">No shipments have been created yet. Status counts will appear here once dispatch operations begin.</span>}
          </div>
        </Card>
        <CourierTrackingPanel
          courier={selectedShipment?.carrier || "Carrier status"}
          status={trackingStatus}
          checkpoints={checkpoints.length ? checkpoints : [{ label: "Awaiting tracking updates", time: "Pending" }]}
        />
      </div>

      <Card>
        <CardTitle>Shipping reports</CardTitle>
        <CardDescription className="mt-2">Recent dispatches and courier analytics.</CardDescription>
        <div className="mt-4 grid gap-3 md:grid-cols-[200px_200px_auto]">
          <TextInput label="From" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <TextInput label="To" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          <div className="flex items-end">
            <Button variant="outline" onClick={() => { setDateFrom(""); setDateTo(""); }}>
              Clear range
            </Button>
          </div>
        </div>
        <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
          {filteredShipments.map((row) => (
            <div key={String(row._id || row.trackingNumber)} className="flex flex-wrap justify-between gap-2 rounded-2xl border border-border/60 px-4 py-3">
              <span>{row.orderId || "Order"}</span>
              <span>{row.carrier || "Carrier"}</span>
              <span>{row.trackingNumber || "Tracking pending"}</span>
              <Badge variant={row.status === "DELIVERED" ? "success" : "neutral"}>{row.status || "CREATED"}</Badge>
              <span>{row.createdAt ? new Date(row.createdAt).toLocaleString() : "Pending"}</span>
            </div>
          ))}
          {!filteredShipments.length ? <p className="text-sm text-muted-foreground">No shipments matched this date window. Adjust the range or create a new dispatch to populate this report.</p> : null}
        </div>
      </Card>
    </div>
  );
}



