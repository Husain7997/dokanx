"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Card, CardDescription, CardTitle, CourierTrackingPanel, TextInput } from "@dokanx/ui";

import { listCarriers, trackShipment } from "@/lib/runtime-api";

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

export default function CourierPage() {
  const [carriers, setCarriers] = useState<CarrierRow[]>([]);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  const [status, setStatus] = useState<string>("Idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await listCarriers();
        if (!active) return;
        setCarriers(Array.isArray(response.data) ? (response.data as CarrierRow[]) : []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load carriers.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  async function handleTrack() {
    if (!trackingNumber) return;
    setStatus("Tracking");
    setError(null);
    try {
      const response = await trackShipment(trackingNumber);
      const events = Array.isArray(response.data?.events) ? response.data?.events || [] : [];
      setTrackingEvents(events as TrackingEvent[]);
      setStatus(response.data?.status || "Tracked");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to track shipment.");
      setStatus("Failed");
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
      <Card>
        <CardTitle>Tracking control</CardTitle>
        <CardDescription className="mt-2">
          Search a shipment tracking number and review recent carrier updates.
        </CardDescription>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <TextInput value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} placeholder="Tracking number" />
          <Button onClick={() => void handleTrack()} disabled={!trackingNumber}>
            Track
          </Button>
        </div>
        {error ? <Alert variant="error" className="mt-3">{error}</Alert> : null}
      </Card>
      <CourierTrackingPanel
        courier="Carrier status"
        status={status}
        checkpoints={checkpoints.length ? checkpoints : [{ label: "Awaiting tracking updates", time: "Pending" }]}
      />
      <Card>
        <CardTitle>Available carriers</CardTitle>
        <div className="mt-4 grid gap-3 text-sm">
          {carriers.map((carrier) => (
            <div key={String(carrier.id || carrier.name)} className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
              <span>{carrier.name || "Carrier"}</span>
              <Badge variant={carrier.supportsTracking ? "success" : "warning"}>
                {carrier.supportsTracking ? "Tracking enabled" : "No tracking"}
              </Badge>
            </div>
          ))}
          {!carriers.length ? (
            <p className="text-sm text-muted-foreground">No carriers are configured yet. Connected courier partners will appear here once setup is complete.</p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

