import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  getMerchantNotificationSettingsRequest,
  listMerchantNotificationsRequest,
  markAllMerchantNotificationsReadRequest,
  markMerchantNotificationReadRequest,
  updateMerchantNotificationSettingsRequest,
} from "../lib/api-client";
import { useMerchantAuthStore } from "../store/auth-store";
import { MerchantTopNav } from "./merchant-top-nav";

type NotificationItem = {
  _id?: string;
  title?: string;
  message?: string;
  type?: string;
  isRead?: boolean;
  createdAt?: string;
};

type SettingsState = {
  channels: Record<string, boolean>;
  categories: Record<string, boolean>;
};

const defaultSettings: SettingsState = {
  channels: { email: true, sms: false, push: true, inApp: true, webhook: true },
  categories: { order: true, payment: true, inventory: true, marketing: false, system: true },
};

export function MerchantNotificationsScreen() {
  const accessToken = useMerchantAuthStore((state) => state.accessToken);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "ORDER" | "PAYMENT" | "INVENTORY" | "SYSTEM">("ALL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.isRead).length, [notifications]);
  const filteredNotifications = useMemo(() => notifications.filter((item) => {
    if (filter === "ALL") return true;
    if (filter === "UNREAD") return !item.isRead;
    return String(item.type || "").toUpperCase().includes(filter);
  }), [filter, notifications]);

  const load = useCallback(async () => {
    if (!accessToken) {
      setError("Merchant session missing. Please sign in again.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [notificationResponse, settingsResponse] = await Promise.all([
        listMerchantNotificationsRequest(accessToken),
        getMerchantNotificationSettingsRequest(accessToken),
      ]);
      setNotifications(notificationResponse.data || []);
      if (settingsResponse.data) {
        setSettings({
          channels: { ...defaultSettings.channels, ...(settingsResponse.data.channels || {}) },
          categories: { ...defaultSettings.categories, ...(settingsResponse.data.categories || {}) },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleMarkRead(id?: string) {
    if (!id || !accessToken) return;
    try {
      await markMerchantNotificationReadRequest(accessToken, id);
      setNotifications((current) => current.map((item) => item._id === id ? { ...item, isRead: true } : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update notification.");
    }
  }

  async function handleMarkAllRead() {
    if (!accessToken) return;
    try {
      await markAllMerchantNotificationsReadRequest(accessToken);
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update notifications.");
    }
  }

  async function handleToggle(section: "channels" | "categories", key: string) {
    if (!accessToken) return;
    const next = {
      ...settings,
      [section]: {
        ...settings[section],
        [key]: !settings[section][key],
      },
    };
    setSettings(next);
    setSaving(true);
    try {
      await updateMerchantNotificationSettingsRequest(accessToken, next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save settings.");
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  }

  function getTone(item: NotificationItem) {
    const type = String(item.type || "SYSTEM").toUpperCase();
    if (type.includes("PAYMENT")) return { bg: "#dcfce7", fg: "#166534" };
    if (type.includes("ORDER")) return { bg: "#dbeafe", fg: "#1d4ed8" };
    if (type.includes("INVENTORY")) return { bg: "#fef3c7", fg: "#92400e" };
    return { bg: "#f3f4f6", fg: "#374151" };
  }

  return (
    <View style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <MerchantTopNav active="Notifications" />
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>{loading ? "Loading..." : `Unread ${unreadCount}`}</Text>
          </View>
          <Pressable style={styles.refreshButton} onPress={() => void load()}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </Pressable>
        </View>

        <View style={styles.filterRow}>
          {(["ALL", "UNREAD", "ORDER", "PAYMENT", "INVENTORY", "SYSTEM"] as const).map((item) => (
            <Pressable key={item} style={[styles.filterPill, filter === item ? styles.filterPillActive : null]} onPress={() => setFilter(item)}>
              <Text style={[styles.filterText, filter === item ? styles.filterTextActive : null]}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.secondaryButton} onPress={() => void handleMarkAllRead()}>
          <Text style={styles.secondaryButtonText}>Mark all read</Text>
        </Pressable>

        {error ? <View style={styles.alertError}><Text style={styles.alertTitle}>Notifications unavailable</Text><Text style={styles.alertBody}>{error}</Text></View> : null}
        {saving ? <Text style={styles.helperText}>Saving preferences...</Text> : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inbox</Text>
          {filteredNotifications.map((item) => (
            <View key={String(item._id || item.createdAt || Math.random())} style={styles.card}>
              <View style={styles.cardHeadRow}><Text style={styles.cardTitle}>{item.title || "Notification"}</Text><Text style={[styles.typeBadge, { backgroundColor: getTone(item).bg, color: getTone(item).fg }]}>{String(item.type || "SYSTEM").toUpperCase()}</Text></View>
              <Text style={styles.cardBody}>{item.message || "No message"}</Text>
              <Text style={styles.cardMeta}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</Text>
              {!item.isRead ? (
                <Pressable style={styles.actionButton} onPress={() => void handleMarkRead(item._id)}>
                  <Text style={styles.actionButtonText}>Mark read</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
          {!filteredNotifications.length && !loading ? <Text style={styles.helperText}>No notifications match the current filter.</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Channels</Text>
          {Object.entries(settings.channels).map(([key, value]) => (
            <Pressable key={key} style={styles.toggleRow} onPress={() => void handleToggle("channels", key)}>
              <Text style={styles.toggleLabel}>{key}</Text>
              <Text style={styles.toggleValue}>{value ? "ON" : "OFF"}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          {Object.entries(settings.categories).map(([key, value]) => (
            <Pressable key={key} style={styles.toggleRow} onPress={() => void handleToggle("categories", key)}>
              <Text style={styles.toggleLabel}>{key}</Text>
              <Text style={styles.toggleValue}>{value ? "ON" : "OFF"}</Text>
            </Pressable>
          ))}
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
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "#d1d5db", backgroundColor: "#ffffff" },
  filterPillActive: { backgroundColor: "#111827", borderColor: "#111827" },
  filterText: { fontSize: 12, fontWeight: "600", color: "#111827" },
  filterTextActive: { color: "#ffffff" },
  secondaryButton: { alignSelf: "flex-start", backgroundColor: "#111827", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  secondaryButtonText: { color: "#ffffff", fontSize: 12, fontWeight: "600" },
  alertError: { backgroundColor: "#fef2f2", borderColor: "#fecaca", borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  alertTitle: { fontSize: 13, fontWeight: "700", color: "#991b1b" },
  alertBody: { fontSize: 12, color: "#374151" },
  helperText: { fontSize: 12, color: "#6b7280" },
  section: { backgroundColor: "#ffffff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#e5e7eb", gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  card: { borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", padding: 12, gap: 6 },
  cardHeadRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 13, fontWeight: "700", color: "#111827" },
  cardBody: { fontSize: 12, color: "#374151" },
  cardMeta: { fontSize: 11, color: "#9ca3af" },
  typeBadge: { fontSize: 10, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, overflow: "hidden" },
  actionButton: { alignSelf: "flex-start", backgroundColor: "#111827", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  actionButtonText: { color: "#ffffff", fontSize: 11, fontWeight: "700" },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  toggleLabel: { fontSize: 12, color: "#111827", textTransform: "capitalize" },
  toggleValue: { fontSize: 12, fontWeight: "700", color: "#9a3412" },
});

