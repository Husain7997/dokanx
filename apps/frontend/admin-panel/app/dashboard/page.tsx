"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, AnalyticsCards, Badge, Button, Card, CardDescription, CardTitle, SalesChart } from "@dokanx/ui";

import { AdminOpsPageHeader } from "@/components/admin-ops-page-header";
import { AdminOpsPressure } from "@/components/admin-ops-pressure";
import { AdminOpsThresholds } from "@/components/admin-ops-thresholds";
import { formatOpsLag } from "@/lib/admin-ops-health";
import { getAdminAnalyticsOverview, getAdminKpi, getAdminMetrics, getAiMerchantInsights, getAiTrending, getFinanceKpis, getRevenueVsPayout, getSystemHealth, listAdminUsers, listMerchants, listOrders, getFraudOverview } from "@/lib/admin-runtime-api";
import { getOpsSettings } from "@/lib/admin-runtime-api";
import type { OpsThresholdSettings } from "@/config/ops-thresholds";

type MetricsState = {
  shops?: number;
  orders?: number;
  users?: number;
  gmv?: number;
};

type KpiState = {
  totalOrders?: number;
  revenue?: number;
  settled?: number;
  paymentSuccessRate?: number;
  paymentFailureRate?: number;
};

type HealthState = {
  status?: string;
  uptime?: number;
  timestamp?: string;
};

type LiveTransaction = {
  id?: string;
  amount?: number;
  status?: string;
  gateway?: string;
  timestamp?: string;
};

type AiInsight = {
  id?: string;
  title?: string;
  message?: string;
  badge?: "warning" | "info" | "success";
};

type AiTrendingItem = {
  name?: string;
  velocity?: number;
  location?: string;
  changeLabel?: string;
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
  const [liveTransactions, setLiveTransactions] = useState<LiveTransaction[]>([]);
  const [creditOutstanding, setCreditOutstanding] = useState<number>(0);
  const [systemWalletBalance, setSystemWalletBalance] = useState<number>(0);
  const [fraudOverview, setFraudOverview] = useState<{ summary?: { fraudRate?: number; paymentFailureRate?: number } } | null>(null);
  const [aiInsights, setAiInsights] = useState<AiInsight[]>([]);
  const [aiTrending, setAiTrending] = useState<AiTrendingItem[]>([]);
  const [opsSettings, setOpsSettings] = useState<Partial<OpsThresholdSettings> | null>(null);
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
          fraudResponse,
          opsResponse,
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
          getFraudOverview(),
          getOpsSettings(),
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
        setFraudOverview(fraudResponse.data || null);
        setOpsSettings(opsResponse?.data || null);
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
      { label: "Total GMV", value: `${metrics?.gmv ?? 0} BDT`, meta: "Gross merchandise value" },
      { label: "Total merchants", value: String(merchantsCount), meta: "Verified sellers" },
      { label: "Active users", value: String(metrics?.users ?? 0), meta: "Platform accounts" },
      { label: "Wallet balance", value: `${systemWalletBalance} BDT`, meta: "System-wide balance" },
      { label: "Credit outstanding", value: `${creditOutstanding} BDT`, meta: "Unpaid credit" },
      { label: "Payment success rate", value: `${kpis?.paymentSuccessRate ?? 0}%`, meta: "Successful transactions" },
      { label: "Payment failure rate", value: `${kpis?.paymentFailureRate ?? 0}%`, meta: "Failed attempts" },
      { label: "Live transactions", value: String(liveTransactions.length), meta: "Recent activity" },
      { label: "Active stores", value: String(metrics?.shops ?? 0), meta: "Active storefronts" },
      { label: "System health", value: String(health?.status || "Unknown"), meta: "Runtime status" },
    ];
  }, [
    metrics?.gmv,
    metrics?.users,
    metrics?.shops,
    merchantsCount,
    systemWalletBalance,
    creditOutstanding,
    kpis?.paymentSuccessRate,
    kpis?.paymentFailureRate,
    liveTransactions.length,
    health?.status,
    overview?.categorySplit,
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
            <AdminOpsPageHeader
              title="Platform dashboard"
              description="Monitor marketplace health, revenue flow, merchant risk, and operational pressure from one calmer command view."
              refreshLabel="Refresh workspace"
              onRefresh={() => window.location.reload()}
              actions={[
                { href: "/system-health", label: "Open system health", variant: "secondary" },
                { href: "/risk", label: "Open risk desk", variant: "outline" },
                { href: "/ai-ops", label: "Open AI ops", variant: "outline" },
                { href: "/security", label: "Open security", variant: "outline" },
              ]}
            />
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
              <div className="rounded-2xl border border-border/60 bg-card/90 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">Ops thresholds</span>
                  <Badge variant="neutral">{formatOpsLag(opsSettings?.lagCriticalMs)}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Watch {formatOpsLag(opsSettings?.lagWatchMs)} · Queue wait {opsSettings?.queueWaitingWatch ?? 20} · Outbox {opsSettings?.outboxPendingWatch ?? 50}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <AnalyticsCards items={cards} />

      {error ? (
        <Alert variant="error">{error}</Alert>
      ) : null}

      <AdminOpsThresholds />
      <AdminOpsPressure />

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
          <CardTitle>Live transaction feed</CardTitle>
          <CardDescription className="mt-2">Real-time payment activity across all gateways.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {liveTransactions.slice(0, 8).map((txn) => (
              <div key={String(txn.id)} className="rounded-2xl border border-border/60 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-foreground">#{String(txn.id || "").slice(-6)}</span>
                  <Badge variant={txn.status === "SUCCESS" ? "success" : "warning"}>{txn.status || "PENDING"}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span>{txn.amount ?? 0} BDT via {txn.gateway || "Unknown"}</span>
                  <span>{txn.timestamp ? new Date(txn.timestamp).toLocaleTimeString() : "Now"}</span>
                </div>
              </div>
            ))}
            {!liveTransactions.length ? <p className="text-sm text-muted-foreground">No live transactions detected. Activity will appear here in real-time.</p> : null}
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

