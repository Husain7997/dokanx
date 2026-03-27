"use client";

import { useEffect, useMemo, useState } from "react";
import { AnalyticsCards, Button, Card, CardDescription, CardTitle, SalesChart, TextInput } from "@dokanx/ui";

import {
  buildAdminAnalyticsSnapshots,
  getAdminAnalyticsOverview,
  getAdminKpi,
  getAdminMetrics,
  getAdminRecommendationMetrics,
} from "@/lib/admin-runtime-api";

type MetricsState = {
  shops?: number;
  orders?: number;
};

type KpiState = {
  totalOrders?: number;
  revenue?: number;
  settled?: number;
};

type OverviewState = {
  dailySales?: Array<{ date?: string; gmv?: number; orders?: number; aov?: number }>;
  wallet?: { credits?: number; debits?: number; net?: number; transactionCount?: number };
  shipments?: { total?: number; delivered?: number; failed?: number; successRate?: number };
  inventory?: { totalSkus?: number; lowStockCount?: number; outOfStockCount?: number; totalStock?: number };
  channelSplit?: Array<{ channel?: string; gmv?: number; orders?: number }>;
  topProducts?: Array<{ name?: string; revenue?: number; quantity?: number }>;
  categorySplit?: Array<{ category?: string; revenue?: number; quantity?: number }>;
  customerRepeatRate?: { totalCustomers?: number; repeatCustomers?: number; repeatRate?: number };
  conversionFunnel?: Array<{ stage?: string; count?: number; rate?: number }>;
};

type RecommendationMetrics = {
  windowDays?: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  productViews?: number;
  sectionBreakdown?: Array<{ section?: string; impressions?: number; clicks?: number; ctr?: number }>;
  topClickedProducts?: Array<{ productId?: string; name?: string; slug?: string; clicks?: number }>;
};

export const dynamic = "force-dynamic";

