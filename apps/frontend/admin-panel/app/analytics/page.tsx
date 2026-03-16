"use client";

import { useEffect, useMemo, useState } from "react";
import { AnalyticsCards, Card, CardDescription, CardTitle } from "@dokanx/ui";

import { getAdminKpi, getAdminMetrics } from "@/lib/admin-runtime-api";

type MetricsState = {
  shops?: number;
  orders?: number;
};

type KpiState = {
  totalOrders?: number;
  revenue?: number;
  settled?: number;
};

export const dynamic = "force-dynamic";

export default function Page() {
  const [metrics, setMetrics] = useState<MetricsState | null>(null);
  const [kpis, setKpis] = useState<KpiState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [metricsResponse, kpiResponse] = await Promise.all([
          getAdminMetrics(),
          getAdminKpi(),
        ]);
        if (!active) return;
        setMetrics(metricsResponse || null);
        setKpis(kpiResponse.data || null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load analytics.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const cards = useMemo(() => {
    return [
      { label: "Tenants", value: String(metrics?.shops ?? 0), meta: "Active shops" },
      { label: "Orders", value: String(metrics?.orders ?? 0), meta: "Platform total" },
      { label: "Revenue", value: `${kpis?.revenue ?? 0} BDT`, meta: "Gross volume" },
      { label: "Settled", value: `${kpis?.settled ?? 0} BDT`, meta: "Paid out" },
    ];
  }, [kpis?.revenue, kpis?.settled, metrics?.orders, metrics?.shops]);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="dx-display text-3xl">Analytics</h1>
        <p className="text-sm text-muted-foreground">KPI trends and signals</p>
      </div>
      <AnalyticsCards items={cards} />
      {error ? (
        <Card>
          <CardTitle>Analytics feed</CardTitle>
          <CardDescription className="mt-2">{error}</CardDescription>
        </Card>
      ) : null}
    </div>
  );
}
