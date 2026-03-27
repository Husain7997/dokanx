import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { getMerchantCreditCustomersRequest, payMerchantCreditDueRequest } from "../lib/api-client";
import { useMerchantAuthStore } from "../store/auth-store";
import { MerchantTopNav } from "./merchant-top-nav";

type CreditCustomer = {
  customerId: string;
  outstandingBalance: number;
  creditLimit: number;
  availableCredit: number;
  status: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  riskNote: string;
  recommendation: "APPROVE" | "LIMIT" | "CASH_ONLY";
  recommendationNote: string;
  paymentHistory: Array<{
    id: string;
    type: string;
    amount: number;
    status: string;
    reference: string;
    createdAt: string;
  }>;
};

function getRiskProfile(outstandingBalance: number, creditLimit: number, paymentHistory: Array<{ status: string; amount: number }>) {
  const utilization = creditLimit > 0 ? outstandingBalance / creditLimit : 0;
  const pendingCount = paymentHistory.filter((entry) => String(entry.status || "").toUpperCase() === "PENDING").length;
  const failedCount = paymentHistory.filter((entry) => String(entry.status || "").toUpperCase() === "FAILED").length;
  if (outstandingBalance > 0 && (utilization >= 0.85 || failedCount > 0)) {
    return { riskLevel: "HIGH" as const, riskNote: "High due pressure or failed repayments detected." };
  }
  if (utilization >= 0.55 || pendingCount > 0) {
    return { riskLevel: "MEDIUM" as const, riskNote: "Monitor repayment behaviour before extending more credit." };
  }
  return { riskLevel: "LOW" as const, riskNote: "Healthy credit behaviour so far." };
}

function getCreditRecommendation(outstandingBalance: number, creditLimit: number, availableCredit: number, riskLevel: "LOW" | "MEDIUM" | "HIGH") {
  const utilization = creditLimit > 0 ? outstandingBalance / creditLimit : 0;
  if (riskLevel === "HIGH" || availableCredit <= 0 || utilization >= 0.9) {
    return { recommendation: "CASH_ONLY" as const, recommendationNote: "Cash only recommended until dues improve." };
  }
  if (riskLevel === "MEDIUM" || utilization >= 0.6) {
    return { recommendation: "LIMIT" as const, recommendationNote: "Limit the sale amount or take partial upfront payment." };
  }
  return { recommendation: "APPROVE" as const, recommendationNote: "Credit can be considered within the available limit." };
}

function getRiskTone(level: "LOW" | "MEDIUM" | "HIGH") {
  if (level === "HIGH") return { bg: "#fee2e2", fg: "#991b1b" };
  if (level === "MEDIUM") return { bg: "#fef3c7", fg: "#92400e" };
  return { bg: "#dcfce7", fg: "#166534" };
}

function formatMoney(value: number) {
  return `${Number(value || 0).toFixed(2)} BDT`;
}