export default function Page() {
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
  });
  const [metrics, setMetrics] = useState<MetricsState | null>(null);
  const [kpis, setKpis] = useState<KpiState | null>(null);
  const [overview, setOverview] = useState<OverviewState | null>(null);
  const [recommendationMetrics, setRecommendationMetrics] = useState<RecommendationMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [series, setSeries] = useState<Array<{ label: string; value: number }>>([]);
  const [channelSeries, setChannelSeries] = useState<Array<{ label: string; value: number }>>([]);
  const [categorySeries, setCategorySeries] = useState<Array<{ label: string; value: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const [metricsResponse, kpiResponse, overviewResponse, recommendationResponse] = await Promise.all([
        getAdminMetrics(),
        getAdminKpi(),
        getAdminAnalyticsOverview(filters),
        getAdminRecommendationMetrics(),
      ]);
      setMetrics(metricsResponse || null);
      setKpis(kpiResponse.data || null);
      setOverview(overviewResponse.data || null);
      setRecommendationMetrics(recommendationResponse.data || null);
      const daily = Array.isArray(overviewResponse.data?.dailySales)
        ? overviewResponse.data?.dailySales
        : [];
      setSeries(
        daily.map((row) => ({
          label: row.date || "Day",
          value: Number(row.gmv || 0),
        }))
      );
      const channels = Array.isArray(overviewResponse.data?.channelSplit)
        ? overviewResponse.data?.channelSplit
        : [];
      setChannelSeries(
        channels.map((row) => ({
          label: row.channel || "UNKNOWN",
          value: Number(row.gmv || 0),
        }))
      );
      const categories = Array.isArray(overviewResponse.data?.categorySplit)
        ? overviewResponse.data?.categorySplit
        : [];
      setCategorySeries(
        categories.map((row) => ({
          label: row.category || "Uncategorized",
          value: Number(row.revenue || 0),
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  }

  async function rebuildSnapshots() {
    setBuilding(true);
    setError(null);

    try {
      await buildAdminAnalyticsSnapshots(filters);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to rebuild analytics snapshots.");
    } finally {
      setBuilding(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const cards = useMemo(() => {
    return [
      { label: "Tenants", value: String(metrics?.shops ?? 0), meta: "Active shops" },
      { label: "Orders", value: String(metrics?.orders ?? 0), meta: "Platform total" },
      { label: "Revenue", value: `${kpis?.revenue ?? 0} BDT`, meta: "Gross volume" },
      { label: "Settled", value: `${kpis?.settled ?? 0} BDT`, meta: "Paid out" },
      { label: "Wallet net", value: `${overview?.wallet?.net ?? 0} BDT`, meta: "Credits - debits" },
      { label: "Courier success", value: `${Math.round((overview?.shipments?.successRate ?? 0) * 100)}%`, meta: "Delivered / shipments" },
      { label: "Low stock", value: String(overview?.inventory?.lowStockCount ?? 0), meta: "Platform inventory" },
      { label: "Repeat rate", value: `${Math.round((overview?.customerRepeatRate?.repeatRate ?? 0) * 100)}%`, meta: "Returning customers" },
    ];
  }, [
    kpis?.revenue,
    kpis?.settled,
    metrics?.shops,
    metrics?.orders,
    overview?.customerRepeatRate?.repeatRate,
    overview?.inventory?.lowStockCount,
    overview?.shipments?.successRate,
    overview?.wallet?.net,
  ]);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="dx-display text-3xl">Analytics</h1>
        <p className="text-sm text-muted-foreground">KPI trends and signals</p>
      </div>
      <Card>
        <CardTitle>Snapshot controls</CardTitle>
        <CardDescription className="mt-2">Rebuild platform snapshots for a selected date window, then reload this page.</CardDescription>
        <div className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_auto_auto]">
          <TextInput
            type="date"
            label="From"
            value={filters.dateFrom}
            onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))}
          />
          <TextInput
            type="date"
            label="To"
            value={filters.dateTo}
            onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))}
          />
          <Button onClick={() => void load()} loading={loading} loadingText="Loading analytics">
            Refresh
          </Button>
          <Button onClick={() => void rebuildSnapshots()} loading={building} loadingText="Rebuilding snapshots">
            Rebuild Snapshots
          </Button>
        </div>
      </Card>
      <AnalyticsCards items={cards} />
      {error ? (
        <Card>
          <CardTitle>Analytics feed</CardTitle>
          <CardDescription className="mt-2">{error}</CardDescription>
        </Card>
      ) : (
        <Card>
          <CardTitle>Daily sales</CardTitle>
          <CardDescription className="mt-2">Platform GMV trend from warehouse snapshots.</CardDescription>
          <div className="mt-6">
            <SalesChart data={series.length ? series : [{ label: "No data", value: 0 }]} />
          </div>
        </Card>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Channel split</CardTitle>
          <CardDescription className="mt-2">GMV by acquisition channel.</CardDescription>
          <div className="mt-6">
            <SalesChart data={channelSeries.length ? channelSeries : [{ label: "No data", value: 0 }]} />
          </div>
        </Card>
        <Card>
          <CardTitle>Category split</CardTitle>
          <CardDescription className="mt-2">Revenue mix by product category.</CardDescription>
          <div className="mt-6">
            <SalesChart data={categorySeries.length ? categorySeries : [{ label: "No data", value: 0 }]} />
          </div>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Top products</CardTitle>
          <CardDescription className="mt-2">Platform best sellers in the selected range.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {overview?.topProducts?.length ? (
              overview.topProducts.slice(0, 6).map((row) => (
                <div key={String(row.name)} className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 px-4 py-3">
                  <span>{row.name || "Product"}</span>
                  <span>{row.quantity ?? 0} sold</span>
                  <span>{row.revenue ?? 0} BDT</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No top product snapshots available.</p>
            )}
          </div>
        </Card>
        <Card>
          <CardTitle>Conversion funnel</CardTitle>
          <CardDescription className="mt-2">Platform order lifecycle progression.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {overview?.conversionFunnel?.length ? (
              overview.conversionFunnel.map((row) => (
                <div key={String(row.stage)} className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 px-4 py-3">
                  <span>{row.stage || "UNKNOWN"}</span>
                  <span>{row.count ?? 0}</span>
                  <span>{Math.round((row.rate ?? 0) * 100)}%</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No conversion funnel snapshots available.</p>
            )}
          </div>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Customer repeat rate</CardTitle>
          <CardDescription className="mt-2">Returning customer signal from warehouse snapshots.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
              <span>Total customers</span>
              <span>{overview?.customerRepeatRate?.totalCustomers ?? 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
              <span>Repeat customers</span>
              <span>{overview?.customerRepeatRate?.repeatCustomers ?? 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
              <span>Repeat rate</span>
              <span>{Math.round((overview?.customerRepeatRate?.repeatRate ?? 0) * 100)}%</span>
            </div>
          </div>
        </Card>
        <Card>
          <CardTitle>Category leaderboard</CardTitle>
          <CardDescription className="mt-2">Top categories by revenue.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {overview?.categorySplit?.length ? (
              overview.categorySplit.slice(0, 6).map((row) => (
                <div key={String(row.category)} className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 px-4 py-3">
                  <span>{row.category || "Uncategorized"}</span>
                  <span>{row.quantity ?? 0} units</span>
                  <span>{row.revenue ?? 0} BDT</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No category snapshots available.</p>
            )}
          </div>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Recommendation performance</CardTitle>
          <CardDescription className="mt-2">
            {recommendationMetrics?.windowDays ? `Last ${recommendationMetrics.windowDays} days` : "Recent activity"}
          </CardDescription>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
              <span>Impressions</span>
              <span>{recommendationMetrics?.impressions ?? 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
              <span>Clicks</span>
              <span>{recommendationMetrics?.clicks ?? 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
              <span>CTR</span>
              <span>{((recommendationMetrics?.ctr ?? 0) * 100).toFixed(2)}%</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
              <span>Product views</span>
              <span>{recommendationMetrics?.productViews ?? 0}</span>
            </div>
          </div>
        </Card>
        <Card>
          <CardTitle>Top clicked recommendations</CardTitle>
          <CardDescription className="mt-2">Most engaged recommendations</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {recommendationMetrics?.topClickedProducts?.length ? (
              recommendationMetrics.topClickedProducts.slice(0, 6).map((row) => (
                <div
                  key={String(row.productId)}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 px-4 py-3"
                >
                  <span>{row.name || "Product"}</span>
                  <span>{row.clicks ?? 0} clicks</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No recommendation clicks recorded yet.</p>
            )}
          </div>
        </Card>
      </div>
      <Card>
        <CardTitle>Recommendation CTR by section</CardTitle>
        <CardDescription className="mt-2">Per-surface performance split by recommendation context.</CardDescription>
        <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
          {recommendationMetrics?.sectionBreakdown?.length ? (
            recommendationMetrics.sectionBreakdown.slice(0, 10).map((row) => (
              <div
                key={String(row.section)}
                className="grid grid-cols-[minmax(0,1fr)_120px_120px_120px] items-center gap-3 rounded-2xl border border-border/60 px-4 py-3"
              >
                <span>{row.section || "unknown"}</span>
                <span>{row.impressions ?? 0} imp</span>
                <span>{row.clicks ?? 0} clk</span>
                <span>{((row.ctr ?? 0) * 100).toFixed(2)}%</span>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No section-level recommendation telemetry yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
