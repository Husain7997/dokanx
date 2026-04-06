import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import {
  getMerchantAiInsightsRequest,
  getMerchantCreditCustomersRequest,
  getMerchantOrdersRequest,
  getMerchantWalletSummaryRequest,
} from "../lib/api-client";
import { DokanXLogo } from "../components/dokanx-logo";
import { useMerchantNavigation } from "../navigation/merchant-navigation";
import { useMerchantAuthStore } from "../store/auth-store";
import { MerchantTopNav } from "./merchant-top-nav";

type MetricCard = {
  label: string;
  value: string;
  hint: string;
};

type RecentOrder = {
  id: string;
  status: string;
  amount: number;
  customer: string;
  paymentStatus: string;
  createdAt: string;
};

type InsightItem = {
  id: string;
  title: string;
  message: string;
};

const BRAND = {
  navy: "#0B1E3C",
  orange: "#FF7A00",
  ink: "#0f172a",
  slate: "#475569",
  muted: "#64748b",
  border: "#dbe4f0",
  surface: "#ffffff",
  surfaceSoft: "#f8fafc",
  cream: "#f4efe8",
  successBg: "#ecfdf3",
  successFg: "#166534",
  dangerBg: "#fff1f2",
  dangerFg: "#b91c1c",
};

function matchesDateRange(value: string, dateFrom: string, dateTo: string) {
  if (!dateFrom && !dateTo) return true;
  if (!value) return false;
  const current = new Date(value).getTime();
  if (Number.isNaN(current)) return false;
  const from = dateFrom ? new Date(dateFrom).getTime() : null;
  const to = dateTo ? new Date(dateTo).getTime() + (24 * 60 * 60 * 1000) - 1 : null;
  if (from !== null && !Number.isNaN(from) && current < from) return false;
  if (to !== null && !Number.isNaN(to) && current > to) return false;
  return true;
}

function formatDateLabel(value: string) {
  if (!value) return "Recent";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recent";
  return date.toLocaleDateString();
}

function formatStatusTone(status: string) {
  const value = String(status || "").toUpperCase();
  if (["DELIVERED", "SUCCESS"].includes(value)) return { bg: "#dcfce7", fg: "#166534" };
  if (["SHIPPED", "CONFIRMED"].includes(value)) return { bg: "#dbeafe", fg: "#1d4ed8" };
  if (["CANCELLED", "FAILED"].includes(value)) return { bg: "#fee2e2", fg: "#991b1b" };
  return { bg: "#fef3c7", fg: "#92400e" };
}

