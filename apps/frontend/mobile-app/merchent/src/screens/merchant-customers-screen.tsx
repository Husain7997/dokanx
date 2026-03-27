import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { getMerchantCustomersRequest, searchMerchantCustomersRequest } from "../lib/api-client";
import { useMerchantAuthStore } from "../store/auth-store";
import { MerchantTopNav } from "./merchant-top-nav";

type MerchantCustomer = {
  id: string;
  globalCustomerId: string;
  name: string;
  phone: string;
  orders: number;
  spend: number;
  due: number;
  followUpTone: "LOW" | "MEDIUM" | "HIGH";
  followUpNote: string;
};

function getFollowUp(customer: { due: number; orders: number; spend: number }) {
  if (customer.due >= 5000 || (customer.due > 0 && customer.orders >= 5)) {
    return { followUpTone: "HIGH", followUpNote: "High-priority recovery customer." } as const;
  }
  if (customer.due > 0) {
    return { followUpTone: "MEDIUM", followUpNote: "Send reminder and monitor repayment." } as const;
  }
  return { followUpTone: "LOW", followUpNote: "Healthy customer relationship." } as const;
}

function getToneStyle(level: "LOW" | "MEDIUM" | "HIGH") {
  if (level === "HIGH") return { bg: "#fee2e2", fg: "#991b1b" };
  if (level === "MEDIUM") return { bg: "#fef3c7", fg: "#92400e" };
  return { bg: "#dcfce7", fg: "#166534" };
}

function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

function formatMoney(value: number) {
  return `${Number(value || 0).toFixed(2)} BDT`;
}

