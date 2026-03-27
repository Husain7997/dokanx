"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  AnalyticsCards,
  Button,
  Card,
  CardDescription,
  CardTitle,
  SalesChart,
  TextInput
} from "@dokanx/ui";

import { buildAnalyticsSnapshots, getWalletReport, listAnalyticsSnapshots } from "@/lib/runtime-api";

type SnapshotRow = {
  _id?: string;
  metricType?: string;
  dateKey?: string;
  payload?: Record<string, unknown>;
};

function pickMetric(rows: SnapshotRow[], metricType: string) {
  return rows.find((item) => item.metricType === metricType) || null;
}

export function AnalyticsWorkspace() {
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
  });
  const [productFilter, setProductFilter] = useState("");
  const [rows, setRows] = useState<SnapshotRow[]>([]);
  const [message, setMessage] = useState<string | null>("Owner or admin session is required to load tenant analytics snapshots.");
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [walletReport, setWalletReport] = useState<{ totalIncome?: number; totalExpense?: number; totalDue?: number; profitLoss?: number } | null>(null);

  async function loadSnapshots() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await listAnalyticsSnapshots(filters);
      const snapshots = Array.isArray(response.data) ? (response.data as SnapshotRow[]) : [];
      const report = await getWalletReport({
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      }).catch(() => null);
      setRows(snapshots);
      setWalletReport(report?.data || null);
      if (!snapshots.length) {
        setMessage("No analytics snapshots matched the selected date range.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  }

  async function rebuildSnapshots() {
    setBuilding(true);
    setMessage(null);

    try {
      await buildAnalyticsSnapshots(filters);
      await loadSnapshots();
      setMessage("Analytics snapshots rebuilt for the selected range.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to rebuild analytics snapshots.");
    } finally {
      setBuilding(false);
    }
  }

  useEffect(() => {
    void loadSnapshots();
  }, []);

  const dailySales = pickMetric(rows, "DAILY_SALES");
  const trendAnalytics = pickMetric(rows, "TREND_ANALYTICS");
  const merchantCohorts = pickMetric(rows, "MERCHANT_COHORTS");
  const walletSummary = pickMetric(rows, "WALLET_SUMMARY");
  const shipmentSummary = pickMetric(rows, "SHIPMENT_STATUS");
  const inventorySnapshot = pickMetric(rows, "INVENTORY_SNAPSHOT");
  const categorySplit = pickMetric(rows, "CATEGORY_SPLIT");
  const channelSplit = pickMetric(rows, "CHANNEL_SPLIT");
  const topProducts = pickMetric(rows, "TOP_PRODUCTS");
  const customerRepeatRate = pickMetric(rows, "CUSTOMER_REPEAT_RATE");
  const conversionFunnel = pickMetric(rows, "CONVERSION_FUNNEL");

  const chartData = Array.isArray((trendAnalytics?.payload as Record<string, unknown> | null)?.current)
    ? ((trendAnalytics?.payload as { current?: Array<{ label?: string; value?: number }> }).current || []).map((item, index) => ({
        label: item.label || `Point ${index + 1}`,
        value: Number(item.value || 0),
      }))
    : [];

  const wallet = (walletSummary?.payload as { credits?: number; debits?: number; net?: number } | null) || null;
  const shipments = (shipmentSummary?.payload as { total?: number; delivered?: number; successRate?: number } | null) || null;
  const inventory = (inventorySnapshot?.payload as { totalSkus?: number; lowStockCount?: number } | null) || null;
  const categories = Array.isArray(categorySplit?.payload) ? (categorySplit?.payload as Array<{ category?: string; revenue?: number }>) : [];
  const channels = Array.isArray(channelSplit?.payload) ? (channelSplit?.payload as Array<{ channel?: string; gmv?: number }>) : [];
  const products = Array.isArray(topProducts?.payload)
    ? (topProducts?.payload as Array<{ name?: string; revenue?: number; quantity?: number }>)
    : [];
  const repeat = (customerRepeatRate?.payload as {
    totalCustomers?: number;
    repeatCustomers?: number;
    repeatRate?: number;
  } | null) || null;
  const funnel = Array.isArray(conversionFunnel?.payload)
    ? (conversionFunnel?.payload as Array<{ stage?: string; count?: number; rate?: number }>)
    : [];
  const filteredProducts = products.filter((row) =>
    String(row.name || "")
      .toLowerCase()
      .includes(productFilter.trim().toLowerCase())
  );

  const metricCards = [
    { label: "Snapshots", value: String(rows.length), meta: filters.dateFrom || "All dates" },
    { label: "Daily sales rows", value: String(Array.isArray(dailySales?.payload) ? dailySales?.payload.length || 0 : 0), meta: "Warehouse daily sales" },
    { label: "Trend points", value: String(chartData.length), meta: filters.dateTo || "Open-ended" },
    { label: "Cohorts", value: String(Array.isArray(merchantCohorts?.payload) ? merchantCohorts?.payload.length || 0 : 0), meta: "Merchant retention cohorts" },
      { label: "Wallet net", value: `${wallet?.net ?? 0} BDT`, meta: "Credits - debits" },
      { label: "Profit", value: `${walletReport?.profitLoss ?? 0} BDT`, meta: "Operating profit" },
      { label: "Due", value: `${walletReport?.totalDue ?? 0} BDT`, meta: "Outstanding credit" },
      { label: "Courier success", value: `${Math.round((shipments?.successRate ?? 0) * 100)}%`, meta: "Delivered / shipments" },
    { label: "Low stock", value: String(inventory?.lowStockCount ?? 0), meta: "Inventory snapshot" },
    { label: "Repeat rate", value: `${Math.round((repeat?.repeatRate ?? 0) * 100)}%`, meta: "Returning customers" },
  ];

  return (
    <div className="grid gap-6">
      <Card>
        <CardTitle>Date-filtered analytics</CardTitle>
        <CardDescription className="mt-2">
          Analytics query warehouse snapshots with real date filters and optional rebuilds.
        </CardDescription>
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
          <Button onClick={() => void loadSnapshots()} loading={loading} loadingText="Loading analytics">
            Apply Filters
          </Button>
          <Button onClick={() => void rebuildSnapshots()} loading={building} loadingText="Rebuilding snapshots">
            Rebuild Snapshots
          </Button>
        </div>
      </Card>
      <AnalyticsCards items={metricCards} />
      <Card>
        <CardTitle>Trend output</CardTitle>
        <div className="mt-6">
          <SalesChart data={chartData.length ? chartData : [{ label: "No data", value: 0 }]} />
        </div>
      </Card>
      <Card>
        <CardTitle>Merchant cohorts</CardTitle>
        <CardDescription className="mt-2">
          Cohort retention and activation ratios derived from warehouse snapshots.
        </CardDescription>
        <div className="mt-6 grid gap-3 text-sm">
          {Array.isArray(merchantCohorts?.payload) && merchantCohorts?.payload.length ? (
            (merchantCohorts?.payload as Array<{ cohort?: string; merchantCount?: number; activeMerchantCount?: number; retentionRate?: number }>).map((row) => (
              <div key={String(row.cohort)} className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 px-4 py-3">
                <span>{row.cohort}</span>
                <span>{row.activeMerchantCount}/{row.merchantCount}</span>
                <span>{Number(row.retentionRate || 0) * 100}% active</span>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No cohort snapshots available for the selected range.</p>
          )}
        </div>
      </Card>
      <Card>
        <CardTitle>Customer repeat rate</CardTitle>
        <CardDescription className="mt-2">Repeat purchase signal from warehouse snapshots.</CardDescription>
        <div className="mt-6 grid gap-3 text-sm text-muted-foreground">
          <div className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
            <span>Total customers</span>
            <span>{repeat?.totalCustomers ?? 0}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
            <span>Repeat customers</span>
            <span>{repeat?.repeatCustomers ?? 0}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
            <span>Repeat rate</span>
            <span>{Math.round((repeat?.repeatRate ?? 0) * 100)}%</span>
          </div>
        </div>
      </Card>
      <Card>
        <CardTitle>Conversion funnel</CardTitle>
        <CardDescription className="mt-2">Order lifecycle progression for the selected range.</CardDescription>
        <div className="mt-6 grid gap-2 text-sm text-muted-foreground">
          {funnel.length ? (
            funnel.map((row) => (
              <div key={String(row.stage)} className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 px-4 py-3">
                <span>{row.stage || "UNKNOWN"}</span>
                <span>{row.count ?? 0}</span>
                <span>{Math.round((row.rate ?? 0) * 100)}%</span>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No conversion funnel snapshots available for the selected range.</p>
          )}
        </div>
      </Card>
      <Card>
        <CardTitle>Category split</CardTitle>
        <CardDescription className="mt-2">Revenue share by category.</CardDescription>
        <div className="mt-6 grid gap-2 text-sm text-muted-foreground">
          {categories.length ? (
            categories.slice(0, 6).map((row) => (
              <div key={String(row.category)} className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 px-4 py-3">
                <span>{row.category || "Uncategorized"}</span>
                <span>{row.revenue ?? 0} BDT</span>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No category snapshots available for the selected range.</p>
          )}
        </div>
      </Card>
      <Card>
        <CardTitle>Channel split</CardTitle>
        <CardDescription className="mt-2">GMV by channel.</CardDescription>
        <div className="mt-6 grid gap-2 text-sm text-muted-foreground">
          {channels.length ? (
            channels.slice(0, 6).map((row) => (
              <div key={String(row.channel)} className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 px-4 py-3">
                <span>{row.channel || "UNKNOWN"}</span>
                <span>{row.gmv ?? 0} BDT</span>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No channel snapshots available for the selected range.</p>
          )}
        </div>
      </Card>
      <Card>
        <CardTitle>Top products</CardTitle>
        <CardDescription className="mt-2">Best-performing products in the selected range.</CardDescription>
        <div className="mt-4">
          <TextInput
            label="Filter by product name"
            value={productFilter}
            onChange={(event) => setProductFilter(event.target.value)}
            placeholder="Search product"
          />
        </div>
        <div className="mt-6 grid gap-2 text-sm text-muted-foreground">
          {filteredProducts.length ? (
            filteredProducts.slice(0, 8).map((row) => (
              <div key={String(row.name)} className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 px-4 py-3">
                <span>{row.name || "Product"}</span>
                <span>{row.quantity ?? 0} sold</span>
                <span>{row.revenue ?? 0} BDT</span>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No top product snapshots available for the selected range.</p>
          )}
        </div>
      </Card>
      {message ? <Alert variant="info">{message}</Alert> : null}
    </div>
  );
}