export function MerchantDashboardScreen() {
  const navigation = useMerchantNavigation();
  const accessToken = useMerchantAuthStore((state) => state.accessToken);
  const profile = useMerchantAuthStore((state) => state.profile);
  const signOut = useMerchantAuthStore((state) => state.signOut);
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [totalDue, setTotalDue] = useState(0);
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!accessToken) {
      setError("Merchant session missing. Please sign in again.");
      setStatusNote(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [ordersResponse, walletResponse, creditResponse, aiResponse] = await Promise.all([
        getMerchantOrdersRequest(accessToken),
        getMerchantWalletSummaryRequest(accessToken),
        getMerchantCreditCustomersRequest(accessToken),
        getMerchantAiInsightsRequest(accessToken),
      ]);

      const orderRows = (ordersResponse.data || [])
        .map((row) => ({
          id: String(row._id || ""),
          status: String(row.status || "PENDING"),
          amount: Number(row.totalAmount || 0),
          customer: String(row.user?.name || row.contact?.phone || row.contact?.email || "Walk-in customer"),
          paymentStatus: String(row.paymentStatus || "PENDING"),
          createdAt: String(row.createdAt || ""),
        }))
        .filter((row) => row.id);

      const due = (creditResponse.data || []).reduce((sum, row) => sum + Number(row.outstandingBalance || 0), 0);
      const nextInsights = (aiResponse.data || []).map((item, index) => ({
        id: String(item.id || item.title || `insight-${index}`),
        title: String(item.title || "Insight"),
        message: String(item.message || "No message"),
      }));

      setOrders(orderRows);
      setWalletBalance(Number(walletResponse.data?.balance || walletResponse.data?.available_balance || 0));
      setTotalDue(due);
      setInsights(nextInsights.slice(0, 4));
      setStatusNote(`Live merchant snapshot refreshed with ${orderRows.length} orders.`);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Unable to load the dashboard right now.";
      setError(message);
      setStatusNote(null);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const filteredOrders = useMemo(
    () => orders.filter((order) => matchesDateRange(order.createdAt, dateFrom, dateTo)),
    [dateFrom, dateTo, orders],
  );

  const totalSales = useMemo(
    () => filteredOrders.reduce((sum, order) => sum + (String(order.status).toUpperCase() === "CANCELLED" ? 0 : order.amount), 0),
    [filteredOrders],
  );

  const pendingOrders = useMemo(
    () => filteredOrders.filter((order) => ["PLACED", "PENDING", "PAYMENT_PENDING"].includes(String(order.status).toUpperCase())).length,
    [filteredOrders],
  );

  const averageTicket = useMemo(
    () => (filteredOrders.length ? totalSales / filteredOrders.length : 0),
    [filteredOrders.length, totalSales],
  );

  const metrics = useMemo<MetricCard[]>(
    () => [
      { label: "Sales in range", value: `BDT ${totalSales.toFixed(2)}`, hint: "Live orders, excluding cancelled sales" },
      { label: "Orders in range", value: String(filteredOrders.length), hint: "Recalculated as you adjust the date filter" },
      { label: "Wallet balance", value: `BDT ${walletBalance.toFixed(2)}`, hint: "Available merchant wallet summary" },
      { label: "Outstanding due", value: `BDT ${totalDue.toFixed(2)}`, hint: "Active customer credit to recover" },
    ],
    [filteredOrders.length, totalDue, totalSales, walletBalance],
  );

  const operationsCards = useMemo(
    () => [
      { label: "Pending fulfillment", value: String(pendingOrders), hint: "Orders waiting for confirmation or handover" },
      { label: "Average ticket", value: `BDT ${averageTicket.toFixed(2)}`, hint: "Average order size in the current range" },
      { label: "AI prompts", value: String(insights.length), hint: "Priority nudges from merchant intelligence" },
    ],
    [averageTicket, insights.length, pendingOrders],
  );

  const recentHighlights = filteredOrders.slice(0, 4);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <MerchantTopNav active="Dashboard" />

      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroBrandWrap}>
            <DokanXLogo variant="icon" size="sm" />
            <View style={styles.heroBrandCopy}>
              <Text style={styles.eyebrow}>DokanX Merchant OS</Text>
              <Text style={styles.heroTitle}>{profile?.name || "Merchant workspace"}</Text>
            </View>
          </View>
          <Pressable style={styles.heroGhostButton} onPress={() => void loadDashboard()}>
            <Text style={styles.heroGhostText}>{isLoading ? "Refreshing" : "Refresh"}</Text>
          </Pressable>
        </View>

        <Text style={styles.heroSubtitle}>
          Keep today&apos;s store pulse in one place: sales, dues, wallet strength, AI prompts, and fulfillment movement.
        </Text>

        <View style={styles.heroSignalRow}>
          <View style={styles.heroSignalCard}>
            <Text style={styles.heroSignalLabel}>Shop role</Text>
            <Text style={styles.heroSignalValue}>{profile?.role || "Merchant"}</Text>
          </View>
          <View style={styles.heroSignalCard}>
            <Text style={styles.heroSignalLabel}>Orders loaded</Text>
            <Text style={styles.heroSignalValue}>{orders.length}</Text>
          </View>
          <View style={styles.heroSignalCard}>
            <Text style={styles.heroSignalLabel}>Attention now</Text>
            <Text style={styles.heroSignalValue}>{pendingOrders}</Text>
          </View>
        </View>

        <View style={styles.heroActions}>
          <Pressable style={styles.primaryButton} onPress={() => navigation.navigate("MerchantPos")}>
            <Text style={styles.primaryButtonText}>Open POS</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate("MerchantOrders")}>
            <Text style={styles.secondaryButtonText}>Review Orders</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => void signOut()}>
            <Text style={styles.secondaryButtonText}>Sign out</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.filterCard}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Reporting window</Text>
          <Text style={styles.sectionHint}>Adjust the visible period to recalculate sales, order count, and ticket size.</Text>
        </View>
        <View style={styles.filterInputs}>
          <View style={styles.filterInputWrap}>
            <Text style={styles.filterLabel}>From</Text>
            <TextInput style={styles.filterInput} value={dateFrom} onChangeText={setDateFrom} placeholder="YYYY-MM-DD" placeholderTextColor={BRAND.muted} />
          </View>
          <View style={styles.filterInputWrap}>
            <Text style={styles.filterLabel}>To</Text>
            <TextInput style={styles.filterInput} value={dateTo} onChangeText={setDateTo} placeholder="YYYY-MM-DD" placeholderTextColor={BRAND.muted} />
          </View>
        </View>
      </View>

      <View style={styles.grid}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.metricCard}>
            <Text style={styles.metricLabel}>{metric.label}</Text>
            <Text style={styles.metricValue}>{metric.value}</Text>
            <Text style={styles.metricHint}>{metric.hint}</Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Operations snapshot</Text>
          <Text style={styles.sectionHint}>The fastest read on what needs action next.</Text>
        </View>
        <View style={styles.operationsGrid}>
          {operationsCards.map((item) => (
            <View key={item.label} style={styles.operationCard}>
              <Text style={styles.operationLabel}>{item.label}</Text>
              <Text style={styles.operationValue}>{item.value}</Text>
              <Text style={styles.operationHint}>{item.hint}</Text>
            </View>
          ))}
        </View>
      </View>

      {statusNote ? (
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>{statusNote}</Text>
        </View>
      ) : null}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}
      {isLoading ? <Text style={styles.loadingText}>Loading merchant dashboard...</Text> : null}

      <View style={styles.sectionCard}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Quick routes</Text>
          <Text style={styles.sectionHint}>Jump straight into the areas operators use most.</Text>
        </View>
        <View style={styles.quickGrid}>
          {[
            ["MerchantOrders", "Orders", "Fulfillment and status updates"],
            ["MerchantWallet", "Wallet", "Settlement balance and activity"],
            ["MerchantFinance", "Finance", "Credit, dues, and payment view"],
            ["MerchantCustomers", "Customers", "Relationship and due follow-up"],
            ["MerchantProducts", "Products", "Catalog health and pricing"],
            ["MerchantAi", "AI", "Recommendations and nudges"],
          ].map(([screen, label, hint]) => (
            <Pressable key={label} style={styles.quickCard} onPress={() => navigation.navigate(screen as never)}>
              <Text style={styles.quickLabel}>{label}</Text>
              <Text style={styles.quickHint}>{hint}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>AI priorities</Text>
          <Text style={styles.sectionHint}>What DokanX thinks needs attention first.</Text>
        </View>
        {insights.length ? (
          insights.map((item) => (
            <View key={item.id} style={styles.feedRow}>
              <Text style={styles.feedTitle}>{item.title}</Text>
              <Text style={styles.feedBody}>{item.message}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.feedBody}>No AI insight is available right now. Fresh recommendations will appear here automatically.</Text>
        )}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Recent order watchlist</Text>
          <Text style={styles.sectionHint}>A short list of live transactions in the chosen reporting window.</Text>
        </View>
        {recentHighlights.length ? (
          recentHighlights.map((order) => {
            const statusTone = formatStatusTone(order.status);
            const paymentTone = formatStatusTone(order.paymentStatus);
            return (
              <View key={order.id} style={styles.orderRow}>
                <View style={styles.orderRowLeft}>
                  <Text style={styles.feedTitle}>{order.customer}</Text>
                  <Text style={styles.orderMeta}>{formatDateLabel(order.createdAt)} • BDT {order.amount.toFixed(2)}</Text>
                </View>
                <View style={styles.orderBadges}>
                  <Text style={[styles.orderBadge, { backgroundColor: statusTone.bg, color: statusTone.fg }]}>{order.status}</Text>
                  <Text style={[styles.orderBadge, { backgroundColor: paymentTone.bg, color: paymentTone.fg }]}>{order.paymentStatus}</Text>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={styles.feedBody}>No recent orders in the selected range.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 120,
    backgroundColor: BRAND.cream,
    gap: 14,
  },
  heroCard: {
    backgroundColor: BRAND.navy,
    borderRadius: 28,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  heroBrandWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  heroBrandCopy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    color: "#ffd49f",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 25,
    fontWeight: "800",
  },
  heroGhostButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  heroGhostText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  heroSubtitle: {
    color: "#dbe7fb",
    fontSize: 14,
    lineHeight: 21,
  },
  heroSignalRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  heroSignalCard: {
    flex: 1,
    minWidth: 94,
    borderRadius: 18,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    gap: 4,
  },
  heroSignalLabel: {
    color: "#bfd2f2",
    fontSize: 11,
    fontWeight: "600",
  },
  heroSignalValue: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  primaryButton: {
    backgroundColor: BRAND.orange,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 13,
  },
  secondaryButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: "#f8fafc",
    fontWeight: "700",
    fontSize: 13,
  },
  filterCard: {
    backgroundColor: BRAND.surface,
    borderRadius: 22,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  sectionHead: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: BRAND.ink,
  },
  sectionHint: {
    fontSize: 12,
    color: BRAND.muted,
    lineHeight: 18,
  },
  filterInputs: {
    flexDirection: "row",
    gap: 10,
  },
  filterInputWrap: {
    flex: 1,
    gap: 6,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: BRAND.slate,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: BRAND.surfaceSoft,
    color: BRAND.ink,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    width: "48%",
    backgroundColor: BRAND.surface,
    borderRadius: 20,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  metricLabel: {
    fontSize: 12,
    color: BRAND.muted,
    fontWeight: "700",
  },
  metricValue: {
    fontSize: 22,
    color: BRAND.ink,
    fontWeight: "800",
  },
  metricHint: {
    fontSize: 12,
    color: BRAND.slate,
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: BRAND.surface,
    borderRadius: 22,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  operationsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  operationCard: {
    flex: 1,
    minWidth: 96,
    borderRadius: 16,
    padding: 12,
    backgroundColor: BRAND.surfaceSoft,
    borderWidth: 1,
    borderColor: BRAND.border,
    gap: 4,
  },
  operationLabel: {
    color: BRAND.muted,
    fontSize: 11,
    fontWeight: "700",
  },
  operationValue: {
    color: BRAND.ink,
    fontSize: 18,
    fontWeight: "800",
  },
  operationHint: {
    color: BRAND.slate,
    fontSize: 11,
    lineHeight: 16,
  },
  infoBanner: {
    backgroundColor: BRAND.successBg,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  infoBannerText: {
    color: BRAND.successFg,
    fontSize: 12,
    fontWeight: "700",
  },
  errorBanner: {
    backgroundColor: BRAND.dangerBg,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#fecdd3",
  },
  errorBannerText: {
    color: BRAND.dangerFg,
    fontSize: 12,
    fontWeight: "700",
  },
  loadingText: {
    fontSize: 12,
    color: BRAND.muted,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickCard: {
    width: "48%",
    borderRadius: 18,
    padding: 14,
    backgroundColor: BRAND.surfaceSoft,
    borderWidth: 1,
    borderColor: BRAND.border,
    gap: 5,
  },
  quickLabel: {
    color: BRAND.ink,
    fontWeight: "800",
    fontSize: 13,
  },
  quickHint: {
    color: BRAND.slate,
    fontSize: 11,
    lineHeight: 16,
  },
  feedRow: {
    gap: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eef2f7",
  },
  feedTitle: {
    color: BRAND.ink,
    fontWeight: "800",
    fontSize: 13,
  },
  feedBody: {
    color: BRAND.slate,
    lineHeight: 19,
    fontSize: 12,
  },
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eef2f7",
  },
  orderRowLeft: {
    flex: 1,
    gap: 4,
  },
  orderMeta: {
    color: BRAND.slate,
    fontSize: 12,
  },
  orderBadges: {
    alignItems: "flex-end",
    gap: 6,
  },
  orderBadge: {
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: "hidden",
  },
});