export function MerchantCreditScreen() {
  const accessToken = useMerchantAuthStore((state) => state.accessToken);
  const [customers, setCustomers] = useState<CreditCustomer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [amountByCustomer, setAmountByCustomer] = useState<Record<string, string>>({});

  const loadCredit = useCallback(async () => {
    if (!accessToken) {
      setCustomers([]);
      setError("Merchant session missing. Please sign in again.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await getMerchantCreditCustomersRequest(accessToken);
      const rows = (response.data || []).map((row) => {
        const paymentHistory = (row.paymentHistory || []).map((entry) => ({
          id: String(entry._id || `${entry.reference || "payment"}-${entry.createdAt || ""}`),
          type: String(entry.type || "ENTRY"),
          amount: Number(entry.amount || 0),
          status: String(entry.status || "POSTED"),
          reference: String(entry.reference || "credit"),
          createdAt: String(entry.createdAt || ""),
        }));
        const outstandingBalance = Number(row.outstandingBalance || 0);
        const creditLimit = Number(row.creditLimit || 0);
        const availableCredit = Number(row.availableCredit || 0);
        const risk = getRiskProfile(outstandingBalance, creditLimit, paymentHistory);
        const recommendation = getCreditRecommendation(outstandingBalance, creditLimit, availableCredit, risk.riskLevel);
        return {
          customerId: String(row.customerId || ""),
          outstandingBalance,
          creditLimit,
          availableCredit,
          status: String(row.status || "ACTIVE"),
          riskLevel: risk.riskLevel,
          riskNote: risk.riskNote,
          recommendation: recommendation.recommendation,
          recommendationNote: recommendation.recommendationNote,
          paymentHistory,
        };
      }).filter((row) => row.customerId);
      rows.sort((a, b) => b.outstandingBalance - a.outstandingBalance);
      setCustomers(rows);
      setStatus(`Loaded ${rows.length} live credit customer accounts.`);
    } catch (loadError) {
      setCustomers([]);
      setError(loadError instanceof Error ? loadError.message : "Unable to load merchant credit accounts.");
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadCredit();
  }, [loadCredit]);

  const totals = useMemo(
    () => customers.reduce((acc, customer) => {
      acc.outstanding += customer.outstandingBalance;
      if (customer.riskLevel === "HIGH") acc.highRisk += 1;
      if (customer.riskLevel === "MEDIUM") acc.mediumRisk += 1;
      if (customer.outstandingBalance > 0) acc.activeCollections += 1;
      return acc;
    }, { outstanding: 0, highRisk: 0, mediumRisk: 0, activeCollections: 0 }),
    [customers],
  );

  const filteredCustomers = useMemo(() => customers.filter((customer) => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return true;
    return [customer.customerId, customer.status, customer.riskLevel, customer.recommendation].some((value) => String(value || "").toLowerCase().includes(needle));
  }), [customers, searchQuery]);

  const collectionQueue = useMemo(() => filteredCustomers.filter((customer) => customer.outstandingBalance > 0).slice(0, 5), [filteredCustomers]);

  async function handleRepayment(customerId: string, paymentMode: "ONLINE" | "WALLET") {
    if (!accessToken) return;
    const amount = Number(amountByCustomer[customerId] || 0);
    if (amount <= 0) {
      setError("Repayment amount must be greater than zero.");
      return;
    }
    setError(null);
    try {
      await payMerchantCreditDueRequest(accessToken, {
        customerId,
        amount,
        referenceId: `merchant-credit-${customerId}-${Date.now()}`,
        paymentMode,
        metadata: { source: "merchant_credit_screen" },
      });
      setStatus(paymentMode === "ONLINE"
        ? `Online repayment for customer ${customerId.slice(-6)} recorded as pending. Final paid state must come from webhook confirmation.`
        : `Wallet repayment for customer ${customerId.slice(-6)} confirmed and reloaded from backend.`);
      await loadCredit();
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : "Unable to record credit repayment.");
    }
  }

  return (
    <View style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <MerchantTopNav active="Credit" />
        <View style={styles.headerRow}>
          <Text style={styles.title}>Credit</Text>
          <Pressable style={styles.refreshButton} onPress={() => void loadCredit()}><Text style={styles.refreshButtonText}>{isLoading ? "Refreshing..." : "Refresh"}</Text></Pressable>
        </View>
        <Text style={styles.helperText}>Customer dues and repayment history are live. Online repayment stays pending until webhook confirmation.</Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Total due</Text><Text style={styles.summaryValue}>{formatMoney(totals.outstanding)}</Text><Text style={styles.summaryMeta}>Across all customers</Text></View>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>High risk</Text><Text style={styles.summaryValue}>{totals.highRisk}</Text><Text style={styles.summaryMeta}>Need follow-up</Text></View>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Collections</Text><Text style={styles.summaryValue}>{totals.activeCollections}</Text><Text style={styles.summaryMeta}>Customers with due</Text></View>
        </View>

        <View style={styles.queueCard}>
          <Text style={styles.queueTitle}>Collection queue</Text>
          <Text style={styles.queueHint}>Highest due customers are shown first for faster collection follow-up.</Text>
          {collectionQueue.map((customer) => (
            <View key={`queue-${customer.customerId}`} style={styles.queueRow}>
              <View style={styles.queueMeta}>
                <Text style={styles.queueName}>Customer {customer.customerId.slice(-6)}</Text>
                <Text style={styles.queueSub}>{customer.riskLevel} risk · limit {formatMoney(customer.creditLimit)}</Text>
              </View>
              <Text style={styles.queueDue}>{formatMoney(customer.outstandingBalance)}</Text>
            </View>
          ))}
          {!collectionQueue.length ? <Text style={styles.historyMeta}>No active collection queue right now.</Text> : null}
        </View>

        <TextInput style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} placeholder="Search customer / risk / status" placeholderTextColor="#6b7280" />
        {error ? <View style={styles.alertError}><Text style={styles.alertTitle}>Credit action unavailable</Text><Text style={styles.alertBody}>{error}</Text></View> : null}
        {status ? <View style={styles.alertInfo}><Text style={styles.alertBody}>{status}</Text></View> : null}

        {filteredCustomers.map((customer) => {
          const lastPayment = customer.paymentHistory[0] || null;
          return (
            <View key={customer.customerId} style={styles.card}>
              <Text style={styles.cardTitle}>Customer {customer.customerId.slice(-6)}</Text>
              <Text style={styles.cardMetric}>Outstanding {formatMoney(customer.outstandingBalance)}</Text>
              <Text style={styles.cardMetric}>Limit {formatMoney(customer.creditLimit)} | Available {formatMoney(customer.availableCredit)}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.cardMeta}>Status {customer.status}</Text>
                <Text style={[styles.riskBadge, { backgroundColor: getRiskTone(customer.riskLevel).bg, color: getRiskTone(customer.riskLevel).fg }]}>{customer.riskLevel} RISK</Text>
              </View>
              <Text style={styles.riskNote}>{customer.riskNote}</Text>
              {lastPayment ? <Text style={styles.lastPayment}>Last payment: {formatMoney(lastPayment.amount)} · {lastPayment.status}</Text> : <Text style={styles.lastPayment}>No repayment history yet.</Text>}
              <View style={styles.recommendationCard}>
                <Text style={styles.recommendationLabel}>Decision support</Text>
                <Text style={styles.recommendationValue}>{customer.recommendation}</Text>
                <Text style={styles.recommendationNote}>{customer.recommendationNote}</Text>
              </View>
              <TextInput
                style={styles.input}
                value={amountByCustomer[customer.customerId] || ""}
                onChangeText={(value) => setAmountByCustomer((current) => ({ ...current, [customer.customerId]: value }))}
                placeholder="Repayment amount"
                keyboardType="numeric"
                placeholderTextColor="#6b7280"
              />
              <View style={styles.quickAmountRow}>
                {[200, 500, 1000].map((amount) => (
                  <Pressable key={`${customer.customerId}-${amount}`} style={styles.quickAmountChip} onPress={() => setAmountByCustomer((current) => ({ ...current, [customer.customerId]: String(amount) }))}>
                    <Text style={styles.quickAmountText}>{amount} BDT</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.actionRow}>
                <Pressable style={styles.primaryButton} onPress={() => void handleRepayment(customer.customerId, "ONLINE")}>
                  <Text style={styles.primaryButtonText}>Repay online</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => void handleRepayment(customer.customerId, "WALLET")}>
                  <Text style={styles.secondaryButtonText}>Repay via wallet</Text>
                </Pressable>
              </View>
              <Text style={styles.historyTitle}>Repayment history</Text>
              {customer.paymentHistory.slice(0, 6).map((entry) => (
                <View key={entry.id} style={styles.historyRow}>
                  <Text style={styles.historyText}>{entry.type} {formatMoney(entry.amount)}</Text>
                  <Text style={styles.historyMeta}>{entry.status} | {entry.reference}</Text>
                </View>
              ))}
              {!customer.paymentHistory.length ? <Text style={styles.historyMeta}>No repayment history yet.</Text> : null}
            </View>
          );
        })}

        {!filteredCustomers.length && !error ? <Text style={styles.emptyText}>No live credit customers returned for the current search.</Text> : null}
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
  helperText: { fontSize: 12, color: "#6b7280" },
  summaryRow: { flexDirection: "row", gap: 8 },
  summaryCard: { flex: 1, backgroundColor: "#ffffff", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "#e5e7eb", gap: 4 },
  summaryLabel: { fontSize: 11, color: "#6b7280", textTransform: "uppercase" },
  summaryValue: { fontSize: 18, fontWeight: "800", color: "#111827" },
  summaryMeta: { fontSize: 11, color: "#9a3412" },
  queueCard: { backgroundColor: "#fff7ed", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#fed7aa", gap: 8 },
  queueTitle: { fontSize: 14, fontWeight: "700", color: "#9a3412" },
  queueHint: { fontSize: 11, color: "#9a3412" },
  queueRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#ffedd5" },
  queueMeta: { flex: 1, gap: 2 },
  queueName: { fontSize: 12, fontWeight: "700", color: "#111827" },
  queueSub: { fontSize: 11, color: "#6b7280" },
  queueDue: { fontSize: 12, fontWeight: "700", color: "#9a3412" },
  searchInput: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#ffffff", color: "#111827" },
  alertError: { backgroundColor: "#fef2f2", borderColor: "#fecaca", borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  alertInfo: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe", borderWidth: 1, borderRadius: 14, padding: 14 },
  alertTitle: { fontSize: 13, fontWeight: "700", color: "#991b1b" },
  alertBody: { fontSize: 12, color: "#374151" },
  card: { backgroundColor: "#ffffff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#e5e7eb", gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  cardMetric: { fontSize: 12, color: "#374151" },
  cardMeta: { fontSize: 12, color: "#6b7280" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  riskBadge: { fontSize: 10, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, overflow: "hidden" },
  riskNote: { fontSize: 11, color: "#92400e" },
  lastPayment: { fontSize: 11, color: "#6b7280" },
  recommendationCard: { borderRadius: 12, backgroundColor: "#f8fafc", padding: 10, gap: 4, borderWidth: 1, borderColor: "#e5e7eb" },
  recommendationLabel: { fontSize: 11, fontWeight: "700", color: "#6b7280", textTransform: "uppercase" },
  recommendationValue: { fontSize: 12, fontWeight: "800", color: "#111827" },
  recommendationNote: { fontSize: 11, color: "#92400e" },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#ffffff", color: "#111827" },
  quickAmountRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickAmountChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, backgroundColor: "#f3f4f6" },
  quickAmountText: { fontSize: 11, fontWeight: "700", color: "#374151" },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  primaryButton: { backgroundColor: "#111827", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  primaryButtonText: { color: "#ffffff", fontSize: 12, fontWeight: "600" },
  secondaryButton: { backgroundColor: "#fff7ed", borderRadius: 10, borderWidth: 1, borderColor: "#fed7aa", paddingHorizontal: 12, paddingVertical: 10 },
  secondaryButtonText: { color: "#9a3412", fontSize: 12, fontWeight: "600" },
  historyTitle: { fontSize: 12, fontWeight: "700", color: "#111827", marginTop: 4 },
  historyRow: { gap: 2, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  historyText: { fontSize: 12, color: "#374151" },
  historyMeta: { fontSize: 11, color: "#9ca3af" },
  emptyText: { fontSize: 12, color: "#6b7280", textAlign: "center", paddingVertical: 20 },
});
