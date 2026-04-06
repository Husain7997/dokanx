import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";

import {
  MerchantCampaignApiRow,
  createMerchantCampaignRequest,
  getMerchantNotificationSettingsRequest,
  listMerchantCampaignsRequest,
} from "../lib/api-client";
import { useMerchantAuthStore } from "../store/auth-store";
import { useMerchantNavigation } from "../navigation/merchant-navigation";
import { MerchantTopNav } from "./merchant-top-nav";

const PLATFORM_OPTIONS = ["FACEBOOK", "INSTAGRAM", "WHATSAPP", "SMS", "GOOGLE"] as const;
const TYPE_OPTIONS = ["PROMO", "REMINDER", "WINBACK", "FLASH_SALE"] as const;

const QUICK_TEMPLATES = [
  { name: "Offer blast", type: "PROMO", platform: "FACEBOOK", offerTitle: "Weekend offer", ctaLabel: "Order now", content: "Fresh stock is now live. Grab the offer before it ends tonight.", autoMessage: "Assalamu alaikum. Fresh offer is now live in our store. Reply to order instantly." },
  { name: "Due reminder", type: "REMINDER", platform: "WHATSAPP", offerTitle: "Due reminder", ctaLabel: "Pay now", content: "Send a respectful reminder to customers with active dues.", autoMessage: "Assalamu alaikum. Your due is still pending. Please settle it at your convenience." },
  { name: "New stock alert", type: "PROMO", platform: "INSTAGRAM", offerTitle: "Back in stock", ctaLabel: "See products", content: "Tell customers that your top moving products are back on the shelf.", autoMessage: "Top-selling items are back in stock. Message now to reserve yours." },
] as const;

type CampaignForm = {
  name: string;
  type: string;
  platform: string;
  content: string;
  offerTitle: string;
  ctaLabel: string;
  redirectUrl: string;
  trackingCode: string;
  targetingSummary: string;
  autoMessage: string;
};

const EMPTY_FORM: CampaignForm = {
  name: "",
  type: "PROMO",
  platform: "FACEBOOK",
  content: "",
  offerTitle: "",
  ctaLabel: "Shop now",
  redirectUrl: "",
  trackingCode: "",
  targetingSummary: "",
  autoMessage: "",
};

