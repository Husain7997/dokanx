"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Card, CardDescription, CardTitle, SelectDropdown } from "@dokanx/ui";
import maplibregl from "maplibre-gl";

import { listShipments, trackShipment } from "@/lib/runtime-api";
import type { Feature, LineString } from "geojson";

type ShipmentRow = {
  _id?: string;
  orderId?: string;
  trackingNumber?: string;
  carrier?: string;
  status?: string;
  createdAt?: string;
};

type TrackingEvent = {
  status?: string;
  message?: string;
  location?: string;
  geo?: { lat?: number; lng?: number };
  timestamp?: string;
};

export default function ShippingTrackingMapPage() {
  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [status, setStatus] = useState("Idle");
  const [error, setError] = useState<string | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const replayMarkerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const shipmentResponse = await listShipments(100);
        if (!active) return;
        const rows = Array.isArray(shipmentResponse.data) ? (shipmentResponse.data as ShipmentRow[]) : [];
        setShipments(rows);
        if (!selectedId && rows.length) {
          setSelectedId(String(rows[0]._id || rows[0].trackingNumber || ""));
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load shipments.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [selectedId]);

  const shipmentOptions = useMemo(
    () =>
      shipments.map((item) => ({
        label: `${String(item.orderId || "").slice(-6) || "Order"} • ${item.trackingNumber || "Tracking pending"}`,
        value: String(item._id || item.trackingNumber || ""),
      })),
    [shipments]
  );

  const selectedShipment = useMemo(
    () => shipments.find((item) => String(item._id || item.trackingNumber || "") === selectedId),
    [shipments, selectedId]
  );

  const geoPoints = useMemo(() => {
    const rows = events
      .map((event) => ({
        ...event,
        lat: event.geo?.lat,
        lng: event.geo?.lng,
      }))
      .filter((event) => typeof event.lat === "number" && typeof event.lng === "number") as Array<
      TrackingEvent & { lat: number; lng: number }
    >;
    return rows;
  }, [events]);


  async function handleLoadTracking() {
    if (!selectedShipment?.trackingNumber) return;
    setStatus("Tracking");
    setError(null);
    try {
      const response = await trackShipment(selectedShipment.trackingNumber);
      const rows = Array.isArray(response.data?.events) ? response.data?.events || [] : [];
      setEvents(rows as TrackingEvent[]);
      setStatus(response.data?.status || "Tracked");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load tracking events.");
      setStatus("Failed");
    }
  }

  useEffect(() => {
    if (selectedShipment?.trackingNumber) {
      void handleLoadTracking();
    }
  }, [selectedShipment?.trackingNumber]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [90.4125, 23.8103],
      zoom: 11,
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    if (replayMarkerRef.current) {
      replayMarkerRef.current.remove();
      replayMarkerRef.current = null;
    }

    if (!geoPoints.length) return;

    const bounds = new maplibregl.LngLatBounds();
    geoPoints.forEach((point) => {
      const markerEl = document.createElement("div");
      markerEl.className = "dx-map-marker";
      markerEl.style.width = "12px";
      markerEl.style.height = "12px";
      markerEl.style.borderRadius = "999px";
      markerEl.style.background = "#10b981";
      markerEl.style.boxShadow = "0 0 12px rgba(16,185,129,0.6)";

      const marker = new maplibregl.Marker({ element: markerEl })
        .setLngLat([point.lng, point.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 20 }).setHTML(
            `<div style="font-size:12px;line-height:1.4">
              <strong>${point.status || "Update"}</strong><br/>
              ${point.location || ""}<br/>
              ${point.timestamp ? new Date(point.timestamp).toLocaleString() : ""}
            </div>`
          )
        )
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([point.lng, point.lat]);
    });

    const routeId = "dx-route-line";
    const sourceId = "dx-route-source";
    const geojson: Feature<LineString> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: geoPoints.map((point) => [point.lng, point.lat]),
      },
    };

    const updateRoute = () => {
      const existingSource = map.getSource(sourceId);
      if (existingSource) {
        (existingSource as maplibregl.GeoJSONSource).setData(geojson);
      } else {
        map.addSource(sourceId, { type: "geojson", data: geojson });
        map.addLayer({
          id: routeId,
          type: "line",
          source: sourceId,
          paint: {
            "line-color": "#10b981",
            "line-width": 3,
            "line-opacity": 0.8,
          },
        });
      }
    };

    if (map.isStyleLoaded()) {
      updateRoute();
    } else {
      map.once("load", updateRoute);
    }

    map.fitBounds(bounds, { padding: 40, maxZoom: 14, duration: 600 });
  }, [geoPoints]);

  useEffect(() => {
    if (!isReplaying) return;
    if (!geoPoints.length) {
      setIsReplaying(false);
      return;
    }
    setReplayIndex(0);
    const interval = setInterval(() => {
      setReplayIndex((current) => {
        const next = current + 1;
        if (next >= geoPoints.length) {
          setIsReplaying(false);
          clearInterval(interval);
          return current;
        }
        return next;
      });
    }, 900);
    return () => clearInterval(interval);
  }, [isReplaying, geoPoints]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geoPoints.length) return;
    const point = geoPoints[replayIndex];
    if (!point) return;
    if (!replayMarkerRef.current) {
      const markerEl = document.createElement("div");
      markerEl.style.width = "14px";
      markerEl.style.height = "14px";
      markerEl.style.borderRadius = "999px";
      markerEl.style.background = "#f97316";
      markerEl.style.boxShadow = "0 0 12px rgba(249,115,22,0.7)";
      replayMarkerRef.current = new maplibregl.Marker({ element: markerEl }).addTo(map);
    }
    replayMarkerRef.current.setLngLat([point.lng, point.lat]);
  }, [replayIndex, geoPoints]);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Shipping</p>
        <h1 className="dx-display text-3xl">Tracking Map</h1>
        <p className="text-sm text-muted-foreground">Geo event visualization for a shipment route and courier checkpoint history.</p>
      </div>
      {error ? (
        <Card>
          <CardTitle>Error</CardTitle>
          <CardDescription className="mt-2">{error}</CardDescription>
        </Card>
      ) : null}

      <Card>
        <CardTitle>Shipment selection</CardTitle>
        <CardDescription className="mt-2">Pick a shipment to visualize geo tracking events.</CardDescription>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <SelectDropdown label="Shipment" value={selectedId} onValueChange={setSelectedId} options={shipmentOptions} />
          <Button onClick={() => void handleLoadTracking()} disabled={!selectedShipment?.trackingNumber}>
            Refresh
          </Button>
          <Badge variant="secondary">{status}</Badge>
          <Button
            variant="outline"
            onClick={() => setIsReplaying((current) => !current)}
            disabled={!geoPoints.length}
          >
            {isReplaying ? "Stop replay" : "Replay route"}
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card>
          <CardTitle>Geo map</CardTitle>
          <CardDescription className="mt-2">Plotting carrier checkpoints with latitude/longitude.</CardDescription>
          <div className="relative mt-4 h-[360px] overflow-hidden rounded-3xl border border-border/60">
            <div ref={mapContainerRef} className="h-full w-full" />
            {!geoPoints.length ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                No geo events are available for this shipment yet.
              </div>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardTitle>Event timeline</CardTitle>
          <CardDescription className="mt-2">Latest courier checkpoints.</CardDescription>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            {events.map((event, index) => (
              <div key={`${event.timestamp || index}`} className="rounded-2xl border border-border/60 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{event.status || "Update"}</span>
                  <Badge variant={event.status === "DELIVERED" ? "success" : "neutral"}>
                    {event.timestamp ? new Date(event.timestamp).toLocaleString() : "Pending"}
                  </Badge>
                </div>
                {event.location ? <p className="mt-2 text-xs text-muted-foreground">{event.location}</p> : null}
                {event.geo?.lat && event.geo?.lng ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Lat {event.geo.lat.toFixed(4)} - Lng {event.geo.lng.toFixed(4)}
                  </p>
                ) : null}
              </div>
            ))}
            {!events.length ? <p>No tracking events have been recorded yet.</p> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}


