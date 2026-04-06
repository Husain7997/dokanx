import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import {
  blockMerchantCustomerRequest,
  createMerchantCustomerComplaintRequest,
  getMerchantCustomersRequest,
  listMerchantCustomerComplaintsRequest,
  searchMerchantCustomersRequest,
  unblockMerchantCustomerRequest,
  updateMerchantCustomerComplaintRequest,
} from "../lib/api-client";
import { useMerchantAuthStore } from "../store/auth-store";
import { DokanXLogo } from "../components/dokanx-logo";
import { MerchantTopNav } from "./merchant-top-nav";

type MerchantCustomer = {
  id: string;
  globalCustomerId: string;
  name: string;
  phone: string;
  orders: number;
  spend: number;
  due: number;
  isBlocked: boolean;
  followUpTone: "LOW" | "MEDIUM" | "HIGH";
  followUpNote: string;
};

type Complaint = {
  id: string;
  customerId: string;
  title: string;
  detail: string;
  status: string;
  createdAt: string;
};

function getFollowUp(customer: { due: number; orders: number; spend: number }) {
  if (customer.due >= 5000 || (customer.due > 0 && customer.orders >= 5)) return { followUpTone: "HIGH" as const, followUpNote: "High-priority recovery customer." };
  if (customer.due > 0) return { followUpTone: "MEDIUM" as const, followUpNote: "Send reminder and monitor repayment." };
  return { followUpTone: "LOW" as const, followUpNote: "Healthy customer relationship." };
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
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<"DUE" | "SPEND" | "ORDERS">("DUE");
  const [complaintTitleByCustomer, setComplaintTitleByCustomer] = useState<Record<string, string>>({});
  const [complaintDetailByCustomer, setComplaintDetailByCustomer] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(() => customers.reduce((summary, customer) => {
    summary.totalCustomers += 1;
    summary.totalDue += customer.due;
    if (customer.followUpTone === "HIGH") summary.highPriority += 1;
    if (customer.isBlocked) summary.blocked += 1;
    return summary;
  }, { totalCustomers: 0, totalDue: 0, highPriority: 0, blocked: 0 }), [customers]);

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
      const [response, complaintResponse] = await Promise.all([
        searchQuery.trim() ? searchMerchantCustomersRequest(accessToken, searchQuery.trim()) : getMerchantCustomersRequest(accessToken),
        listMerchantCustomerComplaintsRequest(accessToken),
      ]);
      const rows = (response.data || []).map((row) => {
        const base = {
          id: String(row._id || row.globalCustomerId || ""),
          globalCustomerId: String(row.globalCustomerId || row._id || ""),
          name: String(row.name || row.email || "Customer"),
          phone: String(row.phone || row.email || ""),
          orders: Number(row.orderCount || 0),
          spend: Number(row.totalSpend || 0),
          due: Number(row.totalDue || 0),
          isBlocked: Boolean((row as { isBlocked?: boolean }).isBlocked),
        };
        return { ...base, ...getFollowUp(base) };
      }).filter((row) => row.id);
      rows.sort((a, b) => sortMode === "SPEND" ? b.spend - a.spend : sortMode === "ORDERS" ? b.orders - a.orders : b.due - a.due);
      setCustomers(rows);
      setComplaints((complaintResponse.data || []).map((row) => ({ id: String(row._id || ""), customerId: String(row.customerId || ""), title: String(row.title || "Complaint"), detail: String(row.detail || ""), status: String(row.status || "OPEN"), createdAt: String(row.createdAt || "") })).filter((row) => row.id));
      setStatus(`Loaded ${rows.length} customer records.`);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load merchant customers.");
      setCustomers([]);
      setComplaints([]);
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
    const message = customer.due > 0 ? `Assalamu alaikum ${customer.name}, your current due is ${customer.due} BDT. Please settle soon. (${customer.followUpNote})` : `Assalamu alaikum ${customer.name}, thank you for your recent orders.`;
    await Linking.openURL(`sms:${phone}?body=${encodeURIComponent(message)}`);
  }

  async function openWhatsApp(customer: MerchantCustomer) {
    const phone = normalizePhone(customer.phone).replace(/^\+/, "");
    if (!phone) return;
    const message = customer.due > 0 ? `Assalamu alaikum ${customer.name}, your current due is ${customer.due} BDT. Please settle soon. (${customer.followUpNote})` : `Assalamu alaikum ${customer.name}, thank you for your recent orders.`;
    await Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`);
  }

  async function callCustomer(customer: MerchantCustomer) {
    const phone = normalizePhone(customer.phone);
    if (!phone) return;
    await Linking.openURL(`tel:${phone}`);
  }

  async function handleBlockToggle(customer: MerchantCustomer) {
    if (!accessToken) return;
    try {
      if (customer.isBlocked) {
        await unblockMerchantCustomerRequest(accessToken, customer.id);
        setStatus(`${customer.name} unblocked and reloaded.`);
      } else {
        await blockMerchantCustomerRequest(accessToken, customer.id);
        setStatus(`${customer.name} blocked and reloaded.`);
      }
      await loadCustomers();
    } catch (blockError) {
      setError(blockError instanceof Error ? blockError.message : "Unable to update customer block status.");
    }
  }

  async function handleComplaint(customer: MerchantCustomer) {
    if (!accessToken) return;
    const title = String(complaintTitleByCustomer[customer.id] || "").trim();
    if (!title) {
      setError("Complaint title is required.");
      return;
    }
    try {
      await createMerchantCustomerComplaintRequest(accessToken, {
        customerId: customer.id,
        globalCustomerId: customer.globalCustomerId,
        title,
        detail: String(complaintDetailByCustomer[customer.id] || "").trim(),
        channel: "STORE",
      });
      setComplaintTitleByCustomer((current) => ({ ...current, [customer.id]: "" }));
      setComplaintDetailByCustomer((current) => ({ ...current, [customer.id]: "" }));
      setStatus(`Complaint saved for ${customer.name}.`);
      await loadCustomers();
    } catch (complaintError) {
      setError(complaintError instanceof Error ? complaintError.message : "Unable to save complaint.");
    }
  }

  async function handleResolveComplaint(complaintId: string) {
    if (!accessToken) return;
    try {
      await updateMerchantCustomerComplaintRequest(accessToken, complaintId, { status: "RESOLVED" });
      setStatus("Complaint marked resolved.");
      await loadCustomers();
    } catch (complaintError) {
      setError(complaintError instanceof Error ? complaintError.message : "Unable to update complaint.");
    }
  }

  const dueQueue = useMemo(() => customers.filter((customer) => customer.due > 0).slice(0, 5), [customers]);

  return (
    <View style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <MerchantTopNav active="Customers" />
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroBrandWrap}>
              <DokanXLogo variant="icon" size="sm" />
              <View style={styles.heroBrandCopy}>
                <Text style={styles.heroEyebrow}>Customer operations</Text>
                <Text style={styles.title}>Customers</Text>
              </View>
            </View>
            <Pressable style={styles.heroRefreshButton} onPress={() => void loadCustomers()}><Text style={styles.heroRefreshText}>{isLoading ? "Refreshing..." : "Refresh"}</Text></Pressable>
          </View>
          <Text style={styles.heroSubtitle}>Manage due recovery, contact touchpoints, block decisions, and complaint follow-up from one queue.</Text>
          <View style={styles.heroMetrics}>
            <View style={styles.heroMetricCard}><Text style={styles.heroMetricLabel}>Total</Text><Text style={styles.heroMetricValue}>{totals.totalCustomers}</Text></View>
            <View style={styles.heroMetricCard}><Text style={styles.heroMetricLabel}>Due queue</Text><Text style={styles.heroMetricValue}>{dueQueue.length}</Text></View>
            <View style={styles.heroMetricCard}><Text style={styles.heroMetricLabel}>Blocked</Text><Text style={styles.heroMetricValue}>{totals.blocked}</Text></View>
          </View>
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
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Blocked</Text><Text style={styles.summaryValue}>{totals.blocked}</Text></View>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>High priority</Text><Text style={styles.summaryValue}>{totals.highPriority}</Text></View>
        </View>

        <View style={styles.queueCard}>
          <Text style={styles.queueTitle}>Due queue</Text>
          <Text style={styles.queueHint}>Customers with active dues appear here first so the team can follow up quickly.</Text>
          {dueQueue.map((customer) => (
            <View key={`queue-${customer.id}`} style={styles.queueRow}>
              <View style={styles.queueMeta}>
                <Text style={styles.queueName}>{customer.name}</Text>
                <Text style={styles.queueSub}>{customer.phone || customer.globalCustomerId.slice(-6)}</Text>
              </View>
              <Text style={styles.queueDue}>{formatMoney(customer.due)}</Text>
            </View>
          ))}
          {!dueQueue.length ? <Text style={styles.emptyText}>No customers need collection follow-up right now.</Text> : null}
        </View>

        {customers.map((customer) => {
          const recentComplaint = complaints.find((item) => item.customerId === customer.id || item.customerId === customer.globalCustomerId);
          return (
            <View key={customer.id} style={styles.card}>
              <View style={styles.leftBlock}>
                <Text style={styles.cardTitle}>{customer.name}</Text>
                <Text style={styles.cardSubtitle}>{customer.phone || "No phone on file"}</Text>
                <Text style={styles.cardMeta}>Customer ID {customer.globalCustomerId.slice(-6)}</Text>
                <Text style={[styles.followUpBadge, { backgroundColor: getToneStyle(customer.followUpTone).bg, color: getToneStyle(customer.followUpTone).fg }]}>{customer.followUpTone} FOLLOW-UP</Text>
                <Text style={[styles.blockBadge, customer.isBlocked ? styles.blockBadgeOn : styles.blockBadgeOff]}>{customer.isBlocked ? "Blocked" : "Active"}</Text>
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
                <Pressable style={styles.secondaryActionButton} onPress={() => void handleBlockToggle(customer)}><Text style={styles.secondaryActionText}>{customer.isBlocked ? "Unblock" : "Block"}</Text></Pressable>
              </View>
              <View style={styles.complaintCard}>
                <Text style={styles.complaintTitle}>Customer complaint desk</Text>
                <TextInput style={styles.searchInput} value={complaintTitleByCustomer[customer.id] || ""} onChangeText={(value) => setComplaintTitleByCustomer((current) => ({ ...current, [customer.id]: value }))} placeholder="Complaint title" placeholderTextColor="#6b7280" />
                <TextInput style={[styles.searchInput, styles.complaintInput]} value={complaintDetailByCustomer[customer.id] || ""} onChangeText={(value) => setComplaintDetailByCustomer((current) => ({ ...current, [customer.id]: value }))} placeholder="Complaint details" placeholderTextColor="#6b7280" multiline />
                <View style={styles.actionRow}>
                  <Pressable style={styles.secondaryActionButton} onPress={() => void handleComplaint(customer)}><Text style={styles.secondaryActionText}>Save complaint</Text></Pressable>
                  {recentComplaint && String(recentComplaint.status).toUpperCase() !== "RESOLVED" ? <Pressable style={styles.secondaryActionButton} onPress={() => void handleResolveComplaint(recentComplaint.id)}><Text style={styles.secondaryActionText}>Resolve last</Text></Pressable> : null}
                </View>
                {recentComplaint ? <Text style={styles.complaintMeta}>Latest complaint: {recentComplaint.title} · {recentComplaint.status}</Text> : <Text style={styles.complaintMeta}>No complaint has been logged for this customer yet.</Text>}
              </View>
            </View>
          );
        })}
        {!customers.length && !error ? <Text style={styles.emptyText}>No merchant customers returned from the backend.</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8f4ef" },
  container: { padding: 16, gap: 12, paddingBottom: 118 },
  heroCard: { backgroundColor: "#0B1E3C", borderRadius: 24, padding: 18, gap: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  heroBrandWrap: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  heroBrandCopy: { flex: 1, gap: 3 },
  heroEyebrow: { color: "#ffd49f", fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  heroSubtitle: { fontSize: 12, color: "#dbe7fb", lineHeight: 18 },
  heroRefreshButton: { borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", backgroundColor: "rgba(255,255,255,0.08)", paddingHorizontal: 12, paddingVertical: 8 },
  heroRefreshText: { fontSize: 12, fontWeight: "700", color: "#ffffff" },
  heroMetrics: { flexDirection: "row", gap: 8 },
  heroMetricCard: { flex: 1, borderRadius: 14, padding: 12, backgroundColor: "rgba(255,255,255,0.08)", gap: 4 },
  heroMetricLabel: { color: "#bfd2f2", fontSize: 11, fontWeight: "600" },
  heroMetricValue: { color: "#ffffff", fontSize: 16, fontWeight: "800" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "700", color: "#111827" },
  refreshButton: { backgroundColor: "#fff7ed", borderRadius: 10, borderWidth: 1, borderColor: "#fed7aa", paddingHorizontal: 12, paddingVertical: 8 },
  refreshButtonText: { fontSize: 12, fontWeight: "600", color: "#9a3412" },
  searchInput: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#ffffff", color: "#111827" },
  complaintInput: { minHeight: 78, textAlignVertical: "top" },
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
  blockBadge: { alignSelf: "flex-start", fontSize: 10, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, overflow: "hidden" },
  blockBadgeOn: { backgroundColor: "#111827", color: "#ffffff" },
  blockBadgeOff: { backgroundColor: "#e0f2fe", color: "#0369a1" },
  followUpNote: { fontSize: 11, color: "#92400e" },
  cardMetric: { fontSize: 12, color: "#374151" },
  cardDue: { fontSize: 12, fontWeight: "700", color: "#92400e" },
  cardClear: { fontSize: 12, fontWeight: "700", color: "#166534" },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionButton: { backgroundColor: "#111827", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  actionText: { fontSize: 11, fontWeight: "700", color: "#ffffff" },
  secondaryActionButton: { backgroundColor: "#fff7ed", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "#fed7aa" },
  secondaryActionText: { fontSize: 11, fontWeight: "700", color: "#9a3412" },
  complaintCard: { backgroundColor: "#f8fafc", borderRadius: 14, borderWidth: 1, borderColor: "#e5e7eb", padding: 12, gap: 8 },
  complaintTitle: { fontSize: 12, fontWeight: "700", color: "#111827" },
  complaintMeta: { fontSize: 11, color: "#6b7280" },
  emptyText: { fontSize: 12, color: "#6b7280", textAlign: "center", paddingVertical: 20 },
});





