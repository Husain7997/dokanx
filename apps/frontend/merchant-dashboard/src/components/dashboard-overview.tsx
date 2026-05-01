"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@dokanx/auth";
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

import { adjustInventory, getMerchantAiCopilot, getShopSummary, getWalletReport, getWalletSummary, listAnalyticsSnapshots, listCustomers, listInventory, listOrders, listTeamActivity, retryPayment, updateOrderStatus, upsertCreditPolicy } from "@/lib/runtime-api";
import { hasPermission } from "@/lib/permissions";

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
  const auth = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [customers, setCustomers] = useState<Array<{ totalDue?: number; phone?: string }>>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [walletReport, setWalletReport] = useState<{ totalIncome?: number; totalExpense?: number; profitLoss?: number; totalDue?: number } | null>(null);
  const [summary, setSummary] = useState<{ sales?: { totalSales?: number; totalOrders?: number } } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiActionMessage, setAiActionMessage] = useState<string | null>(null);
  const [aiActionTone, setAiActionTone] = useState<"info" | "success" | "warning" | "error">("info");
  const [aiActionBusyKey, setAiActionBusyKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [trendSeries, setTrendSeries] = useState<Array<{ label: string; value: number }>>([]);
  const [revenueSeries, setRevenueSeries] = useState<Array<{ label: string; value: number }>>([]);
  const [dailySalesSnapshot, setDailySalesSnapshot] = useState<DailySalesRow[]>([]);
  const [walletSnapshot, setWalletSnapshot] = useState<WalletSummary | null>(null);
  const [shipmentSnapshot, setShipmentSnapshot] = useState<ShipmentSummary | null>(null);
  const [inventorySnapshot, setInventorySnapshot] = useState<InventorySnapshot | null>(null);
  const [aiActionHistory, setAiActionHistory] = useState<Array<{ id?: string; action?: string; actorName?: string; actorRole?: string; createdAt?: string | null; targetType?: string; targetId?: string | null; source?: string | null; note?: string | null; amount?: number | null; quantity?: number | null }>>([]);
  const [aiCopilot, setAiCopilot] = useState<{
    generatedAt?: string;
    cards?: Array<{ id?: string; title?: string; severity?: string; metric?: string; message?: string }>;
    salesSeries?: Array<{ label?: string; value?: number }>;
    inventoryActions?: Array<{ productId?: string; name?: string; currentStock?: number; reorderPoint?: number; suggestedRestock?: number; estimatedDaysLeft?: number | null; urgency?: string }>;
    customerSegments?: Array<{ segment?: string; count?: number; ratio?: number; description?: string }>;
    creditInsights?: Array<{ customerId?: string; customerName?: string; creditScore?: number; outstandingBalance?: number; utilizationRate?: number; riskLabel?: string; recommendedLimit?: number; creditLimit?: number; status?: string }>;
    paymentIntelligence?: { failureRate?: number; anomalies?: Array<{ gateway?: string; severity?: string; message?: string }> };
    fulfillmentActions?: Array<{ orderId?: string; ageHours?: number; suggestion?: string; priority?: string; status?: string }>;
    summary?: { projectedNext7Days?: number; revenueTrend?: number; paymentFailureRate?: number; lowStockCount?: number; riskyCreditCustomers?: number; fulfillmentBacklog?: number };
  } | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [ordersResponse, inventoryResponse, walletResponse, summaryResponse, analyticsResponse, customerResponse, walletReportResponse, aiResponse, teamActivityResponse] = await Promise.all([
        listOrders(25),
        listInventory(60),
        getWalletSummary(),
        getShopSummary(),
        listAnalyticsSnapshots({}),
        listCustomers(),
        getWalletReport(),
        getMerchantAiCopilot({ range: "30" }).catch(() => null),
        listTeamActivity().catch(() => ({ data: [] })),
      ]);
      setOrders(Array.isArray(ordersResponse.data) ? (ordersResponse.data as OrderRow[]) : []);
      setCustomers(Array.isArray(customerResponse.data) ? customerResponse.data as Array<{ totalDue?: number; phone?: string }> : []);
      setInventory(Array.isArray(inventoryResponse.data) ? (inventoryResponse.data as InventoryRow[]) : []);
      setWalletBalance(Number(walletResponse.data?.balance ?? 0));
      setWalletReport(walletReportResponse.data || null);
      setSummary(summaryResponse.data || null);
      setAiCopilot(aiResponse?.data || null);
      setAiActionHistory(Array.isArray(teamActivityResponse.data) ? teamActivityResponse.data.filter((item) => String(item.source || "").toLowerCase() === "merchant_ai_dashboard").slice(0, 6) as Array<{ id?: string; action?: string; actorName?: string; actorRole?: string; createdAt?: string | null; targetType?: string; targetId?: string | null; source?: string | null; note?: string | null; amount?: number | null; quantity?: number | null }> : []);
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

  async function handleAiRestockAction(item: {
    productId?: string;
    name?: string;
    suggestedRestock?: number;
  }) {
    if (!item.productId || !Number(item.suggestedRestock || 0)) return;
    const busyKey = `restock-${String(item.productId)}`;
    setAiActionBusyKey(busyKey);
    setAiActionMessage(null);
    try {
      const response = await adjustInventory({
        product: String(item.productId),
        quantity: Number(item.suggestedRestock || 0),
        note: `AI restock action for ${item.name || "product"}`,
        source: "merchant_ai_dashboard",
      });
      setAiActionTone("success");
      setAiActionMessage(response.message || `${item.name || "Product"} restocked from AI suggestion.`);
      await load();
    } catch (err) {
      setAiActionTone("error");
      setAiActionMessage(err instanceof Error ? err.message : "Unable to apply AI restock action.");
    } finally {
      setAiActionBusyKey(null);
    }
  }

  async function handleAiFulfillmentAction(item: {
    orderId?: string;
    status?: string;
  }) {
    if (!item.orderId) return;
    const nextAction = getFulfillmentAction(item.status);
    if (!nextAction) return;
    const busyKey = `fulfillment-${String(item.orderId)}`;
    setAiActionBusyKey(busyKey);
    setAiActionMessage(null);
    try {
      if (nextAction.type === "retry") {
        const response = await retryPayment(String(item.orderId), "merchant_ai_dashboard");
        setAiActionTone("success");
        setAiActionMessage(response.message || `Payment retry initiated for order ${String(item.orderId).slice(-6)}.`);
      } else {
        const response = await updateOrderStatus(String(item.orderId), nextAction.status);
        setAiActionTone("success");
        setAiActionMessage(response.message || `${nextAction.label} applied for order ${String(item.orderId).slice(-6)}.`);
      }
      await load();
    } catch (err) {
      setAiActionTone("error");
      setAiActionMessage(err instanceof Error ? err.message : "Unable to apply fulfillment action.");
    } finally {
      setAiActionBusyKey(null);
    }
  }


  async function handleAiCreditAction(item: {
    customerId?: string;
    customerName?: string;
    recommendedLimit?: number;
    creditLimit?: number;
    status?: string;
  }, action: "apply_limit" | "hold") {
    if (!item.customerId) return;
    const busyKey = `credit-${action}-${String(item.customerId)}`;
    setAiActionBusyKey(busyKey);
    setAiActionMessage(null);
    try {
      const payload = action === "hold"
        ? {
            customerId: String(item.customerId),
            creditLimit: Math.max(0, Number(item.creditLimit || item.recommendedLimit || 0)),
            status: "BLOCKED" as const,
            source: "merchant_ai_dashboard",
          }
        : {
            customerId: String(item.customerId),
            creditLimit: Math.max(0, Number(item.recommendedLimit || item.creditLimit || 0)),
            status: "ACTIVE" as const,
            source: "merchant_ai_dashboard",
          };
      const response = await upsertCreditPolicy(payload);
      setAiActionTone("success");
      setAiActionMessage(response.message || `${item.customerName || "Customer"} credit policy updated.`);
      await load();
    } catch (err) {
      setAiActionTone("error");
      setAiActionMessage(err instanceof Error ? err.message : "Unable to update credit policy.");
    } finally {
      setAiActionBusyKey(null);
    }
  }

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
  const aiCards = Array.isArray(aiCopilot?.cards) ? aiCopilot.cards : [];
  const aiSalesSeries = Array.isArray(aiCopilot?.salesSeries)
    ? aiCopilot.salesSeries.map((row, index) => ({ label: row.label || `AI ${index + 1}`, value: Number(row.value || 0) }))
    : [];
  const aiInventoryActions = Array.isArray(aiCopilot?.inventoryActions) ? aiCopilot.inventoryActions : [];
  const aiCustomerSegments = Array.isArray(aiCopilot?.customerSegments) ? aiCopilot.customerSegments : [];
  const aiCreditInsights = Array.isArray(aiCopilot?.creditInsights) ? aiCopilot.creditInsights : [];
  const aiPaymentAlerts = Array.isArray(aiCopilot?.paymentIntelligence?.anomalies) ? aiCopilot.paymentIntelligence.anomalies : [];
  const aiFulfillmentActions = Array.isArray(aiCopilot?.fulfillmentActions) ? aiCopilot.fulfillmentActions : [];
  const canViewAiOverview = hasPermission(auth.user, "AI_VIEW_OVERVIEW");
  const canViewAiInventory = hasPermission(auth.user, "AI_VIEW_INVENTORY");
  const canViewAiCustomers = hasPermission(auth.user, "AI_VIEW_CUSTOMERS");
  const canViewAiCredit = hasPermission(auth.user, "AI_VIEW_CREDIT");
  const canViewAiPayments = hasPermission(auth.user, "AI_VIEW_PAYMENTS");
  const chartSales = aiSalesSeries.length ? aiSalesSeries : trendSeries.length ? trendSeries : fallbackSeries;
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
      {aiActionMessage ? <Alert variant={aiActionTone}>{aiActionMessage}</Alert> : null}
      <AnalyticsCards items={quickStats} />

      <Card className="overflow-hidden border-border/70 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.08),_transparent_45%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(15,118,110,0.92))] text-white">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-emerald-100/80">AI Copilot</p>
            <h2 className="dx-display mt-3 text-2xl sm:text-3xl">The shop now has a decision layer, not just charts.</h2>
            <p className="mt-3 max-w-2xl text-sm text-emerald-50/80 sm:text-base">
              Forecast, stock pressure, credit watch, payment anomalies, and order follow-ups are bundled here so the team can act before issues grow.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {canViewAiOverview && aiCards.length ? aiCards.map((item) => (
                <div key={String(item.id || item.title)} className="rounded-2xl border border-white/15 bg-white/8 px-4 py-4 backdrop-blur">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-white">{item.title || "AI insight"}</span>
                    <Badge variant={resolveAiVariant(item.severity)}>{item.metric || "Live"}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-emerald-50/75">{item.message || "New AI signal is available."}</p>
                </div>
              )) : <div className="rounded-2xl border border-dashed border-white/20 px-4 py-6 text-sm text-emerald-50/75">AI insights will appear here once order, customer, and payment patterns are available.</div>}
            </div>
          </div>
          <div className="rounded-[24px] border border-white/12 bg-black/15 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/70">Projected next 7 days</p>
            <p className="mt-3 text-3xl font-semibold">{Math.round(aiCopilot?.summary?.projectedNext7Days ?? 0)} BDT</p>
            <div className="mt-4 grid gap-3 text-sm text-emerald-50/80">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3"><span>Revenue trend</span><span>{aiCopilot?.summary?.revenueTrend ?? 0}%</span></div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3"><span>Low stock risks</span><span>{aiCopilot?.summary?.lowStockCount ?? 0}</span></div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3"><span>Risky credit customers</span><span>{aiCopilot?.summary?.riskyCreditCustomers ?? 0}</span></div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3"><span>Payment failure rate</span><span>{Math.round((aiCopilot?.summary?.paymentFailureRate ?? 0) * 100)}%</span></div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3"><span>Automation backlog</span><span>{aiCopilot?.summary?.fulfillmentBacklog ?? 0}</span></div>
            </div>
          </div>
        </div>
      </Card>

      <Grid minColumnWidth="300px" className="gap-4">
        <Card>
          <CardTitle>AI Restock Suggestions</CardTitle>
          <CardDescription className="mt-2">Predicted demand converted into reorder actions.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {canViewAiInventory && aiInventoryActions.length ? aiInventoryActions.slice(0, 5).map((item) => (
              <div key={String(item.productId || item.name)} className="rounded-2xl border border-border/60 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{item.name || "Product"}</span>
                  <Badge variant={resolveAiVariant(item.urgency)}>{item.suggestedRestock ?? 0} add</Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span>{item.currentStock ?? 0} in stock</span>
                  <span>AI threshold {item.reorderPoint ?? 0}</span>
                  <span>{item.estimatedDaysLeft ?? 0} days left</span>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void handleAiRestockAction(item)}
                    loading={aiActionBusyKey === `restock-${String(item.productId || "")}`}
                    loadingText="Restocking"
                    disabled={!item.productId || !Number(item.suggestedRestock || 0)}
                  >
                    Restock now
                  </Button>
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground">No AI restock suggestions yet.</p>}
          </div>
        </Card>

        <Card>
          <CardTitle>Customer Segments</CardTitle>
          <CardDescription className="mt-2">Retention and offer targeting generated from recent behavior.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {canViewAiCustomers && aiCustomerSegments.length ? aiCustomerSegments.map((segment) => (
              <div key={String(segment.segment)} className="rounded-2xl border border-border/60 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{segment.segment || "Segment"}</span>
                  <Badge variant="neutral">{segment.count ?? 0}</Badge>
                </div>
                <p className="mt-2 text-xs">{segment.description || "Behavior cluster"}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">Customer segments will appear once the shop has enough repeat behavior.</p>}
          </div>
        </Card>

        <Card>
          <CardTitle>Credit Watch</CardTitle>
          <CardDescription className="mt-2">Scored credit customers who may need limit changes or review.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {canViewAiCredit && aiCreditInsights.length ? aiCreditInsights.slice(0, 5).map((item) => (
              <div key={String(item.customerId || item.customerName)} className="rounded-2xl border border-border/60 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{item.customerName || "Customer"}</span>
                  <Badge variant={resolveAiVariant(item.riskLabel)}>{item.creditScore ?? 0}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span>Outstanding {item.outstandingBalance ?? 0} BDT</span>
                  <span>Use {Math.round(Number(item.utilizationRate ?? 0) * 100)}%</span>
                  <span>Limit {item.recommendedLimit ?? 0}</span>
                </div>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void handleAiCreditAction(item, "apply_limit")}
                    loading={aiActionBusyKey === `credit-apply_limit-${String(item.customerId || "")}`}
                    loadingText="Applying"
                    disabled={!item.customerId || !Number(item.recommendedLimit || item.creditLimit || 0)}
                  >
                    Apply AI limit
                  </Button>
                  {String(item.status || "ACTIVE").toUpperCase() !== "BLOCKED" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleAiCreditAction(item, "hold")}
                      loading={aiActionBusyKey === `credit-hold-${String(item.customerId || "")}`}
                      loadingText="Holding"
                      disabled={!item.customerId}
                    >
                      Hold credit
                    </Button>
                  ) : null}
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground">No credit accounts are active yet.</p>}
          </div>
        </Card>

        <Card>
          <CardTitle>Payment & Automation Alerts</CardTitle>
          <CardDescription className="mt-2">Gateway anomalies and stalled fulfillment actions.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {canViewAiPayments
              ? aiPaymentAlerts.slice(0, 3).map((item, index) => (
                  <div key={`${item.gateway || "gateway"}-${index}`} className="rounded-2xl border border-border/60 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">{item.gateway || "Gateway"}</span>
                      <Badge variant={resolveAiVariant(item.severity)}>{item.severity || "info"}</Badge>
                    </div>
                    <p className="mt-2 text-xs">{item.message || "Payment anomaly detected."}</p>
                  </div>
                ))
              : null}
            {canViewAiOverview
              ? aiFulfillmentActions.slice(0, 2).map((item) => {
                  const nextAction = getFulfillmentAction(item.status);
                  return (
                    <div key={String(item.orderId || item.suggestion)} className="rounded-2xl border border-border/60 px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground">Order {String(item.orderId || "").slice(-6)}</span>
                        <Badge variant={resolveAiVariant(item.priority)}>{Math.round(item.ageHours ?? 0)}h</Badge>
                      </div>
                      <p className="mt-2 text-xs">{item.suggestion || "Fulfillment follow-up required."}</p>
                      {nextAction ? (
                        <div className="mt-3 flex justify-end">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => void handleAiFulfillmentAction(item)}
                            loading={aiActionBusyKey === `fulfillment-${String(item.orderId || "")}`}
                            loadingText="Applying"
                          >
                            {nextAction.label}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              : null}
            {canViewAiPayments && canViewAiOverview && !aiPaymentAlerts.length && !aiFulfillmentActions.length ? (
              <p className="text-sm text-muted-foreground">No payment or automation alerts right now.</p>
            ) : null}
            {!canViewAiPayments && !canViewAiOverview ? (
              <p className="text-sm text-muted-foreground">Your role does not include payment or automation intelligence access.</p>
            ) : null}
          </div>
        </Card>
      </Grid>

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
          <CardTitle>AI Action History</CardTitle>
          <CardDescription className="mt-2">Recent restock, retry, and fulfillment actions triggered from the AI dashboard.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {aiActionHistory.length ? aiActionHistory.map((item) => (
              <div key={String(item.id || `${item.action}-${item.createdAt}`)} className="rounded-2xl border border-border/60 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{formatAiAuditAction(item.action)}</span>
                  <Badge variant="neutral">{item.targetType || "Action"}</Badge>
                </div>
                <p className="mt-2 text-xs">{item.actorName || "Team member"} ? {item.createdAt ? new Date(item.createdAt).toLocaleString() : "Unknown time"}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {item.quantity ? <span>Qty {item.quantity}</span> : null}
                  {item.amount ? <span>{item.amount} BDT</span> : null}
                  {item.targetId ? <span>Target {String(item.targetId).slice(-6)}</span> : null}
                </div>
                {item.note ? <p className="mt-2 text-xs">{item.note}</p> : null}
              </div>
            )) : <p className="text-sm text-muted-foreground">AI actions you trigger from this dashboard will appear here.</p>}
          </div>
        </Card>

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

function formatAiAuditAction(action?: string) {
  return String(action || "AI_ACTION")
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function getFulfillmentAction(status?: string) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "PAYMENT_FAILED") {
    return { type: "retry" as const, label: "Retry payment" };
  }
  if (normalized === "PLACED" || normalized === "PAYMENT_PENDING") {
    return { type: "status" as const, status: "CONFIRMED", label: "Confirm order" };
  }
  if (normalized === "CONFIRMED") {
    return { type: "status" as const, status: "SHIPPED", label: "Mark shipped" };
  }
  return null;
}

function resolveAiVariant(value?: string) {
  const normalized = String(value || "").toLowerCase();
  if (["critical", "high", "warning", "risky", "review"].includes(normalized)) return "warning";
  if (["healthy", "success"].includes(normalized)) return "success";
  if (["medium", "info", "watch", "low", "neutral"].includes(normalized)) return "neutral";
  return "neutral";
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

