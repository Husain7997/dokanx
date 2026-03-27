import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import {
  createMerchantCampaignRequest,
  getMerchantNotificationSettingsRequest,
  listMerchantCampaignsRequest,
} from "../lib/api-client";
import { useMerchantAuthStore } from "../store/auth-store";
import { useMerchantNavigation } from "../navigation/merchant-navigation";
import { MerchantTopNav } from "./merchant-top-nav";

type MerchantCampaign = {
  id: string;
  name: string;
  type: string;
  status: string;
};

const QUICK_TEMPLATES = [
  { name: "Due reminder", type: "REMINDER", text: "Friendly due reminder for customers with outstanding balance." },
  { name: "Win-back", type: "WINBACK", text: "Invite inactive customers back with a small offer." },
  { name: "New stock alert", type: "PROMO", text: "Announce new arrivals and fast-moving stock." },
] as const;

export function MerchantMarketingScreen() {
  const accessToken = useMerchantAuthStore((state) => state.accessToken);
  const navigation = useMerchantNavigation();
  const [campaigns, setCampaigns] = useState<MerchantCampaign[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("PROMO");
  const [templateText, setTemplateText] = useState("");
  const [loading, setLoading] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const summary = useMemo(() => {
    return campaigns.reduce(
      (accumulator, campaign) => {
        accumulator.total += 1;
        if (campaign.status.toUpperCase() === "ACTIVE") {
          accumulator.active += 1;
        }
        return accumulator;
      },
      { total: 0, active: 0 },
    );
  }, [campaigns]);

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
      const rows = (response.data || []).map((row) => ({
        id: String(row._id || ""),
        name: String(row.name || "Campaign"),
        type: String(row.type || "PROMO"),
        status: String(row.status || "DRAFT"),
      })).filter((row) => row.id);
      setCampaigns(rows);
      setSmsEnabled(Boolean(settingsResponse.data?.channels?.sms));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load campaigns.");
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  async function handleCreateCampaign() {
    if (!accessToken) {
      setError("Merchant session missing. Please sign in again.");
      return;
    }
    if (!name.trim()) {
      setError("Campaign name is required.");
      return;
    }

    setSaving(true);
    setError(null);
    setStatus(null);

    try {
      await createMerchantCampaignRequest(accessToken, {
        name: name.trim(),
        type: type.trim() || "PROMO",
      });
      setName("");
      setType("PROMO");
      setTemplateText("");
      await loadCampaigns();
      setStatus("Campaign created and reloaded from backend.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create campaign.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <MerchantTopNav active="Marketing" />
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Marketing</Text>
            <Text style={styles.subtitle}>{loading ? "Syncing campaigns" : `${summary.active} active of ${summary.total}`}</Text>
          </View>
          <Pressable style={styles.refreshButton} onPress={() => void loadCampaigns()}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </Pressable>
        </View>

        <View style={styles.smsCard}>
          <Text style={styles.smsTitle}>SMS channel</Text>
          <Text style={styles.smsBody}>{smsEnabled ? "SMS sending is enabled in notification settings." : "SMS sending is currently off in notification settings."}</Text>
          <Text style={styles.smsMeta}>Purchase and balance APIs are not exposed by backend yet, so this app does not fake SMS credit purchase.</Text>
          <Pressable style={styles.refreshButton} onPress={() => navigation.navigate("MerchantNotifications")}>
            <Text style={styles.refreshButtonText}>Open notification settings</Text>
          </Pressable>
        </View>

        <View style={styles.templateRow}>
          {QUICK_TEMPLATES.map((template) => (
            <Pressable key={template.name} style={styles.templateCard} onPress={() => { setName(template.name); setType(template.type); setTemplateText(template.text); }}>
              <Text style={styles.templateTitle}>{template.name}</Text>
              <Text style={styles.templateMeta}>{template.type}</Text>
            </Pressable>
          ))}
        </View>

        {error ? <View style={styles.alertError}><Text style={styles.alertTitle}>Campaigns unavailable</Text><Text style={styles.alertBody}>{error}</Text></View> : null}
        {status ? <View style={styles.alertInfo}><Text style={styles.alertBody}>{status}</Text></View> : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Create campaign</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Campaign name" />
          <TextInput style={styles.input} value={type} onChangeText={setType} placeholder="Type: PROMO / REMINDER / WINBACK" autoCapitalize="characters" />
          <TextInput style={[styles.input, styles.multilineInput]} value={templateText} onChangeText={setTemplateText} placeholder="Campaign message / template" multiline />
          <Pressable style={styles.primaryButton} onPress={() => void handleCreateCampaign()}>
            <Text style={styles.primaryButtonText}>{saving ? "Creating..." : "Create campaign"}</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Live campaigns</Text>
          {campaigns.map((campaign) => (
            <View key={campaign.id} style={styles.card}>
              <Text style={styles.cardTitle}>{campaign.name}</Text>
              <Text style={styles.cardMeta}>{campaign.type} | {campaign.status}</Text>
              <Text style={styles.helperText}>{campaign.status.toUpperCase() === "ACTIVE" ? "Live campaign in progress." : "Ready for operator follow-up."}</Text>
            </View>
          ))}
          {!campaigns.length && !loading ? <Text style={styles.helperText}>No campaigns returned from backend.</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8f4ef" },
  container: { padding: 16, gap: 12, paddingBottom: 118 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 12, color: "#6b7280" },
  refreshButton: { backgroundColor: "#fff7ed", borderRadius: 10, borderWidth: 1, borderColor: "#fed7aa", paddingHorizontal: 12, paddingVertical: 8 },
  refreshButtonText: { fontSize: 12, fontWeight: "600", color: "#9a3412" },
  smsCard: { backgroundColor: "#eff6ff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#bfdbfe", gap: 6 },
  smsTitle: { fontSize: 13, fontWeight: "700", color: "#1d4ed8" },
  smsBody: { fontSize: 12, color: "#1e3a8a" },
  smsMeta: { fontSize: 11, color: "#475569" },
  templateRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  templateCard: { flexGrow: 1, minWidth: "31%", backgroundColor: "#fff7ed", borderRadius: 12, borderWidth: 1, borderColor: "#fed7aa", padding: 10, gap: 4 },
  templateTitle: { fontSize: 12, fontWeight: "700", color: "#9a3412" },
  templateMeta: { fontSize: 10, color: "#7c2d12" },
  alertError: { backgroundColor: "#fef2f2", borderColor: "#fecaca", borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  alertInfo: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe", borderWidth: 1, borderRadius: 14, padding: 14 },
  alertTitle: { fontSize: 13, fontWeight: "700", color: "#991b1b" },
  alertBody: { fontSize: 12, color: "#374151" },
  section: { backgroundColor: "#ffffff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#e5e7eb", gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#ffffff" },
  multilineInput: { minHeight: 88, textAlignVertical: "top" },
  primaryButton: { backgroundColor: "#111827", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, alignItems: "center" },
  primaryButtonText: { color: "#ffffff", fontSize: 13, fontWeight: "700" },
  card: { borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", padding: 12, gap: 6 },
  cardTitle: { fontSize: 13, fontWeight: "700", color: "#111827" },
  cardMeta: { fontSize: 12, color: "#6b7280", textTransform: "uppercase" },
  helperText: { fontSize: 12, color: "#6b7280" },
});

