import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import {
  createMerchantFinanceEntryRequest,
  getMerchantFinanceOverviewRequest,
} from "../lib/api-client";
import { useMerchantAuthStore } from "../store/auth-store";
import { MerchantTopNav } from "./merchant-top-nav";

const EMPTY_FORM = {
  amount: "",
  transactionType: "expense" as "income" | "expense" | "transfer" | "cheque",
  scope: "BUSINESS" as "BUSINESS" | "PERSONAL",
  category: "general",
  note: "",
  walletType: "CASH" as "CASH" | "BANK" | "CREDIT",
};

const QUICK_ACTIONS = [
  { label: "Sale", transactionType: "income", scope: "BUSINESS", category: "sales", walletType: "CASH" },
  { label: "Expense", transactionType: "expense", scope: "BUSINESS", category: "expense", walletType: "CASH" },
  { label: "Bank in", transactionType: "income", scope: "BUSINESS", category: "bank_deposit", walletType: "BANK" },
  { label: "Cash out", transactionType: "expense", scope: "BUSINESS", category: "cash_out", walletType: "CASH" },
  { label: "Personal", transactionType: "expense", scope: "PERSONAL", category: "family", walletType: "CASH" },
] as const;

const CATEGORY_SUGGESTIONS: Record<"BUSINESS" | "PERSONAL", string[]> = {
  BUSINESS: ["sales", "purchase", "rent", "salary", "transport", "electricity", "internet", "bank_deposit", "cash_out", "marketing"],
  PERSONAL: ["family", "food", "transport", "education", "medical", "savings", "loan", "mobile"],
};

function formatMoney(value: number) {
  return `${Number(value || 0).toFixed(2)} BDT`;
}

