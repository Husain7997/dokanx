import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import {
  getMerchantAiInsightsRequest,
  getMerchantCreditCustomersRequest,
  getMerchantOrdersRequest,
  getMerchantWalletSummaryRequest,
} from "../lib/api-client";
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
      const nextInsights = (aiResponse.data || []).map((item) => ({
        id: String(item.id || item.title || Math.random()),
        title: String(item.title || "Insight"),
        message: String(item.message || "No message"),
      }));

      setOrders(orderRows);
      setWalletBalance(Number(walletResponse.data?.balance || walletResponse.data?.available_balance || 0));
      setTotalDue(due);
      setInsights(nextInsights.slice(0, 3));
      setStatusNote(`Loaded ${orderRows.length} orders with live merchant finance.`);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Unable to load dashboard";
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
    () => filteredOrders.reduce((sum, order) => sum + (order.status === "CANCELLED" ? 0 : order.amount), 0),
    [filteredOrders],
  );

  const metrics = useMemo<MetricCard[]>(
    () => [
      { label: "Total Sales", value: `BDT ${totalSales.toFixed(2)}`, hint: "Calculated from filtered live orders" },
      { label: "Orders", value: String(filteredOrders.length), hint: "Within the selected report range" },
      { label: "Wallet Balance", value: `BDT ${walletBalance.toFixed(2)}`, hint: "Live wallet summary" },
      { label: "Total Due", value: `BDT ${totalDue.toFixed(2)}`, hint: "Outstanding credit customers" },
    ],
    [filteredOrders.length, totalDue, totalSales, walletBalance],
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <MerchantTopNav active="Dashboard" />
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Merchant OS</Text>
        <Text style={styles.heroTitle}>{profile?.name || "Merchant"}</Text>
        <Text style={styles.heroSubtitle}>Real-time operations hub for sales, dues, wallet, and AI workflow.</Text>
        <View style={styles.heroActions}>
          <Pressable style={styles.primaryButton} onPress={() => navigation.navigate("MerchantPos") }>
            <Text style={styles.primaryButtonText}>Open POS</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => void signOut()}>
            <Text style={styles.secondaryButtonText}>Sign out</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.filterCard}>
        <Text style={styles.filterTitle}>Report time filter</Text>
        <Text style={styles.filterHint}>Use date range to recalculate sales and order volume on the dashboard.</Text>
        <View style={styles.filterInputs}>
          <View style={styles.filterInputWrap}>
            <Text style={styles.filterLabel}>From</Text>
            <TextInput style={styles.filterInput} value={dateFrom} onChangeText={setDateFrom} placeholder="YYYY-MM-DD" placeholderTextColor="#6b7280" />
          </View>
          <View style={styles.filterInputWrap}>
            <Text style={styles.filterLabel}>To</Text>
            <TextInput style={styles.filterInput} value={dateTo} onChangeText={setDateTo} placeholder="YYYY-MM-DD" placeholderTextColor="#6b7280" />
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

      {statusNote ? <Text style={styles.statusNote}>{statusNote}</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {isLoading ? <Text style={styles.loadingText}>Loading merchant dashboard...</Text> : null}

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          {[
            ["MerchantOrders", "Orders"],
            ["MerchantWallet", "Wallet"],
            ["MerchantFinance", "Finance"],
            ["MerchantCustomers", "Customers"],
            ["MerchantProducts", "Products"],
            ["MerchantAi", "AI"],
          ].map(([screen, label]) => (
            <Pressable key={label} style={styles.quickCard} onPress={() => navigation.navigate(screen as any)}>
              <Text style={styles.quickLabel}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>AI Priorities</Text>
        {insights.length ? (
          insights.map((item) => (
            <View key={item.id} style={styles.feedRow}>
              <Text style={styles.feedTitle}>{item.title}</Text>
              <Text style={styles.feedBody}>{item.message}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.feedBody}>No AI insight available.</Text>
        )}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Recent Orders</Text>
        {filteredOrders.length ? (
          filteredOrders.slice(0, 5).map((order) => (
            <View key={order.id} style={styles.feedRow}>
              <Text style={styles.feedTitle}>{order.customer}</Text>
              <Text style={styles.feedBody}>
                {order.status} • {order.paymentStatus} • BDT {order.amount.toFixed(2)}
              </Text>
            </View>
          ))
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
    backgroundColor: "#f5f1ea",
    gap: 14,
  },
  heroCard: {
    backgroundColor: "#111827",
    borderRadius: 24,
    padding: 20,
    gap: 10,
  },
  eyebrow: {
    color: "#fbbf24",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
  },
  heroSubtitle: {
    color: "#d1d5db",
    fontSize: 14,
    lineHeight: 20,
  },
  heroActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: "#fbbf24",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#111827",
    fontWeight: "700",
  },
  secondaryButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#374151",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: "#f9fafb",
    fontWeight: "600",
  },
  filterCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  filterTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  filterHint: {
    fontSize: 12,
    color: "#6b7280",
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
    color: "#374151",
  },
  filterInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    color: "#111827",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  metricLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
  },
  metricValue: {
    fontSize: 22,
    color: "#111827",
    fontWeight: "800",
  },
  metricHint: {
    fontSize: 12,
    color: "#4b5563",
  },
  statusNote: {
    fontSize: 13,
    color: "#065f46",
  },
  errorText: {
    fontSize: 13,
    color: "#b91c1c",
  },
  loadingText: {
    fontSize: 13,
    color: "#6b7280",
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickCard: {
    minWidth: 96,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#f3f4f6",
  },
  quickLabel: {
    color: "#111827",
    fontWeight: "600",
    textAlign: "center",
  },
  feedRow: {
    gap: 4,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  feedTitle: {
    color: "#111827",
    fontWeight: "700",
  },
  feedBody: {
    color: "#4b5563",
    lineHeight: 20,
  },
});
