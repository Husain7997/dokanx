"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardDescription, CardTitle, Input } from "@dokanx/ui";

import { createShipment, listCarriers, listShipments } from "@/lib/runtime-api";

type ShipmentRow = {
  _id?: string;
  orderId?: string;
  trackingNumber?: string;
  carrier?: string;
  status?: string;
  createdAt?: string;
};

type CarrierRow = {
  id?: string;
  name?: string;
};

export default function ShippingPage() {
  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [carriers, setCarriers] = useState<CarrierRow[]>([]);
  const [orderId, setOrderId] = useState("");
  const [carrier, setCarrier] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const [shipmentResponse, carrierResponse] = await Promise.all([
      listShipments(100),
      listCarriers(),
    ]);
    setShipments(Array.isArray(shipmentResponse.data) ? (shipmentResponse.data as ShipmentRow[]) : []);
    setCarriers(Array.isArray(carrierResponse.data) ? (carrierResponse.data as CarrierRow[]) : []);
    if (!carrier && carrierResponse.data?.length) {
      setCarrier(String(carrierResponse.data[0]?.id || ""));
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const statusSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    shipments.forEach((row) => {
      const key = row.status || "CREATED";
      summary[key] = (summary[key] || 0) + 1;
    });
    return summary;
  }, [shipments]);

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

  return (
    <div className="grid gap-6">
      <Card>
        <CardTitle>Create shipment</CardTitle>
        <CardDescription className="mt-2">Generate labels and assign a carrier for orders.</CardDescription>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_200px_auto]">
          <Input value={orderId} onChange={(event) => setOrderId(event.target.value)} placeholder="Order ID" />
          <select
            className="h-11 rounded-full border border-border bg-background px-4 text-sm"
            value={carrier}
            onChange={(event) => setCarrier(event.target.value)}
          >
            {carriers.map((item) => (
              <option key={String(item.id || item.name)} value={String(item.id || "")}>
                {item.name || item.id}
              </option>
            ))}
          </select>
          <button
            className="rounded-full border border-white/60 bg-black px-4 py-2 text-xs font-semibold text-white"
            onClick={handleCreateShipment}
            disabled={!orderId || !carrier}
          >
            Create
          </button>
        </div>
        {status ? <p className="mt-3 text-xs text-emerald-700">{status}</p> : null}
        {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}
      </Card>

      <Card>
        <CardTitle>Shipment overview</CardTitle>
        <CardDescription className="mt-2">Track delivery statuses and recent dispatches.</CardDescription>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {Object.keys(statusSummary).length
            ? Object.entries(statusSummary).map(([label, count]) => (
                <span key={label} className="rounded-full border border-border/60 px-3 py-1">
                  {label}: {count}
                </span>
              ))
            : "No shipments yet."}
        </div>
        <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
          {shipments.map((row) => (
            <div key={String(row._id || row.trackingNumber)} className="flex flex-wrap justify-between gap-2 rounded-2xl border border-border/60 px-4 py-3">
              <span>{row.orderId || "Order"}</span>
              <span>{row.carrier || "Carrier"}</span>
              <span>{row.trackingNumber || "Tracking pending"}</span>
              <span>{row.status || "CREATED"}</span>
              <span>{row.createdAt ? new Date(row.createdAt).toLocaleString() : "Pending"}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
