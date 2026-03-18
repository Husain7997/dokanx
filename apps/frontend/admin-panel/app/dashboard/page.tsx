"use client";

import { useEffect, useMemo, useState } from "react";
import { AnalyticsCards, Card, CardDescription, CardTitle, SalesChart } from "@dokanx/ui";

import { getAdminAnalyticsOverview, getAdminKpi, getAdminMetrics, getAiMerchantInsights, getAiTrending, getFinanceKpis, getRevenueVsPayout, getSystemHealth, listAdminUsers, listMerchants, listOrders } from "@/lib/admin-runtime-api";

type MetricsState = {
  shops?: number;
  orders?: number;
};

type KpiState = {
  totalOrders?: number;
  revenue?: number;
  settled?: number;
};

type HealthState = {
  status?: string;
  uptime?: number;
  timestamp?: string;
};

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<MetricsState | null>(null);
  const [kpis, setKpis] = useState<KpiState | null>(null);
  const [finance, setFinance] = useState<{ totalRevenue?: number; totalCommission?: number; totalPayout?: number; totalSettlements?: number } | null>(null);
  const [health, setHealth] = useState<HealthState | null>(null);
  const [usersCount, setUsersCount] = useState<number>(0);
  const [merchantsCount, setMerchantsCount] = useState<number>(0);
  const [orders, setOrders] = useState<Array<{ _id?: string; status?: string; totalAmount?: number; createdAt?: string }>>([]);
  const [trend, setTrend] = useState<Array<{ label: string; value: number }>>([]);
  const [warehouseTrend, setWarehouseTrend] = useState<Array<{ label: string; value: number }>>([]);
  const [overview, setOverview] = useState<{
    wallet?: { net?: number };
    shipments?: { successRate?: number };
    inventory?: { lowStockCount?: number };
    categorySplit?: Array<{ category?: string; revenue?: number }>;
  } | null>(null);
  const [aiInsights, setAiInsights] = useState<Array<{ id?: string; title?: string; message?: string; badge?: string }>>([]);
  const [aiTrending, setAiTrending] = useState<Array<{ name?: string; velocity?: number; changeLabel?: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [
          metricsResponse,
          kpiResponse,
          financeResponse,
          healthResponse,
          usersResponse,
          merchantsResponse,
          ordersResponse,
          revenueResponse,
          overviewResponse,
          aiInsightsResponse,
          aiTrendingResponse,
        ] = await Promise.all([
          getAdminMetrics(),
          getAdminKpi(),
          getFinanceKpis(),
          getSystemHealth(),
          listAdminUsers(),
          listMerchants(),
          listOrders(),
          getRevenueVsPayout(),
          getAdminAnalyticsOverview(),
          getAiMerchantInsights(),
          getAiTrending({ limit: 5 }),
        ]);
        if (!active) return;
        setMetrics(metricsResponse || null);
        setKpis(kpiResponse.data || null);
        setFinance(financeResponse.data || null);
        setHealth(healthResponse || null);
        setUsersCount(Array.isArray(usersResponse.data) ? usersResponse.data.length : 0);
        setMerchantsCount(Array.isArray(merchantsResponse.data) ? merchantsResponse.data.length : 0);
        setOrders(Array.isArray(ordersResponse.data) ? ordersResponse.data : []);
        const revenueSeries = Array.isArray(revenueResponse.data)
          ? revenueResponse.data.map((row) => ({
              label: row._id?.day || "Day",
              value: Number(row.revenue || 0),
            }))
          : [];
        setTrend(revenueSeries);
        setOverview(overviewResponse.data || null);
        const daily = Array.isArray(overviewResponse.data?.dailySales)
          ? overviewResponse.data?.dailySales
          : [];
        setWarehouseTrend(
          daily.map((row) => ({
            label: row.date || "Day",
            value: Number(row.gmv || 0),
          }))
        );
        setAiInsights(Array.isArray(aiInsightsResponse.data) ? aiInsightsResponse.data : []);
        setAiTrending(Array.isArray(aiTrendingResponse.data) ? aiTrendingResponse.data : []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load dashboard.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const cards = useMemo(() => {
    const topCategory = overview?.categorySplit?.[0]?.category || "N/A";
    return [
      { label: "Total users", value: String(usersCount), meta: "Platform accounts" },
      { label: "Total merchants", value: String(merchantsCount), meta: "Verified sellers" },
      { label: "Total orders", value: String(metrics?.orders ?? 0), meta: "Marketplace volume" },
      { label: "Total revenue", value: `${kpis?.revenue ?? 0} BDT`, meta: "Gross sales" },
      { label: "Wallet txns", value: String(finance?.totalSettlements ?? 0), meta: "Settlement cycles" },
      { label: "Active stores", value: String(metrics?.shops ?? 0), meta: "Active storefronts" },
      { label: "Wallet net", value: `${overview?.wallet?.net ?? 0} BDT`, meta: "Credits - debits" },
      { label: "Courier success", value: `${Math.round((overview?.shipments?.successRate ?? 0) * 100)}%`, meta: "Delivered / shipments" },
      { label: "Low stock", value: String(overview?.inventory?.lowStockCount ?? 0), meta: "Inventory watch" },
      { label: "Top category", value: topCategory, meta: "By revenue" },
      { label: "System health", value: String(health?.status || "Unknown"), meta: "Runtime status" },
    ];
  }, [
    finance?.totalSettlements,
    health?.status,
    kpis?.revenue,
    merchantsCount,
    metrics?.orders,
    metrics?.shops,
    overview?.categorySplit,
    overview?.inventory?.lowStockCount,
    overview?.shipments?.successRate,
    overview?.wallet?.net,
    usersCount,
  ]);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="dx-display text-3xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Platform monitoring and business signals.</p>
      </div>
      <AnalyticsCards items={cards} />
      {error ? (
        <Card>
          <CardTitle>Overview</CardTitle>
          <CardDescription className="mt-2">{error}</CardDescription>
        </Card>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Revenue graph</CardTitle>
          <CardDescription className="mt-2">Daily gross volume snapshot.</CardDescription>
          <div className="mt-6">
            <SalesChart data={trend.length ? trend : [{ label: "No data", value: 0 }]} />
          </div>
        </Card>
        <Card>
          <CardTitle>Warehouse GMV</CardTitle>
          <CardDescription className="mt-2">Daily sales from warehouse snapshots.</CardDescription>
          <div className="mt-6">
            <SalesChart data={warehouseTrend.length ? warehouseTrend : [{ label: "No data", value: 0 }]} />
          </div>
        </Card>
        <Card>
          <CardTitle>Recent orders</CardTitle>
          <CardDescription className="mt-2">Latest platform transactions.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {orders.slice(0, 6).map((order) => (
              <div key={String(order._id)} className="flex flex-wrap justify-between gap-2 rounded-2xl border border-border/60 px-4 py-3">
                <span>#{String(order._id || "").slice(-6)}</span>
                <span>{order.status || "PLACED"}</span>
                <span>{order.totalAmount ?? 0} BDT</span>
                <span>{order.createdAt ? new Date(order.createdAt).toLocaleString() : "Pending"}</span>
              </div>
            ))}
            {!orders.length ? <p>No orders yet.</p> : null}
          </div>
        </Card>
        <Card>
          <CardTitle>AI signals</CardTitle>
          <CardDescription className="mt-2">Explainable fraud, demand, and customer risk summaries.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {aiInsights.slice(0, 5).map((item) => (
              <div key={String(item.id)} className="rounded-2xl border border-border/60 px-4 py-3">
                <p className="font-medium text-foreground">{item.title || "Insight"}</p>
                <p className="mt-1">{item.message || "No details available."}</p>
              </div>
            ))}
            {!aiInsights.length ? <p>No AI insights available yet.</p> : null}
          </div>
        </Card>
        <Card>
          <CardTitle>Trending demand</CardTitle>
          <CardDescription className="mt-2">Products with the highest short-term demand velocity.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {aiTrending.slice(0, 5).map((item) => (
              <div key={String(item.name)} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 px-4 py-3">
                <span>{item.name || "Product"}</span>
                <span>v{Number(item.velocity || 0).toFixed(2)}</span>
                <span>{item.changeLabel || "steady"}</span>
              </div>
            ))}
            {!aiTrending.length ? <p>No trending demand signals available.</p> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
