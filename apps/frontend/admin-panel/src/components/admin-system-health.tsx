"use client";

import { useEffect, useState } from "react";
import { getApiBaseUrl } from "@dokanx/utils";

type HealthState = {
  loading: boolean;
  error: string | null;
  status: string;
  uptime: number;
  timestamp: number;
};

const initialState: HealthState = {
  loading: true,
  error: null,
  status: "UNKNOWN",
  uptime: 0,
  timestamp: 0,
};

export function AdminSystemHealth() {
  const [state, setState] = useState<HealthState>(initialState);

  useEffect(() => {
    let active = true;

    async function load() {
      setState((current) => ({ ...current, loading: true, error: null }));
      try {
        const response = await fetch(`${getApiBaseUrl()}/system/health`);
        if (!response.ok) {
          throw new Error("Health check failed");
        }
        const payload = (await response.json()) as { status?: string; uptime?: number; timestamp?: number };
        if (!active) return;
        setState({
          loading: false,
          error: null,
          status: String(payload.status || "UNKNOWN"),
          uptime: Number(payload.uptime || 0),
          timestamp: Number(payload.timestamp || Date.now()),
        });
      } catch (error) {
        if (!active) return;
        setState((current) => ({
          ...current,
          loading: false,
          error: error instanceof Error ? error.message : "Unable to reach health endpoint.",
        }));
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="grid gap-3 rounded-3xl border border-white/40 bg-white/70 p-6 shadow-sm">
      <p className="text-sm font-semibold text-foreground">Platform health</p>
      {state.loading ? (
        <p className="text-sm text-muted-foreground">Checking core services...</p>
      ) : state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : (
        <div className="grid gap-2 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Status</span>
            <span className="font-semibold text-foreground">{state.status}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Uptime (s)</span>
            <span className="font-semibold text-foreground">{Math.round(state.uptime)}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Last check</span>
            <span className="font-semibold text-foreground">
              {new Date(state.timestamp).toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
