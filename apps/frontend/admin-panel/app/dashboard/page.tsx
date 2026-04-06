"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, AnalyticsCards, Badge, Button, Card, CardDescription, CardTitle, SalesChart } from "@dokanx/ui";

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
      { label: "Wallet net", value: `${overview?.wallet?.net ?? 0} BDT`, meta: "Credits minus debits" },
      { label: "Courier success", value: `${Math.round((overview?.shipments?.successRate ?? 0) * 100)}%`, meta: "Delivered vs shipments" },
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

  const pendingOrders = useMemo(
    () => orders.filter((order) => ["PLACED", "PAYMENT_PENDING", "CONFIRMED"].includes(String(order.status || "").toUpperCase())).length,
    [orders],
  );

  return (
    <div className="grid gap-6">
      <Card className="overflow-hidden border-border/70 bg-card/92">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
            <h1 className="dx-display mt-2 text-3xl">Platform dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Monitor marketplace health, revenue flow, merchant risk, and operational pressure from one calmer command view.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={() => window.location.reload()}>Refresh workspace</Button>
              <Button asChild variant="secondary">
                <a href="/system-health">Open system health</a>
              </Button>
            </div>
          </div>
          <div className="border-t border-border/60 bg-background/70 p-6 sm:p-8 lg:border-l lg:border-t-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Operator snapshot</p>
            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl border border-border/60 bg-card/90 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">System health</span>
                  <Badge variant={String(health?.status || "").toLowerCase() === "ok" ? "success" : "warning"}>{health?.status || "Unknown"}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Uptime {health?.uptime ?? 0}s and latest timestamp {health?.timestamp || "N/A"}.</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card/90 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">Pending order pressure</span>
                  <Badge variant={pendingOrders ? "warning" : "success"}>{pendingOrders}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Orders still waiting on payment, confirmation, or handling.</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card/90 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">Merchant reach</span>
                  <Badge variant="neutral">{merchantsCount}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Current verified merchants represented in the admin surface.</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <AnalyticsCards items={cards} />

      {error ? (
        <Alert variant="error">{error}</Alert>
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
          <CardDescription className="mt-2">Latest platform transactions needing operational attention first.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {orders.slice(0, 6).map((order) => (
              <div key={String(order._id)} className="rounded-2xl border border-border/60 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-foreground">#{String(order._id || "").slice(-6)}</span>
                  <Badge variant={String(order.status || "").toUpperCase() === "DELIVERED" ? "success" : "warning"}>{order.status || "PLACED"}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span>{order.totalAmount ?? 0} BDT</span>
                  <span>{order.createdAt ? new Date(order.createdAt).toLocaleString() : "Pending"}</span>
                </div>
              </div>
            ))}
            {!orders.length ? <p className="text-sm text-muted-foreground">No live platform orders have landed yet. New marketplace activity will appear here first.</p> : null}
          </div>
        </Card>
        <Card>
          <CardTitle>AI signals</CardTitle>
          <CardDescription className="mt-2">Explainable fraud, demand, and customer risk summaries.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {aiInsights.slice(0, 5).map((item) => (
              <div key={String(item.id)} className="rounded-2xl border border-border/60 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-foreground">{item.title || "Insight"}</p>
                  {item.badge ? <Badge variant="neutral">{item.badge}</Badge> : null}
                </div>
                <p className="mt-1">{item.message || "No details available."}</p>
              </div>
            ))}
            {!aiInsights.length ? <p className="text-sm text-muted-foreground">AI signals will appear here once merchant, fraud, or demand patterns need operator review.</p> : null}
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
            {!aiTrending.length ? <p className="text-sm text-muted-foreground">Demand velocity signals will appear here after enough browsing and order activity is collected.</p> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

