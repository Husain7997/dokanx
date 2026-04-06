"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  AnalyticsCards,
  Badge,
  Button,
  Card,
  CardDescription,
  CardTitle,
  Grid,
  ProgressBar,
  SalesChart,
  SearchInput
} from "@dokanx/ui";

import { getShopSummary, getWalletReport, getWalletSummary, listAnalyticsSnapshots, listCustomers, listInventory, listOrders } from "@/lib/runtime-api";

type OrderRow = {
  _id?: string;
  status?: string;
  totalAmount?: number;
  createdAt?: string;
  items?: Array<{ product?: { name?: string; price?: number }; quantity?: number; price?: number }>;
};

type InventoryRow = {
  _id?: string;
  productId?: string;
  available?: number;
  reorderPoint?: number;
  updatedAt?: string;
};

type DailySalesRow = {
  date?: string;
  gmv?: number;
  orders?: number;
  aov?: number;
};

type WalletSummary = {
  credits?: number;
  debits?: number;
  net?: number;
  transactionCount?: number;
};

type ShipmentSummary = {
  total?: number;
  delivered?: number;
  failed?: number;
  successRate?: number;
};

type InventorySnapshot = {
  totalSkus?: number;
  totalStock?: number;
  totalReserved?: number;
  lowStockCount?: number;
  outOfStockCount?: number;
};

