"use client";

import { useEffect, useState } from "react";
import { getEtaSettings } from "@/lib/admin-runtime-api";

type EtaSettings = {
  basePerKm?: number;
  minEta?: number;
  fallbackEta?: number;
  trafficFactors?: Array<{ maxDistanceKm?: number; minutes?: number }>;
  distanceBrackets?: Array<{ maxDistanceKm?: number; minutes?: number }>;
};

export function AdminEtaHealth() {
  const [settings, setSettings] = useState<EtaSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await getEtaSettings();
        if (!active) return;
        setSettings(response.data || null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load ETA settings.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="grid gap-3 rounded-3xl border border-white/40 bg-white/70 p-6 shadow-sm">
      <p className="text-sm font-semibold text-foreground">ETA configuration</p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!settings && !error ? (
        <p className="text-sm text-muted-foreground">Loading ETA thresholds...</p>
      ) : settings ? (
        <div className="grid gap-2 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Base per km</span>
            <span className="font-semibold text-foreground">{settings.basePerKm ?? "-"}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Minimum ETA</span>
            <span className="font-semibold text-foreground">{settings.minEta ?? "-"}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Fallback ETA</span>
            <span className="font-semibold text-foreground">{settings.fallbackEta ?? "-"}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Traffic brackets</span>
            <span className="font-semibold text-foreground">{settings.trafficFactors?.length ?? 0}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Distance brackets</span>
            <span className="font-semibold text-foreground">{settings.distanceBrackets?.length ?? 0}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
