import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { getMerchantWalletLedgerRequest, getMerchantWalletSummaryRequest } from "../lib/api-client";
import { useMerchantAuthStore } from "../store/auth-store";
import { MerchantTopNav } from "./merchant-top-nav";

type LedgerRow = {
  id: string;
  type: string;
  walletType: string;
  amount: number;
  reference: string;
  createdAt: string;
};

const FILTERS = ["ALL", "CREDIT", "DEBIT", "TOPUP", "SALE", "TRANSFER"] as const;

function formatDateLabel(value: string) {
  return value ? value.slice(0, 10) : "Recent";
}

function groupLabel(value: string) {
  return formatDateLabel(value);
}

function getEntryTone(amount: number) {
  return amount >= 0
    ? { bg: "#dcfce7", fg: "#166534", sign: "+" }
    : { bg: "#fee2e2", fg: "#991b1b", sign: "-" };
}

function formatMoney(value: number) {
  return `${Math.abs(Number(value || 0)).toFixed(2)} BDT`;
}

export function MerchantWalletScreen() {
  const accessToken = useMerchantAuthStore((state) => state.accessToken);
  const [balance, setBalance] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [cashBalance, setCashBalance] = useState(0);
  const [creditBalance, setCreditBalance] = useState(0);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [filter, setFilter] = useState<typeof FILTERS[number]>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWallet = useCallback(async () => {
    if (!accessToken) {
      setError("Merchant session missing. Please sign in again.");
      setLedger([]);
      setBalance(0);
      setAvailableBalance(0);
      setCashBalance(0);
      setCreditBalance(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [summary, ledgerResponse] = await Promise.all([
        getMerchantWalletSummaryRequest(accessToken),
        getMerchantWalletLedgerRequest(accessToken, { limit: 40, type: filter, dateFrom: dateFrom.trim() || undefined, dateTo: dateTo.trim() || undefined }),
      ]);

      setBalance(Number(summary.data?.balance || 0));
      setAvailableBalance(Number(summary.data?.available_balance || 0));
      setCashBalance(Number(summary.data?.balances?.cash || 0));
      setCreditBalance(Number(summary.data?.balances?.credit || 0));
      setLedger((ledgerResponse.data || []).map((row) => ({
        id: String(row._id || ""),
        type: String(row.type || "ENTRY"),
        walletType: String(row.walletType || "MAIN"),
        amount: Number(row.amount || 0),
        reference: String(row.referenceId || row.reference || "wallet"),
        createdAt: String(row.createdAt || ""),
      })).filter((row) => row.id));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load wallet data.");
      setBalance(0);
      setAvailableBalance(0);
      setCashBalance(0);
      setCreditBalance(0);
      setLedger([]);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, dateFrom, dateTo, filter]);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  const summary = useMemo(() => ledger.reduce((acc, entry) => {
    if (entry.amount >= 0) acc.income += entry.amount;
    else acc.expense += Math.abs(entry.amount);
    return acc;
  }, { income: 0, expense: 0 }), [ledger]);

  const bookSummary = useMemo(() => ledger.reduce((acc, entry) => {
    const walletType = String(entry.walletType || "MAIN").toUpperCase();
    if (walletType === "CASH") acc.cash += entry.amount;
    if (walletType === "BANK") acc.bank += entry.amount;
    if (walletType === "CREDIT") acc.credit += entry.amount;
    return acc;
  }, { cash: 0, bank: 0, credit: 0 }), [ledger]);

  const groupedLedger = useMemo(() => ledger.reduce<Record<string, LedgerRow[]>>((acc, entry) => {
    const key = groupLabel(entry.createdAt);
    acc[key] = acc[key] || [];
    acc[key].push(entry);
    return acc;
  }, {}), [ledger]);

  return (
    <View style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <MerchantTopNav active="Wallet" />
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Wallet balance</Text>
          <Text style={styles.heroValue}>{formatMoney(balance)}</Text>
          <Text style={styles.heroHint}>Available {formatMoney(availableBalance)}</Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Cash</Text><Text style={styles.summaryValue}>{formatMoney(cashBalance)}</Text><Text style={styles.summaryMeta}>Ready to use</Text></View>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Credit</Text><Text style={styles.summaryValue}>{formatMoney(creditBalance)}</Text><Text style={styles.summaryMeta}>Held in credit</Text></View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Received</Text><Text style={styles.summaryValue}>{formatMoney(summary.income)}</Text><Text style={styles.summaryMeta}>Filtered ledger</Text></View>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Paid out</Text><Text style={styles.summaryValue}>{formatMoney(summary.expense)}</Text><Text style={styles.summaryMeta}>Filtered ledger</Text></View>
        </View>

        <View style={styles.daybookCard}>
          <Text style={styles.filterTitle}>Cashbook and bankbook</Text>
          <View style={styles.summaryRow}>
            <View style={styles.daybookMetric}><Text style={styles.summaryLabel}>Cash flow</Text><Text style={styles.summaryValue}>{bookSummary.cash >= 0 ? "+" : "-"}{formatMoney(bookSummary.cash)}</Text></View>
            <View style={styles.daybookMetric}><Text style={styles.summaryLabel}>Bank flow</Text><Text style={styles.summaryValue}>{bookSummary.bank >= 0 ? "+" : "-"}{formatMoney(bookSummary.bank)}</Text></View>
          </View>
          <Text style={styles.daybookHint}>এই view থেকে cashbook এবং bankbook আলাদা করে দেখা যায়।</Text>
        </View>

        <View style={styles.filterCard}>
          <Text style={styles.filterTitle}>Ledger filters</Text>
          <View style={styles.filterRow}>
            {FILTERS.map((item) => (
              <Pressable key={item} style={[styles.filterPill, filter === item ? styles.filterPillActive : null]} onPress={() => setFilter(item)}>
                <Text style={[styles.filterText, filter === item ? styles.filterTextActive : null]}>{item}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput style={styles.input} value={dateFrom} onChangeText={setDateFrom} placeholder="Date from YYYY-MM-DD" placeholderTextColor="#6b7280" autoCapitalize="none" />
          <TextInput style={styles.input} value={dateTo} onChangeText={setDateTo} placeholder="Date to YYYY-MM-DD" placeholderTextColor="#6b7280" autoCapitalize="none" />
          <Pressable style={styles.refreshButton} onPress={() => void loadWallet()}>
            <Text style={styles.refreshButtonText}>{isLoading ? "Refreshing..." : "Apply filters"}</Text>
          </Pressable>
        </View>

        {error ? <View style={styles.alertError}><Text style={styles.alertTitle}>Wallet unavailable</Text><Text style={styles.alertBody}>{error}</Text></View> : null}

        {Object.entries(groupedLedger).map(([group, entries]) => (
          <View key={group} style={styles.groupSection}>
            <Text style={styles.groupTitle}>{group}</Text>
            {entries.map((entry) => {
              const tone = getEntryTone(entry.amount);
              return (
                <View key={entry.id} style={styles.card}>
                  <View style={styles.leftBlock}>
                    <View style={styles.metaRow}>
                      <Text style={styles.cardTitle}>{entry.type}</Text>
                      <Text style={styles.walletTypeBadge}>{entry.walletType}</Text>
                    </View>
                    <Text style={styles.cardSubtitle}>{entry.reference}</Text>
                    <Text style={styles.cardMeta}>{entry.createdAt ? entry.createdAt.slice(0, 19).replace("T", " ") : ""}</Text>
                  </View>
                  <Text style={[styles.amount, { backgroundColor: tone.bg, color: tone.fg }]}>{tone.sign}{formatMoney(entry.amount)}</Text>
                </View>
              );
            })}
          </View>
        ))}

        {!ledger.length && !error ? <Text style={styles.emptyText}>No wallet ledger rows returned for the current filters.</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8f4ef" },
  container: { padding: 16, gap: 12, paddingBottom: 118 },
  hero: { backgroundColor: "#111827", borderRadius: 18, padding: 18, gap: 6 },
  heroLabel: { fontSize: 12, color: "#d1d5db", textTransform: "uppercase" },
  heroValue: { fontSize: 24, fontWeight: "700", color: "#ffffff" },
  heroHint: { fontSize: 12, color: "#d1d5db" },
  summaryRow: { flexDirection: "row", gap: 10 },
  summaryCard: { flex: 1, backgroundColor: "#ffffff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#e5e7eb", gap: 6 },
  summaryLabel: { fontSize: 11, color: "#6b7280", textTransform: "uppercase" },
  summaryValue: { fontSize: 18, fontWeight: "700", color: "#111827" },
  summaryMeta: { fontSize: 11, color: "#9a3412" },
  daybookCard: { backgroundColor: "#fff7ed", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#fed7aa", gap: 10 },
  daybookMetric: { flex: 1, backgroundColor: "#ffffff", borderRadius: 12, padding: 12, gap: 4 },
  daybookHint: { fontSize: 11, color: "#9a3412" },
  filterCard: { backgroundColor: "#ffffff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#e5e7eb", gap: 10 },
  filterTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "#d1d5db", backgroundColor: "#ffffff" },
  filterPillActive: { backgroundColor: "#111827", borderColor: "#111827" },
  filterText: { fontSize: 12, fontWeight: "600", color: "#111827" },
  filterTextActive: { color: "#ffffff" },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#ffffff", color: "#111827" },
  refreshButton: { borderRadius: 10, borderWidth: 1, borderColor: "#fed7aa", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#fff7ed", alignSelf: "flex-start" },
  refreshButtonText: { fontSize: 12, fontWeight: "600", color: "#9a3412" },
  alertError: { backgroundColor: "#fef2f2", borderColor: "#fecaca", borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  alertTitle: { fontSize: 13, fontWeight: "700", color: "#991b1b" },
  alertBody: { fontSize: 12, color: "#374151" },
  groupSection: { gap: 8 },
  groupTitle: { fontSize: 12, fontWeight: "800", color: "#6b7280", textTransform: "uppercase" },
  card: { backgroundColor: "#ffffff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#e5e7eb", flexDirection: "row", justifyContent: "space-between", gap: 10 },
  leftBlock: { flex: 1, gap: 4 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" },
  cardTitle: { fontSize: 14, fontWeight: "600", color: "#111827" },
  walletTypeBadge: { fontSize: 10, fontWeight: "700", color: "#374151", backgroundColor: "#f3f4f6", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, overflow: "hidden" },
  cardSubtitle: { fontSize: 12, color: "#6b7280" },
  cardMeta: { fontSize: 11, color: "#9ca3af" },
  amount: { fontSize: 13, fontWeight: "700", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, overflow: "hidden", alignSelf: "flex-start" },
  emptyText: { fontSize: 12, color: "#6b7280", textAlign: "center", paddingVertical: 20 },
});


