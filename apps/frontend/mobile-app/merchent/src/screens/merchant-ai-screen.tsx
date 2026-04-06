import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  createMerchantCampaignRequest,
  getMerchantAiInsightsRequest,
  getMerchantDemandForecastRequest,
  getMerchantPricingInsightsRequest,
  recordMerchantAiFeedbackRequest,
} from "../lib/api-client";
import { useMerchantAuthStore } from "../store/auth-store";
import { useMerchantNavigation } from "../navigation/merchant-navigation";
import { MerchantTopNav } from "./merchant-top-nav";

type InsightItem = {
  id: string;
  title: string;
  message: string;
  badge: string;
  actionLabel: string;
  actionScreen: "MerchantOrders" | "MerchantProducts" | "MerchantCustomers" | "MerchantMarketing";
};

type PricingItem = {
  product: string;
  marketPrice: number;
  yourPrice: number;
  suggestion: number;
  inventory: number;
  velocity: string;
};

type TimeWindow = "7" | "30";

type AutomationPreset = {
  name: string;
  type: string;
  note: string;
};

function resolveInsightAction(item: { title?: string; message?: string; badge?: string }) {
  const merged = `${String(item.title || "")} ${String(item.message || "")} ${String(item.badge || "")}`.toLowerCase();
  if (merged.includes("stock") || merged.includes("pricing") || merged.includes("product")) return { actionLabel: "Review products", actionScreen: "MerchantProducts" as const };
  if (merged.includes("due") || merged.includes("customer") || merged.includes("credit")) return { actionLabel: "Review customers", actionScreen: "MerchantCustomers" as const };
  if (merged.includes("order") || merged.includes("pending") || merged.includes("payment")) return { actionLabel: "Review orders", actionScreen: "MerchantOrders" as const };
  return { actionLabel: "Open marketing", actionScreen: "MerchantMarketing" as const };
}