export function MerchantMarketingScreen() {
  const accessToken = useMerchantAuthStore((state) => state.accessToken);
  const navigation = useMerchantNavigation();
  const [campaigns, setCampaigns] = useState<MerchantCampaignApiRow[]>([]);
  const [form, setForm] = useState<CampaignForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const summary = useMemo(() => campaigns.reduce((accumulator, campaign) => {
    accumulator.total += 1;
    if (String(campaign.status || "").toUpperCase() === "ACTIVE") accumulator.active += 1;
    if (["WHATSAPP", "SMS"].includes(String(campaign.platform || "").toUpperCase())) accumulator.direct += 1;
    return accumulator;
  }, { total: 0, active: 0, direct: 0 }), [campaigns]);

  const loadCampaigns = useCallback(async () => {
    if (!accessToken) {
      setError("Merchant session missing. Please sign in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [response, settingsResponse] = await Promise.all([
        listMerchantCampaignsRequest(accessToken),
        getMerchantNotificationSettingsRequest(accessToken),
      ]);
      setCampaigns(response.data || []);
      setSmsEnabled(Boolean(settingsResponse.data?.channels?.sms));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load campaigns right now.");
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  function updateField<K extends keyof CampaignForm>(field: K, value: CampaignForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function applyTemplate(template: typeof QUICK_TEMPLATES[number]) {
    setForm({
      ...EMPTY_FORM,
      name: template.name,
      type: template.type,
      platform: template.platform,
      offerTitle: template.offerTitle,
      ctaLabel: template.ctaLabel,
      content: template.content,
      autoMessage: template.autoMessage,
      trackingCode: `cmp-${Date.now()}`,
    });
    setStatus("Template applied. Review the content, then create the campaign.");
    setError(null);
  }

  async function handleCreateCampaign() {
    if (!accessToken) {
      setError("Merchant session missing. Please sign in again.");
      return;
    }
    if (!form.name.trim()) {
      setError("Campaign name is required.");
      return;
    }

    setSaving(true);
    setError(null);
    setStatus(null);

    try {
      await createMerchantCampaignRequest(accessToken, {
        name: form.name.trim(),
        type: form.type,
        platform: form.platform,
        channel: form.platform === "SMS" || form.platform === "WHATSAPP" ? "DIRECT" : "SOCIAL",
        content: form.content.trim(),
        offerTitle: form.offerTitle.trim(),
        ctaLabel: form.ctaLabel.trim() || "Shop now",
        redirectUrl: form.redirectUrl.trim(),
        trackingCode: form.trackingCode.trim() || `cmp-${Date.now()}`,
        targetingSummary: form.targetingSummary.trim(),
        autoMessage: form.autoMessage.trim(),
      });
      setForm(EMPTY_FORM);
      await loadCampaigns();
      setStatus("Campaign created and synced from backend.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create this campaign right now.");
    } finally {
      setSaving(false);
    }
  }

  async function shareCampaign(campaign: MerchantCampaignApiRow) {
    const body = [
      campaign.offerTitle || campaign.name || "Offer",
      campaign.content || "",
      campaign.redirectUrl ? `Link: ${campaign.redirectUrl}` : "",
      campaign.trackingCode ? `Tracking: ${campaign.trackingCode}` : "",
      campaign.autoMessage ? `Message: ${campaign.autoMessage}` : "",
    ].filter(Boolean).join("\n\n");
    await Share.share({ title: campaign.name || "Campaign", message: body });
  }

  return (
    <View style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <MerchantTopNav active="Marketing" />
        <View style={styles.heroCard}>
          <View>
            <Text style={styles.title}>Marketing operations</Text>
            <Text style={styles.subtitle}>{loading ? "Syncing campaigns" : `${summary.active} live campaigns, ${summary.total} total`}</Text>
          </View>
          <Pressable style={styles.refreshButton} onPress={() => void loadCampaigns()}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </Pressable>
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metricCard}><Text style={styles.metricLabel}>Live campaigns</Text><Text style={styles.metricValue}>{summary.active}</Text></View>
          <View style={styles.metricCard}><Text style={styles.metricLabel}>Direct channels</Text><Text style={styles.metricValue}>{summary.direct}</Text></View>
        </View>

        <View style={styles.smsCard}>
          <Text style={styles.smsTitle}>Direct channel readiness</Text>
          <Text style={styles.smsBody}>{smsEnabled ? "SMS notifications are enabled. You can build one-click offer messages and reminders." : "SMS channel is off in notifications. Turn it on before sending offer reminders."}</Text>
          <Pressable style={styles.inlineAction} onPress={() => navigation.navigate("MerchantNotifications")}>
            <Text style={styles.inlineActionText}>Open notification settings</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick campaign starters</Text>
          <View style={styles.templateRow}>
            {QUICK_TEMPLATES.map((template) => (
              <Pressable key={template.name} style={styles.templateCard} onPress={() => applyTemplate(template)}>
                <Text style={styles.templateTitle}>{template.name}</Text>
                <Text style={styles.templateMeta}>{template.platform} · {template.type}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {error ? <View style={styles.alertError}><Text style={styles.alertTitle}>Marketing unavailable</Text><Text style={styles.alertBody}>{error}</Text></View> : null}
        {status ? <View style={styles.alertInfo}><Text style={styles.alertBody}>{status}</Text></View> : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Create campaign</Text>
          <TextInput style={styles.input} value={form.name} onChangeText={(value) => updateField("name", value)} placeholder="Campaign name, e.g. Eid flash offer" placeholderTextColor="#6b7280" />
          <View style={styles.pillRow}>
            {TYPE_OPTIONS.map((item) => (
              <Pressable key={item} style={[styles.pill, form.type === item ? styles.pillActive : null]} onPress={() => updateField("type", item)}><Text style={[styles.pillText, form.type === item ? styles.pillTextActive : null]}>{item}</Text></Pressable>
            ))}
          </View>
          <View style={styles.pillRow}>
            {PLATFORM_OPTIONS.map((item) => (
              <Pressable key={item} style={[styles.pill, form.platform === item ? styles.pillActive : null]} onPress={() => updateField("platform", item)}><Text style={[styles.pillText, form.platform === item ? styles.pillTextActive : null]}>{item}</Text></Pressable>
            ))}
          </View>
          <TextInput style={styles.input} value={form.offerTitle} onChangeText={(value) => updateField("offerTitle", value)} placeholder="Offer title" placeholderTextColor="#6b7280" />
          <TextInput style={styles.input} value={form.ctaLabel} onChangeText={(value) => updateField("ctaLabel", value)} placeholder="CTA label" placeholderTextColor="#6b7280" />
          <TextInput style={[styles.input, styles.multilineInput]} value={form.content} onChangeText={(value) => updateField("content", value)} placeholder="Ad content / caption / story script" placeholderTextColor="#6b7280" multiline />
          <TextInput style={[styles.input, styles.multilineInput]} value={form.autoMessage} onChangeText={(value) => updateField("autoMessage", value)} placeholder="One-click customer message" placeholderTextColor="#6b7280" multiline />
          <TextInput style={styles.input} value={form.redirectUrl} onChangeText={(value) => updateField("redirectUrl", value)} placeholder="Redirect URL for ad traffic" placeholderTextColor="#6b7280" autoCapitalize="none" />
          <TextInput style={styles.input} value={form.trackingCode} onChangeText={(value) => updateField("trackingCode", value)} placeholder="Tracking code" placeholderTextColor="#6b7280" autoCapitalize="none" />
          <TextInput style={styles.input} value={form.targetingSummary} onChangeText={(value) => updateField("targetingSummary", value)} placeholder="Audience summary" placeholderTextColor="#6b7280" />
          <Pressable style={styles.primaryButton} onPress={() => void handleCreateCampaign()}>
            <Text style={styles.primaryButtonText}>{saving ? "Creating..." : "Create campaign"}</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Live campaigns</Text>
          {campaigns.map((campaign) => (
            <View key={String(campaign._id || campaign.name)} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderMain}>
                  <Text style={styles.cardTitle}>{campaign.name || "Campaign"}</Text>
                  <Text style={styles.cardMeta}>{campaign.platform || "SOCIAL"} · {campaign.type || "PROMO"} · {campaign.status || "DRAFT"}</Text>
                </View>
                <Pressable style={styles.inlineAction} onPress={() => void shareCampaign(campaign)}>
                  <Text style={styles.inlineActionText}>Share</Text>
                </Pressable>
              </View>
              <Text style={styles.helperText}>{campaign.offerTitle || campaign.content || "Campaign content is still being prepared."}</Text>
              {campaign.redirectUrl ? <Text style={styles.linkText}>{campaign.redirectUrl}</Text> : null}
              {campaign.autoMessage ? <Text style={styles.messagePreview}>Message: {campaign.autoMessage}</Text> : null}
              <Text style={styles.trackingText}>Tracking: {campaign.trackingCode || "Not set"}</Text>
            </View>
          ))}
          {!campaigns.length && !loading ? <Text style={styles.helperText}>No campaigns are active yet. Create the first campaign to start this queue.</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8f4ef" },
  container: { padding: 16, gap: 12, paddingBottom: 118 },
  heroCard: { backgroundColor: "#111827", borderRadius: 18, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  heroEyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", color: "#cbd5e1" },
  title: { fontSize: 20, fontWeight: "700", color: "#ffffff" },
  subtitle: { fontSize: 12, color: "#cbd5e1" },
  refreshButton: { backgroundColor: "#ffffff", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  refreshButtonText: { fontSize: 12, fontWeight: "700", color: "#111827" },
  metricRow: { flexDirection: "row", gap: 10 },
  metricCard: { flex: 1, backgroundColor: "#ffffff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#e5e7eb", gap: 4 },
  metricLabel: { fontSize: 11, color: "#6b7280", textTransform: "uppercase" },
  metricValue: { fontSize: 22, fontWeight: "800", color: "#111827" },
  smsCard: { backgroundColor: "#eff6ff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#bfdbfe", gap: 8 },
  smsTitle: { fontSize: 13, fontWeight: "700", color: "#1d4ed8" },
  smsBody: { fontSize: 12, color: "#1e3a8a" },
  section: { backgroundColor: "#ffffff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#e5e7eb", gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  templateRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  templateCard: { flexGrow: 1, minWidth: "31%", backgroundColor: "#fff7ed", borderRadius: 12, borderWidth: 1, borderColor: "#fed7aa", padding: 10, gap: 4 },
  templateTitle: { fontSize: 12, fontWeight: "700", color: "#9a3412" },
  templateMeta: { fontSize: 10, color: "#7c2d12" },
  alertError: { backgroundColor: "#fef2f2", borderColor: "#fecaca", borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  alertInfo: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe", borderWidth: 1, borderRadius: 14, padding: 14 },
  alertTitle: { fontSize: 13, fontWeight: "700", color: "#991b1b" },
  alertBody: { fontSize: 12, color: "#374151" },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#ffffff", color: "#111827" },
  multilineInput: { minHeight: 86, textAlignVertical: "top" },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "#d1d5db", backgroundColor: "#ffffff" },
  pillActive: { backgroundColor: "#111827", borderColor: "#111827" },
  pillText: { fontSize: 12, fontWeight: "600", color: "#111827" },
  pillTextActive: { color: "#ffffff" },
  primaryButton: { backgroundColor: "#111827", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, alignItems: "center" },
  primaryButtonText: { color: "#ffffff", fontSize: 13, fontWeight: "700" },
  card: { borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", padding: 12, gap: 6 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  cardHeaderMain: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 13, fontWeight: "700", color: "#111827" },
  cardMeta: { fontSize: 11, color: "#6b7280", textTransform: "uppercase" },
  helperText: { fontSize: 12, color: "#6b7280" },
  inlineAction: { alignSelf: "flex-start", backgroundColor: "#fff7ed", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: "#fed7aa" },
  inlineActionText: { fontSize: 11, fontWeight: "700", color: "#9a3412" },
  linkText: { fontSize: 11, color: "#2563eb" },
  messagePreview: { fontSize: 11, color: "#475569" },
  trackingText: { fontSize: 11, color: "#9ca3af" },
});




