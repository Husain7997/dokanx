"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  AnalyticsCards,
  Badge,
  Card,
  CardDescription,
  CardTitle,
  Grid,
  ProgressBar,
  SalesChart
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
  const [trendSeries, setTrendSeries] = useState<Array<{ label: string; value: number }>>([]);
  const [revenueSeries, setRevenueSeries] = useState<Array<{ label: string; value: number }>>([]);
  const [dailySalesSnapshot, setDailySalesSnapshot] = useState<DailySalesRow[]>([]);
  const [walletSnapshot, setWalletSnapshot] = useState<WalletSummary | null>(null);
  const [shipmentSnapshot, setShipmentSnapshot] = useState<ShipmentSummary | null>(null);
  const [inventorySnapshot, setInventorySnapshot] = useState<InventorySnapshot | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
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
        if (!active) return;
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
          ? payload?.current?.map((item, index) => ({
              label: item.label || `Day ${index + 1}`,
              value: Number(item.value || 0),
            })) || []
          : [];
        setTrendSeries(series);
        const dailyRows = Array.isArray(dailySales?.payload) ? (dailySales?.payload as DailySalesRow[]) : [];
        setDailySalesSnapshot(dailyRows);
        setWalletSnapshot((walletSummary?.payload as WalletSummary) || null);
        setShipmentSnapshot((shipmentSummary?.payload as ShipmentSummary) || null);
        setInventorySnapshot((inventorySummary?.payload as InventorySnapshot) || null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load dashboard overview.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const today = useMemo(() => new Date(), []);
  const quickStats = useMemo(() => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter((order) =>
      ["PLACED", "PAYMENT_PENDING", "PAYMENT_FAILED", "CONFIRMED"].includes(String(order.status || ""))
    ).length;
    const revenue = orders.reduce((acc, order) => acc + Number(order.totalAmount || 0), 0);
    const todayKey = toDateKey(today);
    const todaysSalesFromSnapshot = dailySalesSnapshot.find((row) => row.date === todayKey)?.gmv || 0;
    const todaysSales = todaysSalesFromSnapshot || orders
      .filter((order) => order.createdAt && isSameDay(new Date(order.createdAt), today))
      .reduce((acc, order) => acc + Number(order.totalAmount || 0), 0);
    const lowStock = inventory.filter(
      (row) => Number(row.available || 0) <= Number(row.reorderPoint || 0)
    ).length;

    const delivered = orders.filter((order) => String(order.status || "") === "DELIVERED").length;
    const conversion = shipmentSnapshot?.successRate
      ? Math.round(shipmentSnapshot.successRate * 100)
      : totalOrders
        ? Math.round((delivered / totalOrders) * 100)
        : 0;
    const lowStockCount = inventorySnapshot?.lowStockCount ?? lowStock;
    const totalDue = customers.reduce((sum, customer) => sum + Number(customer.totalDue || 0), 0);
    const searchableCustomers = customers.filter((customer) => Boolean(customer.phone)).length;

    return [
      { label: "Today's sales", value: `${todaysSales} BDT`, meta: "Sales today" },
      { label: "Total orders", value: String(totalOrders), meta: "All-time orders" },
      { label: "Pending orders", value: String(pendingOrders), meta: "Needs action" },
      { label: "Revenue", value: `${summary?.sales?.totalSales ?? revenue} BDT`, meta: "Lifetime revenue" },
      { label: "Wallet balance", value: `${walletBalance} BDT`, meta: "Available payout" },
      { label: "Profit", value: `${walletReport?.profitLoss ?? 0} BDT`, meta: "Income - expense" },
      { label: "Customer due", value: `${totalDue} BDT`, meta: "Outstanding credit" },
      { label: "CRM ready", value: String(searchableCustomers), meta: "Customers with mobile index" },
      { label: "Wallet inflow", value: `${walletSnapshot?.credits ?? 0} BDT`, meta: "Credits (30 days)" },
      { label: "Low stock alerts", value: String(lowStockCount), meta: "Inventory watchlist" },
      { label: "Courier success", value: `${conversion}%`, meta: "Delivered / total shipments" },
    ];
  }, [
    dailySalesSnapshot,
    inventory,
    inventorySnapshot?.lowStockCount,
    orders,
    shipmentSnapshot?.successRate,
    summary,
    today,
    customers,
    walletBalance,
    walletReport?.profitLoss,
    walletSnapshot?.credits,
  ]);

  const recentOrders = useMemo(() => orders.slice(0, 6), [orders]);
  const lowStockItems = useMemo(
    () =>
      inventory
        .filter((row) => Number(row.available || 0) <= Number(row.reorderPoint || 0))
        .slice(0, 6),
    [inventory]
  );

  const topProducts = useMemo(() => buildTopProducts(orders, 6), [orders]);

  const fallbackSeries = useMemo(() => buildDailySeries(orders, 7), [orders]);
  const fallbackRevenueSeries = useMemo(() => buildDailyRevenueSeries(orders, 7), [orders]);
  const snapshotRevenueSeries = useMemo(
    () =>
      dailySalesSnapshot.slice(-14).map((row) => ({
        label: row.date || "Day",
        value: Number(row.gmv || 0),
      })),
    [dailySalesSnapshot]
  );
  const chartSales = trendSeries.length ? trendSeries : fallbackSeries;
  const chartRevenue = snapshotRevenueSeries.length
    ? snapshotRevenueSeries
    : revenueSeries.length
      ? revenueSeries
      : fallbackRevenueSeries;

  useEffect(() => {
    if (!orders.length) return;
    setRevenueSeries(fallbackRevenueSeries);
  }, [fallbackRevenueSeries, orders.length]);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Merchant</p>
        <h1 className="dx-display text-3xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your shop health at a glance: sales, inventory, and customer activity.
        </p>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <AnalyticsCards items={quickStats} />

      <Grid minColumnWidth="320px" className="gap-4">
        <Card>
          <CardTitle>Activity feed</CardTitle>
          <CardDescription className="mt-2">Recent orders and fulfillment updates.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {recentOrders.length ? (
              recentOrders.map((order) => (
                <div
                  key={String(order._id)}
                  className="flex flex-wrap justify-between gap-2 rounded-2xl border border-border/60 px-4 py-3"
                >
                  <span>Order {order._id?.slice(-6)}</span>
                  <Badge variant={resolveStatusVariant(order.status)}>{order.status || "PLACED"}</Badge>
                  <span>{order.totalAmount ?? 0} BDT</span>
                  <span>{order.createdAt ? new Date(order.createdAt).toLocaleString() : "Pending"}</span>
                </div>
              ))
            ) : (
              <p>No activity yet.</p>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>Inventory highlights</CardTitle>
          <CardDescription className="mt-2">Items running low in your warehouse.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {lowStockItems.length ? (
              lowStockItems.map((row) => (
                <div
                  key={String(row._id || row.productId)}
                  className="flex flex-wrap justify-between gap-2 rounded-2xl border border-border/60 px-4 py-3"
                >
                  <span>{row.productId || "Product"}</span>
                  <span>{row.available ?? 0} left</span>
                  <Badge variant="warning">Reorder at {row.reorderPoint ?? 0}</Badge>
                </div>
              ))
            ) : (
              <p>No low stock alerts.</p>
            )}
          </div>
        </Card>
      </Grid>

      <Grid minColumnWidth="320px" className="gap-4">
        <Card>
          <CardTitle>Sales trend</CardTitle>
          <CardDescription className="mt-2">Recent sales momentum for your shop.</CardDescription>
          <div className="mt-6">
            <SalesChart data={chartSales.length ? chartSales : [{ label: "No data", value: 0 }]} />
          </div>
        </Card>
        <Card>
          <CardTitle>Revenue trend</CardTitle>
          <CardDescription className="mt-2">Gross revenue progression over time.</CardDescription>
          <div className="mt-6">
            <SalesChart data={chartRevenue.length ? chartRevenue : [{ label: "No data", value: 0 }]} />
          </div>
        </Card>
      </Grid>

      <Grid minColumnWidth="320px" className="gap-4">
        <Card>
          <CardTitle>Recent orders</CardTitle>
          <CardDescription className="mt-2">Track last confirmed purchases.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {recentOrders.length ? (
              recentOrders.map((order) => (
                <div key={String(order._id)} className="flex flex-wrap justify-between gap-2 rounded-2xl border border-border/60 px-4 py-3">
                  <span>{order.items?.[0]?.product?.name || "Order items"}</span>
                  <span>{order.totalAmount ?? 0} BDT</span>
                  <Badge variant={resolveStatusVariant(order.status)}>{order.status || "PLACED"}</Badge>
                </div>
              ))
            ) : (
              <p>No orders to display.</p>
            )}
          </div>
        </Card>
        <Card>
          <CardTitle>Orders vs inventory</CardTitle>
          <CardDescription className="mt-2">Balance demand with stock movement.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            <div className="flex flex-wrap justify-between gap-2 rounded-2xl border border-border/60 px-4 py-3">
              <span>Orders today</span>
              <span>
                {orders.filter((order) => order.createdAt && isSameDay(new Date(order.createdAt), today)).length}
              </span>
            </div>
            <div className="flex flex-wrap justify-between gap-2 rounded-2xl border border-border/60 px-4 py-3">
              <span>Total SKUs</span>
              <span>{inventorySnapshot?.totalSkus ?? inventory.length}</span>
            </div>
            <div className="flex flex-wrap justify-between gap-2 rounded-2xl border border-border/60 px-4 py-3">
              <span>Low stock items</span>
              <span>{lowStockItems.length}</span>
            </div>
            <div className="rounded-2xl border border-border/60 px-4 py-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Low stock ratio</span>
                <span>{inventory.length ? Math.round((lowStockItems.length / inventory.length) * 100) : 0}%</span>
              </div>
              <div className="mt-2">
                <ProgressBar value={inventory.length ? (lowStockItems.length / inventory.length) * 100 : 0} />
              </div>
            </div>
          </div>
        </Card>
      </Grid>

      <Card>
        <CardTitle>Top products</CardTitle>
        <CardDescription className="mt-2">Best-performing products by order volume.</CardDescription>
        <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
          {topProducts.length ? (
            topProducts.map((row) => (
              <div key={row.name} className="flex flex-wrap justify-between gap-2 rounded-2xl border border-border/60 px-4 py-3">
                <span>{row.name}</span>
                <span>{row.quantity} sold</span>
                <span>{row.revenue} BDT</span>
              </div>
            ))
          ) : (
            <p>No product data yet.</p>
          )}
        </div>
      </Card>
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
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }
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
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) || 0) + Number(order.totalAmount || 0));
    }
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
  return Array.from(map.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
}