export function MerchantAiScreen() {
  const accessToken = useMerchantAuthStore((state) => state.accessToken);
  const profile = useMerchantAuthStore((state) => state.profile);
  const navigation = useMerchantNavigation();
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [pricing, setPricing] = useState<PricingItem[]>([]);
  const [forecastDelta, setForecastDelta] = useState<number | null>(null);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("30");
  const [isLoading, setIsLoading] = useState(true);
  const [isAutomating, setIsAutomating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const loadAi = useCallback(async () => {
    if (!accessToken) {
      setError("Merchant session missing. Please sign in again.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [insightResponse, forecastResponse, pricingResponse] = await Promise.all([
        getMerchantAiInsightsRequest(accessToken),
        getMerchantDemandForecastRequest(accessToken, timeWindow),
        getMerchantPricingInsightsRequest(accessToken),
      ]);

      const nextInsights = (insightResponse.data || []).map((item) => ({
        id: String(item.id || item.title || Math.random()),
        title: String(item.title || "Insight"),
        message: String(item.message || "No message"),
        badge: String(item.badge || "info"),
        ...resolveInsightAction(item),
      }));
      const nextPricing = (pricingResponse.data || []).map((item) => ({
        product: String(item.product || "Product"),
        marketPrice: Number(item.marketPrice || 0),
        yourPrice: Number(item.yourPrice || 0),
        suggestion: Number(item.suggestion || 0),
        inventory: Number(item.inventory || 0),
        velocity: String(item.velocity || "steady"),
      }));
      const actual = forecastResponse.data?.actual || [];
      const forecast = forecastResponse.data?.forecast || [];
      const recentActual = actual.slice(-7).reduce((sum, value) => sum + Number(value || 0), 0);
      const upcomingForecast = forecast.slice(-7).reduce((sum, value) => sum + Number(value || 0), 0);
      const delta = recentActual > 0 ? Number((((upcomingForecast - recentActual) / recentActual) * 100).toFixed(1)) : null;

      setInsights(nextInsights);
      setPricing(nextPricing);
      setForecastDelta(delta);
      setStatus(`AI signals synced for the last ${timeWindow} days.`);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load merchant AI.");
      setInsights([]);
      setPricing([]);
      setForecastDelta(null);
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, timeWindow]);

  useEffect(() => {
    void loadAi();
  }, [loadAi]);

  const topAutomation = useMemo<AutomationPreset>(() => {
    const inventoryRisk = pricing.find((item) => item.inventory <= 5);
    if (inventoryRisk) {
      return {
        name: `Restock ${inventoryRisk.product}`,
        type: "REMINDER",
        note: `Low inventory detected for ${inventoryRisk.product}.`,
      };
    }

    if ((forecastDelta || 0) > 10) {
      return {
        name: "Boost trending demand",
        type: "PROMO",
        note: `Forecast indicates ${forecastDelta}% growth in upcoming demand.`,
      };
    }

    return {
      name: "Recover pending customers",
      type: "WINBACK",
      note: "Send a lightweight re-engagement campaign to recent customers.",
    };
  }, [forecastDelta, pricing]);

  const automationQueue = useMemo<AutomationPreset[]>(() => {
    const queue: AutomationPreset[] = [topAutomation];
    const lowStock = pricing.find((item) => item.inventory <= 5 && item.product !== topAutomation.name.replace("Restock ", ""));
    const pricingRisk = pricing.find((item) => item.suggestion !== item.yourPrice);
    if (lowStock) {
      queue.push({ name: `Restock follow-up for ${lowStock.product}`, type: "REMINDER", note: `Create a restock action and notify staff for ${lowStock.product}.` });
    }
    if (pricingRisk) {
      queue.push({ name: `Price review for ${pricingRisk.product}`, type: "PROMO", note: `Your price is ${pricingRisk.yourPrice} BDT while AI suggests ${pricingRisk.suggestion} BDT.` });
    }
    queue.push({ name: "Due customer follow-up", type: "WINBACK", note: "Prepare a reminder campaign for customers with active dues." });
    return queue.slice(0, 4);
  }, [pricing, topAutomation]);

  const summary = useMemo(() => ({
    insightCount: insights.length,
    pricingRiskCount: pricing.filter((item) => item.suggestion !== item.yourPrice).length,
    lowInventoryCount: pricing.filter((item) => item.inventory <= 5).length,
  }), [insights, pricing]);

  async function handleCreateAutomation(preset?: AutomationPreset) {
    if (!accessToken) return;
    const selected = preset || topAutomation;

    setIsAutomating(true);
    setError(null);
    setStatus(null);

    try {
      await createMerchantCampaignRequest(accessToken, {
        name: selected.name,
        type: selected.type,
      });
      await recordMerchantAiFeedbackRequest(accessToken, {
        eventType: "click",
        context: "merchant_ai_automation",
        shopId: profile?.shopId,
        metadata: { automation: selected, timeWindow },
      });
      await loadAi();
      setStatus(`Automation draft created: ${selected.name}.`);
    } catch (automationError) {
      setError(automationError instanceof Error ? automationError.message : "Unable to create automation.");
    } finally {
      setIsAutomating(false);
    }
  }

  return (
    <View style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <MerchantTopNav active="AI" />
        <View style={styles.hero}>
          <Text style={styles.title}>AI and automation</Text>
          <Text style={styles.subtitle}>{isLoading ? "Syncing intelligence" : "Live merchant intelligence, automation queue, and operator actions"}</Text>
          <View style={styles.windowRow}>
            {(["7", "30"] as TimeWindow[]).map((window) => (
              <Pressable key={window} style={[styles.windowChip, timeWindow === window ? styles.windowChipActive : null]} onPress={() => setTimeWindow(window)}>
                <Text style={[styles.windowChipText, timeWindow === window ? styles.windowChipTextActive : null]}>{window}D</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.heroActions}>
            <Pressable style={styles.secondaryButton} onPress={() => void loadAi()}>
              <Text style={styles.secondaryButtonText}>Refresh AI</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={() => void handleCreateAutomation()}>
              <Text style={styles.primaryButtonText}>{isAutomating ? "Building..." : "Create top automation"}</Text>
            </Pressable>
          </View>
        </View>

        {error ? <View style={styles.alertError}><Text style={styles.alertTitle}>AI unavailable</Text><Text style={styles.alertBody}>{error}</Text></View> : null}

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Insights</Text><Text style={styles.summaryValue}>{summary.insightCount}</Text><Text style={styles.summaryMeta}>Live actions</Text></View>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Pricing risk</Text><Text style={styles.summaryValue}>{summary.pricingRiskCount}</Text><Text style={styles.summaryMeta}>Need review</Text></View>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Low inventory</Text><Text style={styles.summaryValue}>{summary.lowInventoryCount}</Text><Text style={styles.summaryMeta}>Restock signal</Text></View>
        </View>
        {status ? <View style={styles.alertInfo}><Text style={styles.alertBody}>{status}</Text></View> : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Automation queue</Text>
          {automationQueue.map((item) => (
            <View key={item.name} style={styles.card}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardBody}>{item.note}</Text>
              <View style={styles.cardActionRow}>
                <Text style={styles.cardMeta}>Type {item.type}</Text>
                <Pressable style={styles.inlineActionButton} onPress={() => void handleCreateAutomation(item)}>
                  <Text style={styles.inlineActionButtonText}>Draft this</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Demand pulse</Text>
          <Text style={styles.bigMetric}>{forecastDelta === null ? "No forecast" : `${forecastDelta}%`}</Text>
          <Text style={styles.cardBody}>Expected 7-day demand change versus the last 7 days within the selected window.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Merchant insights</Text>
          {insights.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardBody}>{item.message}</Text>
              <View style={styles.cardActionRow}>
                <Text style={styles.cardMeta}>{item.badge.toUpperCase()}</Text>
                <Pressable style={styles.inlineActionButton} onPress={() => navigation.navigate(item.actionScreen)}><Text style={styles.inlineActionButtonText}>{item.actionLabel}</Text></Pressable>
              </View>
            </View>
          ))}
          {!insights.length && !isLoading ? <Text style={styles.helperText}>No AI insights returned from backend.</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing suggestions</Text>
          {pricing.slice(0, 5).map((item) => (
            <View key={item.product} style={styles.card}>
              <Text style={styles.cardTitle}>{item.product}</Text>
              <Text style={styles.cardBody}>Current {item.yourPrice} BDT | Suggested {item.suggestion} BDT | Inventory {item.inventory}</Text>
              <View style={styles.cardActionRow}>
                <Text style={styles.cardMeta}>{item.velocity.toUpperCase()}</Text>
                <Pressable style={styles.inlineActionButton} onPress={() => navigation.navigate("MerchantProducts")}><Text style={styles.inlineActionButtonText}>Open products</Text></Pressable>
              </View>
            </View>
          ))}
          {!pricing.length && !isLoading ? <Text style={styles.helperText}>No pricing suggestions returned from backend.</Text> : null}
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
  windowRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  windowChip: { borderRadius: 999, borderWidth: 1, borderColor: "#374151", paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#182230" },
  windowChipActive: { backgroundColor: "#ffffff", borderColor: "#ffffff" },
  windowChipText: { color: "#ffffff", fontSize: 11, fontWeight: "700" },
  windowChipTextActive: { color: "#111827" },
  heroActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  primaryButton: { backgroundColor: "#ffffff", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  primaryButtonText: { color: "#111827", fontSize: 12, fontWeight: "700" },
  secondaryButton: { backgroundColor: "#182230", borderRadius: 10, borderWidth: 1, borderColor: "#374151", paddingHorizontal: 12, paddingVertical: 10 },
  secondaryButtonText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
  summaryRow: { flexDirection: "row", gap: 8 },
  summaryCard: { flex: 1, backgroundColor: "#ffffff", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#e5e7eb", gap: 4 },
  summaryLabel: { fontSize: 11, color: "#6b7280", textTransform: "uppercase" },
  summaryValue: { fontSize: 18, fontWeight: "800", color: "#111827" },
  summaryMeta: { fontSize: 11, color: "#9a3412" },
  alertError: { backgroundColor: "#fef2f2", borderColor: "#fecaca", borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  alertInfo: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe", borderWidth: 1, borderRadius: 14, padding: 14 },
  alertTitle: { fontSize: 13, fontWeight: "700", color: "#991b1b" },
  alertBody: { fontSize: 12, color: "#374151" },
  section: { backgroundColor: "#ffffff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#e5e7eb", gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  bigMetric: { fontSize: 28, fontWeight: "700", color: "#111827" },
  card: { borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", padding: 12, gap: 6 },
  cardTitle: { fontSize: 13, fontWeight: "700", color: "#111827" },
  cardBody: { fontSize: 12, color: "#374151" },
  cardMeta: { fontSize: 11, color: "#9a3412" },
  cardActionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  inlineActionButton: { backgroundColor: "#111827", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  inlineActionButtonText: { color: "#ffffff", fontSize: 11, fontWeight: "700" },
  helperText: { fontSize: 12, color: "#6b7280" },
});