export function DashboardOverview() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [customers, setCustomers] = useState<Array<{ totalDue?: number; phone?: string }>>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [walletReport, setWalletReport] = useState<{ totalIncome?: number; totalExpense?: number; profitLoss?: number; totalDue?: number } | null>(null);
  const [summary, setSummary] = useState<{ sales?: { totalSales?: number; totalOrders?: number } } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [trendSeries, setTrendSeries] = useState<Array<{ label: string; value: number }>>([]);
  const [revenueSeries, setRevenueSeries] = useState<Array<{ label: string; value: number }>>([]);
  const [dailySalesSnapshot, setDailySalesSnapshot] = useState<DailySalesRow[]>([]);
  const [walletSnapshot, setWalletSnapshot] = useState<WalletSummary | null>(null);
  const [shipmentSnapshot, setShipmentSnapshot] = useState<ShipmentSummary | null>(null);
  const [inventorySnapshot, setInventorySnapshot] = useState<InventorySnapshot | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [ordersResponse, inventoryResponse, walletResponse, summaryResponse, analyticsResponse, customerResponse, walletReportResponse] = await Promise.all([
        listOrders(25),
        listInventory(60),
        getWalletSummary(),
        getShopSummary(),
        listAnalyticsSnapshots({}),
        listCustomers(),
        getWalletReport(),
      ]);
      setOrders(Array.isArray(ordersResponse.data) ? (ordersResponse.data as OrderRow[]) : []);
      setCustomers(Array.isArray(customerResponse.data) ? customerResponse.data as Array<{ totalDue?: number; phone?: string }> : []);
      setInventory(Array.isArray(inventoryResponse.data) ? (inventoryResponse.data as InventoryRow[]) : []);
      setWalletBalance(Number(walletResponse.data?.balance ?? 0));
      setWalletReport(walletReportResponse.data || null);
      setSummary(summaryResponse.data || null);
      const snapshots = Array.isArray(analyticsResponse.data) ? analyticsResponse.data : [];
      const trendSnapshot = snapshots.find((row) => row.metricType === "TREND_ANALYTICS");
      const dailySales = snapshots.find((row) => row.metricType === "DAILY_SALES");
      const walletSummary = snapshots.find((row) => row.metricType === "WALLET_SUMMARY");
      const shipmentSummary = snapshots.find((row) => row.metricType === "SHIPMENT_STATUS");
      const inventorySummary = snapshots.find((row) => row.metricType === "INVENTORY_SNAPSHOT");
      const payload = trendSnapshot?.payload as { current?: Array<{ label?: string; value?: number }> } | undefined;
      const series = Array.isArray(payload?.current)
        ? payload.current.map((item, index) => ({ label: item.label || `Day ${index + 1}`, value: Number(item.value || 0) }))
        : [];
      setTrendSeries(series);
      const dailyRows = Array.isArray(dailySales?.payload) ? (dailySales.payload as DailySalesRow[]) : [];
      setDailySalesSnapshot(dailyRows);
      setWalletSnapshot((walletSummary?.payload as WalletSummary) || null);
      setShipmentSnapshot((shipmentSummary?.payload as ShipmentSummary) || null);
      setInventorySnapshot((inventorySummary?.payload as InventorySnapshot) || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load dashboard overview.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const today = useMemo(() => new Date(), []);
  const quickStats = useMemo(() => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter((order) => ["PLACED", "PAYMENT_PENDING", "PAYMENT_FAILED", "CONFIRMED"].includes(String(order.status || ""))).length;
    const revenue = orders.reduce((acc, order) => acc + Number(order.totalAmount || 0), 0);
    const todayKey = toDateKey(today);
    const todaysSalesFromSnapshot = dailySalesSnapshot.find((row) => row.date === todayKey)?.gmv || 0;
    const todaysSales = todaysSalesFromSnapshot || orders.filter((order) => order.createdAt && isSameDay(new Date(order.createdAt), today)).reduce((acc, order) => acc + Number(order.totalAmount || 0), 0);
    const lowStock = inventory.filter((row) => Number(row.available || 0) <= Number(row.reorderPoint || 0)).length;
    const delivered = orders.filter((order) => String(order.status || "") === "DELIVERED").length;
    const conversion = shipmentSnapshot?.successRate ? Math.round(shipmentSnapshot.successRate * 100) : totalOrders ? Math.round((delivered / totalOrders) * 100) : 0;
    const lowStockCount = inventorySnapshot?.lowStockCount ?? lowStock;
    const totalDue = customers.reduce((sum, customer) => sum + Number(customer.totalDue || 0), 0);
    const searchableCustomers = customers.filter((customer) => Boolean(customer.phone)).length;

    return [
      { label: "Today's sales", value: `${todaysSales} BDT`, meta: "Sales today" },
      { label: "Pending orders", value: String(pendingOrders), meta: "Needs action" },
      { label: "Wallet balance", value: `${walletBalance} BDT`, meta: "Available payout" },
      { label: "Low stock alerts", value: String(lowStockCount), meta: "Inventory watchlist" },
      { label: "Courier success", value: `${conversion}%`, meta: "Delivered / total shipments" },
      { label: "CRM ready", value: String(searchableCustomers), meta: "Customers with mobile index" },
      { label: "Customer due", value: `${totalDue} BDT`, meta: "Outstanding credit" },
      { label: "Revenue", value: `${summary?.sales?.totalSales ?? revenue} BDT`, meta: "Lifetime revenue" },
    ];
  }, [customers, dailySalesSnapshot, inventory, inventorySnapshot?.lowStockCount, orders, shipmentSnapshot?.successRate, summary, today, walletBalance]);

  const recentOrders = useMemo(() => orders.slice(0, 8), [orders]);
  const lowStockItems = useMemo(() => inventory.filter((row) => Number(row.available || 0) <= Number(row.reorderPoint || 0)).slice(0, 8), [inventory]);
  const topProducts = useMemo(() => buildTopProducts(orders, 8), [orders]);
  const fallbackSeries = useMemo(() => buildDailySeries(orders, 7), [orders]);
  const fallbackRevenueSeries = useMemo(() => buildDailyRevenueSeries(orders, 7), [orders]);
  const snapshotRevenueSeries = useMemo(() => dailySalesSnapshot.slice(-14).map((row) => ({ label: row.date || "Day", value: Number(row.gmv || 0) })), [dailySalesSnapshot]);
  const chartSales = trendSeries.length ? trendSeries : fallbackSeries;
  const chartRevenue = snapshotRevenueSeries.length ? snapshotRevenueSeries : revenueSeries.length ? revenueSeries : fallbackRevenueSeries;

  useEffect(() => {
    if (!orders.length) return;
    setRevenueSeries(fallbackRevenueSeries);
  }, [fallbackRevenueSeries, orders.length]);

  const filteredRecentOrders = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return recentOrders;
    return recentOrders.filter((order) => {
      const id = String(order._id || "").toLowerCase();
      const product = String(order.items?.[0]?.product?.name || "").toLowerCase();
      return id.includes(needle) || product.includes(needle);
    });
  }, [query, recentOrders]);

  const actionQueue = useMemo(() => {
    const pending = orders.filter((order) => ["PLACED", "PAYMENT_PENDING", "CONFIRMED"].includes(String(order.status || ""))).length;
    const stockRisk = lowStockItems.length;
    const refunds = orders.filter((order) => String(order.status || "") === "REFUNDED").length;
    return [
      { label: "Fulfillment queue", value: pending, tone: pending ? "warning" : "neutral", detail: pending ? "Orders waiting for action" : "No blocked orders" },
      { label: "Inventory risk", value: stockRisk, tone: stockRisk ? "warning" : "success", detail: stockRisk ? "Low stock products need reorder" : "Stock looks healthy" },
      { label: "Refund watch", value: refunds, tone: refunds ? "danger" : "success", detail: refunds ? "Recent refunds need review" : "No recent refunds" },
    ];
  }, [lowStockItems.length, orders]);

  return (
    <div className="grid gap-6">
      <Card className="overflow-hidden border-border/70 bg-card/92">
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Merchant command center</p>
            <h1 className="dx-display mt-3 text-3xl sm:text-4xl">Run the shop from one calm dashboard.</h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">Sales, stock, payouts, and fulfillment are grouped here so the team can see what needs attention without hunting through tabs.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={() => void load()} loading={loading} loadingText="Refreshing dashboard">Refresh overview</Button>
              <div className="min-w-[220px] flex-1 max-w-md">
                <SearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search recent orders or products" />
              </div>
            </div>
          </div>
          <div className="border-t border-border/60 bg-background/70 p-6 sm:p-8 lg:border-l lg:border-t-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Today</p>
            <div className="mt-4 grid gap-3">
              {actionQueue.map((item) => (
                <div key={item.label} className="rounded-2xl border border-border/60 bg-card/90 px-4 py-3 shadow-[var(--shadow-sm)]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                    <Badge variant={item.tone === "danger" ? "danger" : item.tone === "warning" ? "warning" : item.tone === "success" ? "success" : "neutral"}>{item.value}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {error ? <Alert variant="error">{error}</Alert> : null}
      <AnalyticsCards items={quickStats} />

      <Grid minColumnWidth="320px" className="gap-4">
        <Card>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription className="mt-2">The latest commercial events that usually need action first.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {loading ? <p>Loading recent orders...</p> : filteredRecentOrders.length ? filteredRecentOrders.map((order) => (
              <div key={String(order._id)} className="rounded-2xl border border-border/60 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-foreground">Order {order._id?.slice(-6)}</span>
                  <Badge variant={resolveStatusVariant(order.status)}>{order.status || "PLACED"}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span>{order.items?.[0]?.product?.name || "Order items"}</span>
                  <span>{order.totalAmount ?? 0} BDT</span>
                  <span>{order.createdAt ? new Date(order.createdAt).toLocaleString() : "Pending"}</span>
                </div>
              </div>
            )) : <div className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-center"><p className="font-medium text-foreground">No matching activity</p><p className="mt-1 text-xs text-muted-foreground">Try a different order ID or product keyword.</p></div>}
          </div>
        </Card>

        <Card>
          <CardTitle>Inventory watchlist</CardTitle>
          <CardDescription className="mt-2">Products closest to stockout so the team can reorder early.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {loading ? <p>Loading stock indicators...</p> : lowStockItems.length ? lowStockItems.map((row) => (
              <div key={String(row._id || row.productId)} className="rounded-2xl border border-border/60 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{row.productId || "Product"}</span>
                  <Badge variant="warning">Reorder</Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span>{row.available ?? 0} left</span>
                  <span>Threshold {row.reorderPoint ?? 0}</span>
                  <span>{row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : "Recently updated"}</span>
                </div>
              </div>
            )) : <div className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-center"><p className="font-medium text-foreground">Inventory looks healthy</p><p className="mt-1 text-xs text-muted-foreground">No immediate reorder pressure from the latest snapshot.</p></div>}
          </div>
        </Card>
      </Grid>

      <Grid minColumnWidth="320px" className="gap-4">
        <Card>
          <CardTitle>Order momentum</CardTitle>
          <CardDescription className="mt-2">Recent order count so the team can judge demand at a glance.</CardDescription>
          <div className="mt-6"><SalesChart data={chartSales.length ? chartSales : [{ label: "No data", value: 0 }]} /></div>
        </Card>
        <Card>
          <CardTitle>Revenue momentum</CardTitle>
          <CardDescription className="mt-2">Gross revenue progression across recent days.</CardDescription>
          <div className="mt-6"><SalesChart data={chartRevenue.length ? chartRevenue : [{ label: "No data", value: 0 }]} /></div>
        </Card>
      </Grid>

      <Grid minColumnWidth="320px" className="gap-4">
        <Card>
          <CardTitle>Flow balance</CardTitle>
          <CardDescription className="mt-2">A quick read on demand, stock depth, and low-stock pressure.</CardDescription>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            <div className="flex flex-wrap justify-between gap-2 rounded-2xl border border-border/60 px-4 py-3"><span>Orders today</span><span className="font-medium text-foreground">{orders.filter((order) => order.createdAt && isSameDay(new Date(order.createdAt), today)).length}</span></div>
            <div className="flex flex-wrap justify-between gap-2 rounded-2xl border border-border/60 px-4 py-3"><span>Total SKUs</span><span className="font-medium text-foreground">{inventorySnapshot?.totalSkus ?? inventory.length}</span></div>
            <div className="flex flex-wrap justify-between gap-2 rounded-2xl border border-border/60 px-4 py-3"><span>Low stock items</span><span className="font-medium text-foreground">{lowStockItems.length}</span></div>
            <div className="rounded-2xl border border-border/60 px-4 py-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Low stock ratio</span><span>{inventory.length ? Math.round((lowStockItems.length / inventory.length) * 100) : 0}%</span></div>
              <div className="mt-2"><ProgressBar value={inventory.length ? (lowStockItems.length / inventory.length) * 100 : 0} /></div>
            </div>
          </div>
        </Card>
        <Card>
          <CardTitle>Top products</CardTitle>
          <CardDescription className="mt-2">Best performers by quantity sold and revenue contribution.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {loading ? <p>Loading top product signals...</p> : topProducts.length ? topProducts.map((row) => (
              <div key={row.name} className="rounded-2xl border border-border/60 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium text-foreground">{row.name}</span><span>{row.revenue} BDT</span></div>
                <p className="mt-1 text-xs text-muted-foreground">{row.quantity} sold</p>
              </div>
            )) : <div className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-center"><p className="font-medium text-foreground">Waiting for the first sales signal</p><p className="mt-1 text-xs text-muted-foreground">Top products will appear here as soon as live orders start flowing.</p></div>}
          </div>
        </Card>
      </Grid>
    </div>
  );
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function resolveStatusVariant(status?: string) {
  const value = String(status || "").toUpperCase();
  if (["DELIVERED", "PAID", "COMPLETED"].includes(value)) return "success";
  if (["CANCELLED", "FAILED", "REFUNDED"].includes(value)) return "danger";
  if (["PAYMENT_PENDING", "PENDING", "IN_REVIEW"].includes(value)) return "warning";
  return "neutral";
}

function buildDailySeries(orders: OrderRow[], days: number) {
  const today = new Date();
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = date.toLocaleDateString();
    buckets.set(key, 0);
  }
  orders.forEach((order) => {
    if (!order.createdAt) return;
    const key = new Date(order.createdAt).toLocaleDateString();
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + 1);
  });
  return Array.from(buckets.entries()).map(([label, value]) => ({ label, value }));
}

function buildDailyRevenueSeries(orders: OrderRow[], days: number) {
  const today = new Date();
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = date.toLocaleDateString();
    buckets.set(key, 0);
  }
  orders.forEach((order) => {
    if (!order.createdAt) return;
    const key = new Date(order.createdAt).toLocaleDateString();
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + Number(order.totalAmount || 0));
  });
  return Array.from(buckets.entries()).map(([label, value]) => ({ label, value }));
}

function buildTopProducts(orders: OrderRow[], limit: number) {
  const map = new Map<string, { name: string; quantity: number; revenue: number }>();
  orders.forEach((order) => {
    order.items?.forEach((item) => {
      const name = item.product?.name || "Product";
      const quantity = Number(item.quantity || 1);
      const price = Number(item.price || item.product?.price || 0);
      const current = map.get(name) || { name, quantity: 0, revenue: 0 };
      current.quantity += quantity;
      current.revenue += price * quantity;
      map.set(name, current);
    });
  });
  return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity).slice(0, limit).map((item) => ({ ...item, revenue: Number(item.revenue.toFixed(2)) }));
}