export function MerchantCustomersScreen() {
  const accessToken = useMerchantAuthStore((state) => state.accessToken);
  const [customers, setCustomers] = useState<MerchantCustomer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<"DUE" | "SPEND" | "ORDERS">("DUE");
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(() => customers.reduce((summary, customer) => {
    summary.totalCustomers += 1;
    summary.totalDue += customer.due;
    if (customer.due > 0) summary.customersWithDue += 1;
    if (customer.followUpTone === "HIGH") summary.highPriority += 1;
    return summary;
  }, { totalCustomers: 0, totalDue: 0, customersWithDue: 0, highPriority: 0 }), [customers]);

  const loadCustomers = useCallback(async () => {
    if (!accessToken) {
      setCustomers([]);
      setIsLoading(false);
      setError("Merchant session missing. Please sign in again.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = searchQuery.trim() ? await searchMerchantCustomersRequest(accessToken, searchQuery.trim()) : await getMerchantCustomersRequest(accessToken);
      const rows = (response.data || []).map((row) => {
        const base = {
          id: String(row._id || row.globalCustomerId || ""),
          globalCustomerId: String(row.globalCustomerId || row._id || ""),
          name: String(row.name || row.email || "Customer"),
          phone: String(row.phone || row.email || ""),
          orders: Number(row.orderCount || 0),
          spend: Number(row.totalSpend || 0),
          due: Number(row.totalDue || 0),
        };
        return { ...base, ...getFollowUp(base) };
      }).filter((row) => row.id);
      rows.sort((a, b) => sortMode === "SPEND" ? b.spend - a.spend : sortMode === "ORDERS" ? b.orders - a.orders : b.due - a.due);
      setCustomers(rows);
      setStatus(`Loaded ${rows.length} customer records.`);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load merchant customers.");
      setCustomers([]);
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, searchQuery, sortMode]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  async function openSms(customer: MerchantCustomer) {
    const phone = normalizePhone(customer.phone);
    if (!phone) return;
    const message = customer.due > 0
      ? `Assalamu alaikum ${customer.name}, your current due is ${customer.due} BDT. Please settle soon. (${customer.followUpNote})`
      : `Assalamu alaikum ${customer.name}, thank you for your recent orders.`;
    await Linking.openURL(`sms:${phone}?body=${encodeURIComponent(message)}`);
  }

  async function openWhatsApp(customer: MerchantCustomer) {
    const phone = normalizePhone(customer.phone).replace(/^\+/, "");
    if (!phone) return;
    const message = customer.due > 0
      ? `Assalamu alaikum ${customer.name}, your current due is ${customer.due} BDT. Please settle soon. (${customer.followUpNote})`
      : `Assalamu alaikum ${customer.name}, thank you for your recent orders.`;
    await Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`);
  }

  async function callCustomer(customer: MerchantCustomer) {
    const phone = normalizePhone(customer.phone);
    if (!phone) return;
    await Linking.openURL(`tel:${phone}`);
  }

  const dueQueue = useMemo(() => customers.filter((customer) => customer.due > 0).slice(0, 5), [customers]);

  return (
    <View style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <MerchantTopNav active="Customers" />
        <View style={styles.headerRow}>
          <Text style={styles.title}>Customers</Text>
          <Pressable style={styles.refreshButton} onPress={() => void loadCustomers()}><Text style={styles.refreshButtonText}>{isLoading ? "Refreshing..." : "Refresh"}</Text></Pressable>
        </View>
        <TextInput style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} placeholder="Search customer / phone / due" placeholderTextColor="#6b7280" />
        <View style={styles.sortRow}>
          {(["DUE", "SPEND", "ORDERS"] as const).map((item) => (
            <Pressable key={item} style={[styles.sortPill, sortMode === item ? styles.sortPillActive : null]} onPress={() => setSortMode(item)}>
              <Text style={[styles.sortText, sortMode === item ? styles.sortTextActive : null]}>{item}</Text>
            </Pressable>
          ))}
        </View>
        {error ? <View style={styles.alertError}><Text style={styles.alertTitle}>Customer data unavailable</Text><Text style={styles.alertBody}>{error}</Text></View> : null}
        {status ? <View style={styles.alertInfo}><Text style={styles.alertBody}>{status}</Text></View> : null}

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Customers</Text><Text style={styles.summaryValue}>{totals.totalCustomers}</Text></View>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Outstanding due</Text><Text style={styles.summaryValue}>{formatMoney(totals.totalDue)}</Text></View>
          <View style={styles.summaryCardWide}><Text style={styles.summaryLabel}>High priority follow-up</Text><Text style={styles.summaryValue}>{totals.highPriority}</Text></View>
        </View>

        <View style={styles.queueCard}>
          <Text style={styles.queueTitle}>Due queue</Text>
          <Text style={styles.queueHint}>বাকি বেশি যাদের, তাদের আগে follow-up করার জন্য এই queue।</Text>
          {dueQueue.map((customer) => (
            <View key={`queue-${customer.id}`} style={styles.queueRow}>
              <View style={styles.queueMeta}>
                <Text style={styles.queueName}>{customer.name}</Text>
                <Text style={styles.queueSub}>{customer.phone || customer.globalCustomerId.slice(-6)}</Text>
              </View>
              <Text style={styles.queueDue}>{formatMoney(customer.due)}</Text>
            </View>
          ))}
          {!dueQueue.length ? <Text style={styles.emptyText}>No due queue right now.</Text> : null}
        </View>

        {customers.map((customer) => (
          <View key={customer.id} style={styles.card}>
            <View style={styles.leftBlock}>
              <Text style={styles.cardTitle}>{customer.name}</Text>
              <Text style={styles.cardSubtitle}>{customer.phone || "No phone on file"}</Text>
              <Text style={styles.cardMeta}>Customer ID {customer.globalCustomerId.slice(-6)}</Text>
              <Text style={[styles.followUpBadge, { backgroundColor: getToneStyle(customer.followUpTone).bg, color: getToneStyle(customer.followUpTone).fg }]}>{customer.followUpTone} FOLLOW-UP</Text>
            </View>
            <View style={styles.rightBlock}>
              <Text style={styles.cardMetric}>{customer.orders} orders</Text>
              <Text style={styles.cardMetric}>{formatMoney(customer.spend)} spent</Text>
              <Text style={customer.due > 0 ? styles.cardDue : styles.cardClear}>{customer.due > 0 ? `Due ${formatMoney(customer.due)}` : "No outstanding due"}</Text>
              <Text style={styles.followUpNote}>{customer.followUpNote}</Text>
            </View>
            <View style={styles.actionRow}>
              <Pressable style={styles.actionButton} onPress={() => void callCustomer(customer)} disabled={!customer.phone}><Text style={styles.actionText}>Call</Text></Pressable>
              <Pressable style={styles.actionButton} onPress={() => void openSms(customer)} disabled={!customer.phone}><Text style={styles.actionText}>SMS</Text></Pressable>
              <Pressable style={styles.actionButton} onPress={() => void openWhatsApp(customer)} disabled={!customer.phone}><Text style={styles.actionText}>WhatsApp</Text></Pressable>
            </View>
          </View>
        ))}
        {!customers.length && !error ? <Text style={styles.emptyText}>No merchant customers returned from the backend.</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8f4ef" },
  container: { padding: 16, gap: 12, paddingBottom: 118 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "700", color: "#111827" },
  refreshButton: { backgroundColor: "#fff7ed", borderRadius: 10, borderWidth: 1, borderColor: "#fed7aa", paddingHorizontal: 12, paddingVertical: 8 },
  refreshButtonText: { fontSize: 12, fontWeight: "600", color: "#9a3412" },
  searchInput: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#ffffff", color: "#111827" },
  sortRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sortPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "#d1d5db", backgroundColor: "#ffffff" },
  sortPillActive: { backgroundColor: "#111827", borderColor: "#111827" },
  sortText: { fontSize: 12, fontWeight: "600", color: "#111827" },
  sortTextActive: { color: "#ffffff" },
  alertError: { backgroundColor: "#fef2f2", borderColor: "#fecaca", borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  alertInfo: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe", borderWidth: 1, borderRadius: 14, padding: 14 },
  alertTitle: { fontSize: 13, fontWeight: "700", color: "#991b1b" },
  alertBody: { fontSize: 12, color: "#374151" },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  summaryCard: { width: "48%", backgroundColor: "#ffffff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#e5e7eb", gap: 6 },
  summaryCardWide: { width: "100%", backgroundColor: "#ffffff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#e5e7eb", gap: 6 },
  summaryLabel: { fontSize: 11, color: "#6b7280", textTransform: "uppercase" },
  summaryValue: { fontSize: 18, fontWeight: "700", color: "#111827" },
  queueCard: { backgroundColor: "#fff7ed", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#fed7aa", gap: 8 },
  queueTitle: { fontSize: 14, fontWeight: "700", color: "#9a3412" },
  queueHint: { fontSize: 11, color: "#9a3412" },
  queueRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#ffedd5" },
  queueMeta: { flex: 1, gap: 2 },
  queueName: { fontSize: 12, fontWeight: "700", color: "#111827" },
  queueSub: { fontSize: 11, color: "#6b7280" },
  queueDue: { fontSize: 12, fontWeight: "700", color: "#9a3412" },
  card: { backgroundColor: "#ffffff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#e5e7eb", gap: 10 },
  leftBlock: { gap: 4 },
  rightBlock: { gap: 4 },
  cardTitle: { fontSize: 14, fontWeight: "600", color: "#111827" },
  cardSubtitle: { fontSize: 12, color: "#6b7280" },
  cardMeta: { fontSize: 11, color: "#9ca3af" },
  followUpBadge: { alignSelf: "flex-start", fontSize: 10, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, overflow: "hidden" },
  followUpNote: { fontSize: 11, color: "#92400e" },
  cardMetric: { fontSize: 12, color: "#374151" },
  cardDue: { fontSize: 12, fontWeight: "700", color: "#92400e" },
  cardClear: { fontSize: 12, fontWeight: "700", color: "#166534" },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionButton: { backgroundColor: "#111827", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  actionText: { fontSize: 11, fontWeight: "700", color: "#ffffff" },
  emptyText: { fontSize: 12, color: "#6b7280", textAlign: "center", paddingVertical: 20 },
});