function normalizeCategory(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function toTitle(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export function MerchantFinanceScreen() {
  const accessToken = useMerchantAuthStore((state) => state.accessToken);
  const [data, setData] = useState<any>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const loadFinance = useCallback(async () => {
    if (!accessToken) {
      setError("Merchant session missing. Please sign in again.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await getMerchantFinanceOverviewRequest(accessToken);
      setData(response.data || null);
      setStatus("Finance dashboard synced from live backend.");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load finance data.");
      setData(null);
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadFinance();
  }, [loadFinance]);

  const business = data?.accounting || {};
  const tax = data?.tax || {};
  const fraud = data?.fraud || {};
  const entries = data?.entries || [];

  const groupedEntries = useMemo(() => ({
    business: entries.filter((entry: any) => entry.scope === "BUSINESS"),
    personal: entries.filter((entry: any) => entry.scope === "PERSONAL"),
  }), [entries]);

  const cashBankSplit = useMemo(() => {
    return entries.reduce((summary: any, entry: any) => {
      const walletType = String(entry.walletType || "CASH").toUpperCase();
      const amount = Number(entry.amount || 0);
      if (!summary[walletType]) {
        summary[walletType] = { count: 0, amount: 0 };
      }
      summary[walletType].count += 1;
      summary[walletType].amount += amount;
      return summary;
    }, {
      CASH: { count: 0, amount: 0 },
      BANK: { count: 0, amount: 0 },
      CREDIT: { count: 0, amount: 0 },
    });
  }, [entries]);

  const dayBook = useMemo(() => {
    return entries.reduce((summary: any, entry: any) => {
      const amount = Number(entry.amount || 0);
      const type = String(entry.transactionType || "").toLowerCase();
      const walletType = String(entry.walletType || "CASH").toUpperCase();
      if (type === "income") summary.received += amount;
      if (type === "expense") summary.paid += amount;
      if (walletType === "CASH") summary.cashFlow += amount;
      if (walletType === "BANK") summary.bankFlow += amount;
      return summary;
    }, { received: 0, paid: 0, cashFlow: 0, bankFlow: 0 });
  }, [entries]);

  const suggestedCategories = useMemo(() => {
    const builtIn = CATEGORY_SUGGESTIONS[form.scope] || [];
    const historical = entries
      .filter((entry: any) => String(entry.scope || "").toUpperCase() === form.scope)
      .map((entry: any) => normalizeCategory(String(entry.category || "")))
      .filter(Boolean);
    return Array.from(new Set([...historical, ...builtIn])).slice(0, 10);
  }, [entries, form.scope]);

  async function handleCreateEntry() {
    if (!accessToken) return;
    if (Number(form.amount || 0) <= 0) {
      setError("Amount is required.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setStatus(null);

    try {
      await createMerchantFinanceEntryRequest(accessToken, {
        amount: Number(form.amount || 0),
        transactionType: form.transactionType,
        scope: form.scope,
        category: normalizeCategory(form.category) || "general",
        note: form.note || undefined,
        walletType: form.walletType,
      });
      setForm(EMPTY_FORM);
      await loadFinance();
      setStatus("Finance entry saved and reloaded from backend.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save finance entry.");
    } finally {
      setIsSaving(false);
    }
  }

  function applyQuickAction(action: typeof QUICK_ACTIONS[number]) {
    setForm((current) => ({
      ...current,
      transactionType: action.transactionType,
      scope: action.scope,
      category: action.category,
      walletType: action.walletType,
    }));
    setStatus(`${action.label} preset ready. Enter amount and save.`);
    setError(null);
  }

  return (
    <View style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <MerchantTopNav active="Finance" />
        <View style={styles.hero}>
          <Text style={styles.title}>Finance and fraud</Text>
          <Text style={styles.subtitle}>{data?.shop?.name || "Merchant finance control"}</Text>
          <Pressable style={styles.refreshButton} onPress={() => void loadFinance()}>
            <Text style={styles.refreshButtonText}>{isLoading ? "Refreshing..." : "Refresh finance"}</Text>
          </Pressable>
        </View>

        {error ? <View style={styles.alertError}><Text style={styles.alertTitle}>Finance unavailable</Text><Text style={styles.alertBody}>{error}</Text></View> : null}
        {status ? <View style={styles.alertInfo}><Text style={styles.alertBody}>{status}</Text></View> : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily money view</Text>
          <View style={styles.metricRow}>
            <View style={styles.metricCard}><Text style={styles.metricLabel}>Received</Text><Text style={styles.metricValue}>{formatMoney(dayBook.received)}</Text><Text style={styles.metricSub}>Income rows today scope</Text></View>
            <View style={styles.metricCard}><Text style={styles.metricLabel}>Paid</Text><Text style={styles.metricValue}>{formatMoney(dayBook.paid)}</Text><Text style={styles.metricSub}>Expense rows today scope</Text></View>
          </View>
          <View style={styles.metricRow}>
            <View style={styles.metricCard}><Text style={styles.metricLabel}>Cash flow</Text><Text style={styles.metricValue}>{formatMoney(dayBook.cashFlow)}</Text><Text style={styles.metricSub}>Cashbook view</Text></View>
            <View style={styles.metricCard}><Text style={styles.metricLabel}>Bank flow</Text><Text style={styles.metricValue}>{formatMoney(dayBook.bankFlow)}</Text><Text style={styles.metricSub}>Bankbook view</Text></View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick entry</Text>
          <Text style={styles.helperText}>Common daily entries are one tap away. Pick a preset, enter amount, then save.</Text>
          <View style={styles.pillRow}>
            {QUICK_ACTIONS.map((action) => (
              <Pressable key={action.label} style={styles.quickChip} onPress={() => applyQuickAction(action)}>
                <Text style={styles.quickChipText}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cash and bank view</Text>
          <View style={styles.metricRow}>
            <View style={styles.metricCard}><Text style={styles.metricLabel}>Cash entries</Text><Text style={styles.metricValue}>{formatMoney(cashBankSplit.CASH.amount || 0)}</Text><Text style={styles.metricSub}>Rows {cashBankSplit.CASH.count || 0}</Text></View>
            <View style={styles.metricCard}><Text style={styles.metricLabel}>Bank entries</Text><Text style={styles.metricValue}>{formatMoney(cashBankSplit.BANK.amount || 0)}</Text><Text style={styles.metricSub}>Rows {cashBankSplit.BANK.count || 0}</Text></View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business accounting</Text>
          <View style={styles.metricRow}>
            <View style={styles.metricCard}><Text style={styles.metricLabel}>Income</Text><Text style={styles.metricValue}>{formatMoney(business.businessIncome || 0)}</Text></View>
            <View style={styles.metricCard}><Text style={styles.metricLabel}>Expense</Text><Text style={styles.metricValue}>{formatMoney(business.businessExpense || 0)}</Text></View>
          </View>
          <View style={styles.metricRow}>
            <View style={styles.metricCardWide}><Text style={styles.metricLabel}>Profit</Text><Text style={styles.metricValue}>{formatMoney(business.businessProfit || 0)}</Text></View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal bookkeeping</Text>
          <View style={styles.metricRow}>
            <View style={styles.metricCard}><Text style={styles.metricLabel}>Income</Text><Text style={styles.metricValue}>{formatMoney(business.personalIncome || 0)}</Text></View>
            <View style={styles.metricCard}><Text style={styles.metricLabel}>Expense</Text><Text style={styles.metricValue}>{formatMoney(business.personalExpense || 0)}</Text></View>
          </View>
          <View style={styles.metricRow}>
            <View style={styles.metricCardWide}><Text style={styles.metricLabel}>Net</Text><Text style={styles.metricValue}>{formatMoney(business.personalNet || 0)}</Text></View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tax summary</Text>
          <Text style={styles.rowText}>VAT rate: {data?.shop?.vatRate || 0}%</Text>
          <Text style={styles.rowText}>Taxable sales: {formatMoney(tax.taxableSales || 0)}</Text>
          <Text style={styles.rowText}>Deductible expense: {formatMoney(tax.deductibleExpense || 0)}</Text>
          <Text style={styles.rowText}>Estimated VAT due: {formatMoney(tax.estimatedVatDue || 0)}</Text>
          <Text style={styles.rowText}>Estimated net profit: {formatMoney(tax.estimatedNetProfit || 0)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fraud identification</Text>
          <Text style={styles.rowText}>Total cases: {fraud.totalCases || 0}</Text>
          <Text style={styles.rowText}>Open cases: {fraud.openCases || 0}</Text>
          <Text style={styles.rowText}>High risk: {fraud.highRiskCases || 0}</Text>
          {(fraud.alerts || []).map((alert: any) => (
            <View key={alert.id} style={styles.card}>
              <Text style={styles.cardTitle}>{alert.level} | {alert.status}</Text>
              <Text style={styles.cardBody}>{alert.summary}</Text>
            </View>
          ))}
          {!(fraud.alerts || []).length ? <Text style={styles.helperText}>No active fraud alerts for this merchant.</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add entry</Text>
          <Text style={styles.helperText}>Choose scope, money source, and category before saving. Suggested categories grow from your previous entries.</Text>
          <View style={styles.pillRow}>
            {(["BUSINESS", "PERSONAL"] as const).map((scope) => (
              <Pressable key={scope} style={[styles.pill, form.scope === scope ? styles.pillActive : null]} onPress={() => setForm((current) => ({ ...current, scope }))}>
                <Text style={[styles.pillText, form.scope === scope ? styles.pillTextActive : null]}>{scope}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.pillRow}>
            {(["income", "expense"] as const).map((transactionType) => (
              <Pressable key={transactionType} style={[styles.pill, form.transactionType === transactionType ? styles.pillActive : null]} onPress={() => setForm((current) => ({ ...current, transactionType }))}>
                <Text style={[styles.pillText, form.transactionType === transactionType ? styles.pillTextActive : null]}>{transactionType.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.pillRow}>
            {(["CASH", "BANK", "CREDIT"] as const).map((walletType) => (
              <Pressable key={walletType} style={[styles.pill, form.walletType === walletType ? styles.pillActive : null]} onPress={() => setForm((current) => ({ ...current, walletType }))}>
                <Text style={[styles.pillText, form.walletType === walletType ? styles.pillTextActive : null]}>{walletType}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput style={styles.input} value={form.amount} onChangeText={(value) => setForm((current) => ({ ...current, amount: value }))} placeholder="Amount" placeholderTextColor="#6b7280" keyboardType="numeric" />
          <TextInput style={styles.input} value={form.category} onChangeText={(value) => setForm((current) => ({ ...current, category: value }))} placeholder="Category" placeholderTextColor="#6b7280" />
          <View style={styles.pillRow}>
            {suggestedCategories.map((category) => (
              <Pressable key={category} style={styles.categoryChip} onPress={() => setForm((current) => ({ ...current, category }))}>
                <Text style={styles.categoryChipText}>{toTitle(category)}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput style={styles.input} value={form.note} onChangeText={(value) => setForm((current) => ({ ...current, note: value }))} placeholder="Note" placeholderTextColor="#6b7280" />
          <Pressable style={styles.primaryButton} onPress={() => void handleCreateEntry()}>
            <Text style={styles.primaryButtonText}>{isSaving ? "Saving..." : `Save ${form.walletType} entry`}</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent business entries</Text>
          {groupedEntries.business.map((entry: any) => (
            <View key={entry.id} style={styles.card}>
              <Text style={styles.cardTitle}>{toTitle(String(entry.transactionType || "entry"))} | {formatMoney(entry.amount || 0)} | {entry.walletType || "CASH"}</Text>
              <Text style={styles.cardBody}>{toTitle(String(entry.category || "general"))} | {entry.note || entry.referenceId || "No note"}</Text>
            </View>
          ))}
          {!groupedEntries.business.length ? <Text style={styles.helperText}>No business bookkeeping rows yet.</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent personal entries</Text>
          {groupedEntries.personal.map((entry: any) => (
            <View key={entry.id} style={styles.card}>
              <Text style={styles.cardTitle}>{toTitle(String(entry.transactionType || "entry"))} | {formatMoney(entry.amount || 0)} | {entry.walletType || "CASH"}</Text>
              <Text style={styles.cardBody}>{toTitle(String(entry.category || "general"))} | {entry.note || entry.referenceId || "No note"}</Text>
            </View>
          ))}
          {!groupedEntries.personal.length ? <Text style={styles.helperText}>No personal bookkeeping rows yet.</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8f4ef" },
  container: { padding: 16, gap: 12, paddingBottom: 118 },
  hero: { backgroundColor: "#111827", borderRadius: 18, padding: 16, gap: 8 },
  title: { fontSize: 22, fontWeight: "700", color: "#ffffff" },
  subtitle: { fontSize: 12, color: "#d1d5db" },
  refreshButton: { alignSelf: "flex-start", borderRadius: 999, borderWidth: 1, borderColor: "#374151", paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#182230" },
  refreshButtonText: { fontSize: 12, fontWeight: "700", color: "#ffffff" },
  alertError: { backgroundColor: "#fef2f2", borderColor: "#fecaca", borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  alertInfo: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe", borderWidth: 1, borderRadius: 14, padding: 14 },
  alertTitle: { fontSize: 13, fontWeight: "700", color: "#991b1b" },
  alertBody: { fontSize: 12, color: "#374151" },
  section: { backgroundColor: "#ffffff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#e5e7eb", gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  metricRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricCard: { width: "48%", backgroundColor: "#fff7ed", borderRadius: 14, padding: 12, gap: 4 },
  metricCardWide: { width: "100%", backgroundColor: "#fff7ed", borderRadius: 14, padding: 12, gap: 4 },
  metricLabel: { fontSize: 11, color: "#9a3412", textTransform: "uppercase" },
  metricValue: { fontSize: 18, fontWeight: "700", color: "#111827" },
  metricSub: { fontSize: 11, color: "#6b7280" },
  rowText: { fontSize: 12, color: "#374151" },
  helperText: { fontSize: 12, color: "#6b7280" },
  card: { borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", padding: 12, gap: 6 },
  cardTitle: { fontSize: 12, fontWeight: "700", color: "#111827" },
  cardBody: { fontSize: 12, color: "#374151" },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "#d1d5db", backgroundColor: "#ffffff" },
  pillActive: { backgroundColor: "#111827", borderColor: "#111827" },
  pillText: { fontSize: 12, fontWeight: "600", color: "#111827" },
  pillTextActive: { color: "#ffffff" },
  quickChip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, backgroundColor: "#ecfccb", borderWidth: 1, borderColor: "#bef264" },
  quickChipText: { fontSize: 12, fontWeight: "700", color: "#365314" },
  categoryChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, backgroundColor: "#f3f4f6" },
  categoryChipText: { fontSize: 11, fontWeight: "600", color: "#374151" },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#ffffff", color: "#111827" },
  primaryButton: { backgroundColor: "#111827", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, alignItems: "center" },
  primaryButtonText: { color: "#ffffff", fontSize: 13, fontWeight: "700" },
});

