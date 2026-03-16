"use client";

import { useEffect, useMemo, useState } from "react";

import { getFinanceKpis, getPayoutAlerts, getRevenueVsPayout } from "@/lib/admin-runtime-api";

type FinanceState = {
  loading: boolean;
  error: string | null;
  kpis: {
    totalRevenue?: number;
    totalCommission?: number;
    totalPayout?: number;
    totalSettlements?: number;
  };
  series: Array<{ day: string; revenue: number; payout: number }>;
  alerts: number;
};

const initialState: FinanceState = {
  loading: true,
  error: null,
  kpis: {},
  series: [],
  alerts: 0,
};

export function AdminFinanceOverview() {
  const [state, setState] = useState<FinanceState>(initialState);

  useEffect(() => {
    let active = true;

    async function load() {
      setState((current) => ({ ...current, loading: true, error: null }));
      try {
        const [kpiResponse, seriesResponse, alertsResponse] = await Promise.all([
          getFinanceKpis(),
          getRevenueVsPayout(),
          getPayoutAlerts(),
        ]);

        if (!active) return;

        const series =
          seriesResponse.data?.map((item) => ({
            day: String(item._id?.day || "N/A"),
            revenue: Number(item.revenue || 0),
            payout: Number(item.payout || 0),
          })) || [];

        setState({
          loading: false,
          error: null,
          kpis: kpiResponse.data || {},
          series,
          alerts: alertsResponse.data?.length || 0,
        });
      } catch (error) {
        if (!active) return;
        setState((current) => ({
          ...current,
          loading: false,
          error: error instanceof Error ? error.message : "Unable to load finance data.",
        }));
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const latest = useMemo(() => state.series[state.series.length - 1], [state.series]);

  return (
    <div className="grid gap-4 rounded-3xl border border-white/40 bg-white/70 p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Finance signals</p>
          <p className="text-sm text-muted-foreground">
            Live settlement KPIs and payout alerts from the core ledger.
          </p>
        </div>
        {state.loading ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            Loading
          </span>
        ) : state.error ? (
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
            {state.error}
          </span>
        ) : (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            Updated
          </span>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Revenue</p>
          <p className="text-2xl font-semibold text-foreground">{state.kpis.totalRevenue ?? 0} BDT</p>
        </div>
        <div className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Commission</p>
          <p className="text-2xl font-semibold text-foreground">{state.kpis.totalCommission ?? 0} BDT</p>
        </div>
        <div className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Payout</p>
          <p className="text-2xl font-semibold text-foreground">{state.kpis.totalPayout ?? 0} BDT</p>
        </div>
        <div className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Alerts</p>
          <p className="text-2xl font-semibold text-foreground">{state.alerts}</p>
        </div>
      </div>

      <div className="grid gap-2 rounded-2xl border border-white/40 bg-white/80 p-4">
        <p className="text-sm font-semibold text-foreground">Latest settlement day</p>
        {latest ? (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>{latest.day}</span>
            <span>Revenue {latest.revenue} BDT</span>
            <span>Payout {latest.payout} BDT</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No settlement data yet.</p>
        )}
      </div>
    </div>
  );
}
