import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";

import {
  createMerchantFinanceEntryRequest,
  getMerchantFinanceOverviewRequest,
  updateMerchantShopSettingsRequest,
} from "../lib/api-client";
import { useMerchantAuthStore } from "../store/auth-store";
import { DokanXLogo } from "../components/dokanx-logo";
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

function getPrintModule() {
  const printModule = require("react-native-print");
  return printModule.default ?? printModule;
}

function getCurrentDateTimeRange() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return { from: start.toISOString().slice(0, 16), to: now.toISOString().slice(0, 16) };
}

function formatMoney(value: number) {
  return `${Number(value || 0).toFixed(2)} BDT`;
}

function normalizeCategory(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function rowsToCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escapeValue = (value: unknown) => {
    const text = value == null ? "" : String(value);
    const escaped = text.replace(/"/g, '""');
    return /[",\r\n]/.test(text) ? `"${escaped}"` : escaped;
  };
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escapeValue(row[header])).join(","))].join("\r\n");
}

function toTitle(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function buildFinancePrintHtml(title: string, rows: Array<{ createdAt?: string; scope?: string; transactionType?: string; walletType?: string; category?: string; note?: string; amount?: number }>, tax: { rate?: number; taxableSales?: number; deductibleExpense?: number; estimatedVatDue?: number; estimatedNetProfit?: number }) {
  const tableRows = rows.map((entry) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${entry.createdAt ? String(entry.createdAt).slice(0, 19).replace("T", " ") : "-"}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${entry.scope || "-"}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${entry.transactionType || "-"}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${entry.walletType || "-"}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${entry.category || "-"}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${entry.note || "-"}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${Number(entry.amount || 0).toFixed(2)}</td>
    </tr>`).join("");
  return `<html><body style="font-family:Arial,sans-serif;padding:24px;color:#0f172a;"><div style="max-width:960px;margin:0 auto;"><h1 style="margin:0 0 8px;">${title}</h1><div style="color:#64748b;margin-bottom:16px;">Printed ${new Date().toLocaleString()}</div><div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:18px;"><div style="padding:12px;border:1px solid #e5e7eb;border-radius:12px;"><div style="font-size:11px;color:#64748b;">Tax rate</div><div style="font-size:18px;font-weight:800;">${Number(tax.rate || 0).toFixed(2)}%</div></div><div style="padding:12px;border:1px solid #e5e7eb;border-radius:12px;"><div style="font-size:11px;color:#64748b;">Taxable sales</div><div style="font-size:18px;font-weight:800;">${Number(tax.taxableSales || 0).toFixed(2)} BDT</div></div><div style="padding:12px;border:1px solid #e5e7eb;border-radius:12px;"><div style="font-size:11px;color:#64748b;">VAT due</div><div style="font-size:18px;font-weight:800;">${Number(tax.estimatedVatDue || 0).toFixed(2)} BDT</div></div><div style="padding:12px;border:1px solid #e5e7eb;border-radius:12px;"><div style="font-size:11px;color:#64748b;">Net profit</div><div style="font-size:18px;font-weight:800;">${Number(tax.estimatedNetProfit || 0).toFixed(2)} BDT</div></div></div><table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr><th align="left">Date time</th><th align="left">Scope</th><th align="left">Type</th><th align="left">Source</th><th align="left">Category</th><th align="left">Note</th><th align="right">Amount</th></tr></thead><tbody>${tableRows}</tbody></table></div></body></html>`;
}

export function MerchantFinanceScreen() {
  const accessToken = useMerchantAuthStore((state) => state.accessToken);
  const [data, setData] = useState<any>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [taxRateInput, setTaxRateInput] = useState("0");

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
      setTaxRateInput(String(response.data?.shop?.vatRate || 0));
      setStatus("Finance dashboard synced from live backend.");
      console.log("[merchant-finance] load:success", JSON.stringify({ entries: (response.data?.entries || []).length, dateFrom, dateTo }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load finance data right now.");
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

  const filteredEntries = useMemo(() => entries.filter((entry: any) => {
    const createdAt = entry.createdAt ? new Date(entry.createdAt).getTime() : 0;
    const from = dateFrom ? new Date(dateFrom).getTime() : null;
    const to = dateTo ? new Date(dateTo).getTime() : null;
    if (from && createdAt < from) return false;
    if (to && createdAt > to) return false;
    return true;
  }), [dateFrom, dateTo, entries]);

  const groupedEntries = useMemo(() => ({
    business: filteredEntries.filter((entry: any) => entry.scope === "BUSINESS"),
    personal: filteredEntries.filter((entry: any) => entry.scope === "PERSONAL"),
  }), [filteredEntries]);

  const cashBankSplit = useMemo(() => filteredEntries.reduce((summary: any, entry: any) => {
    const walletType = String(entry.walletType || "CASH").toUpperCase();
    const amount = Number(entry.amount || 0);
    if (!summary[walletType]) summary[walletType] = { count: 0, amount: 0 };
    summary[walletType].count += 1;
    summary[walletType].amount += amount;
    return summary;
  }, { CASH: { count: 0, amount: 0 }, BANK: { count: 0, amount: 0 }, CREDIT: { count: 0, amount: 0 } }), [filteredEntries]);

  const dayBook = useMemo(() => filteredEntries.reduce((summary: any, entry: any) => {
    const amount = Number(entry.amount || 0);
    const type = String(entry.transactionType || "").toLowerCase();
    const walletType = String(entry.walletType || "CASH").toUpperCase();
    if (type === "income") summary.received += amount;
    if (type === "expense") summary.paid += amount;
    if (walletType === "CASH") summary.cashFlow += amount;
    if (walletType === "BANK") summary.bankFlow += amount;
    return summary;
  }, { received: 0, paid: 0, cashFlow: 0, bankFlow: 0 }), [filteredEntries]);

  const suggestedCategories = useMemo(() => {
    const builtIn = CATEGORY_SUGGESTIONS[form.scope] || [];
    const historical = filteredEntries
      .filter((entry: any) => String(entry.scope || "").toUpperCase() === form.scope)
      .map((entry: any) => normalizeCategory(String(entry.category || "")))
      .filter(Boolean);
    return Array.from(new Set([...historical, ...builtIn])).slice(0, 10);
  }, [filteredEntries, form.scope]);

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
      setError(saveError instanceof Error ? saveError.message : "Unable to save this finance entry right now.");
    } finally {
      setIsSaving(false);
    }
  }

  function applyQuickAction(action: typeof QUICK_ACTIONS[number]) {
    setForm((current) => ({ ...current, transactionType: action.transactionType, scope: action.scope, category: action.category, walletType: action.walletType }));
    setStatus(`${action.label} preset ready. Enter amount and save.`);
    setError(null);
  }

  async function handleExportReport(format: "CSV") {
    const rows = filteredEntries.map((entry: any) => ({
      createdAt: entry.createdAt,
      scope: entry.scope,
      transactionType: entry.transactionType,
      walletType: entry.walletType,
      category: entry.category,
      note: entry.note,
      amount: Number(entry.amount || 0),
    }));
    if (!rows.length) {
      setError("No finance rows were found in the selected filter window.");
      return;
    }
    const csv = rowsToCsv(rows);
    await Share.share({ title: "Finance CSV", url: `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`, message: "Finance export CSV" });
    setStatus("CSV export opened in share options.");
    setError(null);
  }

  function applyRange(days: number) {
    const now = new Date();
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    setDateFrom(from.toISOString().slice(0, 16));
    setDateTo(now.toISOString().slice(0, 16));
  }

  async function handlePrintReport() {
    if (!filteredEntries.length) {
      setError("No finance rows were found in the selected filter window.");
      return;
    }
    try {
      await getPrintModule().print({ html: buildFinancePrintHtml(`${data?.shop?.name || "Merchant"} finance report`, filteredEntries, { rate: Number(taxRateInput || 0), taxableSales: tax.taxableSales, deductibleExpense: tax.deductibleExpense, estimatedVatDue: tax.estimatedVatDue, estimatedNetProfit: tax.estimatedNetProfit }), jobName: "Finance report" });
      setStatus("Finance report sent to printer.");
      setError(null);
    } catch {
      await Share.share({ title: "Finance report", message: filteredEntries.map((entry: any) => `${entry.createdAt || "-"} | ${entry.scope} | ${entry.transactionType} | ${entry.walletType} | ${entry.category} | ${Number(entry.amount || 0).toFixed(2)} BDT`).join("\n") });
      setStatus("Printer unavailable. Finance report opened in share options.");
      setError(null);
    }
  }

  async function handleSaveTaxRate() {
    if (!accessToken) return;
    try {
      await updateMerchantShopSettingsRequest(accessToken, {
        name: String(data?.shop?.name || "Merchant"),
        supportEmail: "",
        whatsapp: "",
        payoutSchedule: "",
        vatRate: Number(taxRateInput || 0),
      } as any);
      await loadFinance();
      setStatus("Tax rate saved and finance reloaded.");
      setError(null);
    } catch (taxError) {
      setError(taxError instanceof Error ? taxError.message : "Unable to update the tax rate right now.");
    }
  }

  return (
    <View style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <MerchantTopNav active="Finance" />
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroBrandWrap}>
              <DokanXLogo variant="icon" size="sm" />
              <View style={styles.heroBrandCopy}>
                <Text style={styles.heroEyebrow}>Finance operations</Text>
                <Text style={styles.title}>Finance and fraud</Text>
              </View>
            </View>
            <Pressable style={styles.refreshButton} onPress={() => void loadFinance()}>
              <Text style={styles.refreshButtonText}>{isLoading ? "Refreshing..." : "Refresh finance"}</Text>
            </Pressable>
          </View>
          <Text style={styles.subtitle}>{data?.shop?.name || "Merchant finance control"}</Text>
          <Text style={styles.heroSupport}>Track bookkeeping, tax prep, fraud signals, and export-ready reporting from one operator surface.</Text>
          <View style={styles.heroMetrics}>
            <View style={styles.heroMetricCard}><Text style={styles.heroMetricLabel}>Rows</Text><Text style={styles.heroMetricValue}>{filteredEntries.length}</Text></View>
            <View style={styles.heroMetricCard}><Text style={styles.heroMetricLabel}>VAT due</Text><Text style={styles.heroMetricValue}>{formatMoney(tax.estimatedVatDue || 0)}</Text></View>
            <View style={styles.heroMetricCard}><Text style={styles.heroMetricLabel}>Fraud alerts</Text><Text style={styles.heroMetricValue}>{(fraud.alerts || []).length}</Text></View>
          </View>
        </View>

        {error ? <View style={styles.alertError}><Text style={styles.alertTitle}>Finance unavailable</Text><Text style={styles.alertBody}>{error}</Text></View> : null}
        {status ? <View style={styles.alertInfo}><Text style={styles.alertBody}>{status}</Text></View> : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report filters, export, and print</Text><Text style={styles.helperText}>Shape the finance window first, then export or print only the period you want to review.</Text>
          <TextInput style={styles.input} value={dateFrom} onChangeText={setDateFrom} placeholder="From date-time" placeholderTextColor="#6b7280" />
          <TextInput style={styles.input} value={dateTo} onChangeText={setDateTo} placeholder="To date-time" placeholderTextColor="#6b7280" />
          <View style={styles.pillRow}>
            <Pressable style={styles.categoryChip} onPress={() => applyRange(1)}><Text style={styles.categoryChipText}>Today</Text></Pressable>
            <Pressable style={styles.categoryChip} onPress={() => applyRange(7)}><Text style={styles.categoryChipText}>7D</Text></Pressable>
            <Pressable style={styles.categoryChip} onPress={() => applyRange(30)}><Text style={styles.categoryChipText}>30D</Text></Pressable>
          </View>
          <View style={styles.pillRow}>
            <Pressable style={styles.secondaryButton} onPress={() => void handleExportReport("CSV")}><Text style={styles.secondaryButtonText}>Export CSV</Text></Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => void handlePrintReport()}><Text style={styles.secondaryButtonText}>Print report</Text></Pressable>
          </View>
          <Text style={styles.helperText}>{filteredEntries.length} filtered rows ready for CSV or printer output.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily money view</Text><Text style={styles.helperText}>This split gives a fast cashbook and bankbook read before you move into entries or tax prep.</Text>
          <View style={styles.metricRow}>
            <View style={styles.metricCard}><Text style={styles.metricLabel}>Received</Text><Text style={styles.metricValue}>{formatMoney(dayBook.received)}</Text><Text style={styles.metricSub}>Income rows in current filter</Text></View>
            <View style={styles.metricCard}><Text style={styles.metricLabel}>Paid</Text><Text style={styles.metricValue}>{formatMoney(dayBook.paid)}</Text><Text style={styles.metricSub}>Expense rows in current filter</Text></View>
          </View>
          <View style={styles.metricRow}>
            <View style={styles.metricCard}><Text style={styles.metricLabel}>Cash flow</Text><Text style={styles.metricValue}>{formatMoney(dayBook.cashFlow)}</Text><Text style={styles.metricSub}>Cashbook view</Text></View>
            <View style={styles.metricCard}><Text style={styles.metricLabel}>Bank flow</Text><Text style={styles.metricValue}>{formatMoney(dayBook.bankFlow)}</Text><Text style={styles.metricSub}>Bankbook view</Text></View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick entry</Text><Text style={styles.helperText}>Preset shortcuts help operators add the most common finance events without rebuilding the form each time.</Text>
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
          <Text style={styles.sectionTitle}>Tax summary and filing prep</Text><Text style={styles.helperText}>Keep VAT assumptions current here so report exports and print views stay aligned with the shop profile.</Text>
          <TextInput style={styles.input} value={taxRateInput} onChangeText={setTaxRateInput} placeholder="VAT / tax rate %" placeholderTextColor="#6b7280" keyboardType="numeric" />
          <Pressable style={styles.secondaryButton} onPress={() => void handleSaveTaxRate()}><Text style={styles.secondaryButtonText}>Save tax rate</Text></Pressable>
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
          {!(fraud.alerts || []).length ? <Text style={styles.helperText}>No active fraud alerts are open for this merchant.</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add entry</Text>
          <Text style={styles.helperText}>Choose scope, money source, and category before saving the entry.</Text>
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
          {!groupedEntries.business.length ? <Text style={styles.helperText}>No business bookkeeping rows are recorded yet.</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent personal entries</Text>
          {groupedEntries.personal.map((entry: any) => (
            <View key={entry.id} style={styles.card}>
              <Text style={styles.cardTitle}>{toTitle(String(entry.transactionType || "entry"))} | {formatMoney(entry.amount || 0)} | {entry.walletType || "CASH"}</Text>
              <Text style={styles.cardBody}>{toTitle(String(entry.category || "general"))} | {entry.note || entry.referenceId || "No note"}</Text>
            </View>
          ))}
          {!groupedEntries.personal.length ? <Text style={styles.helperText}>No personal bookkeeping rows are recorded yet.</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8f4ef" },
  container: { padding: 16, gap: 12, paddingBottom: 118 },
  hero: { backgroundColor: "#0B1E3C", borderRadius: 24, padding: 18, gap: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  heroBrandWrap: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  heroBrandCopy: { flex: 1, gap: 3 },
  heroEyebrow: { color: "#ffd49f", fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  heroSupport: { fontSize: 12, color: "#dbe7fb", lineHeight: 18 },
  heroMetrics: { flexDirection: "row", gap: 8 },
  heroMetricCard: { flex: 1, borderRadius: 14, padding: 12, backgroundColor: "rgba(255,255,255,0.08)", gap: 4 },
  heroMetricLabel: { color: "#bfd2f2", fontSize: 11, fontWeight: "600" },
  heroMetricValue: { color: "#ffffff", fontSize: 15, fontWeight: "800" },
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
  secondaryButton: { backgroundColor: "#fff7ed", borderRadius: 10, borderWidth: 1, borderColor: "#fed7aa", paddingHorizontal: 12, paddingVertical: 10 },
  secondaryButtonText: { color: "#9a3412", fontSize: 12, fontWeight: "600" },
});














