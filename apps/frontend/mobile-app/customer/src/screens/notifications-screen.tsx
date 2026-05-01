"use client";

import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { listNotificationsRequest, markAllNotificationsReadRequest, markNotificationReadRequest } from "../lib/api-client";
import { useAuthStore } from "../store/auth-store";

type NotificationItem = {
  _id?: string;
  id?: string;
  title?: string;
  message?: string;
  type?: string;
  read?: boolean;
  createdAt?: string;
  metadata?: Record<string, unknown>;
};

const BRAND = {
  navy: "#0B1E3C",
  navySoft: "#17325F",
  orange: "#FF7A00",
  bg: "#F4F7FB",
  surface: "#FFFFFF",
  surfaceMuted: "#EEF3F9",
  border: "#D7DFEA",
  text: "#122033",
  textMuted: "#5F6F86",
};

export default function NotificationsScreen() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!accessToken) return;

    try {
      setLoading(true);
      setError(null);
      const response = await listNotificationsRequest(accessToken);
      const data = Array.isArray(response.data) ? response.data : [];
      setNotifications(data as NotificationItem[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!accessToken) return;

    try {
      await markNotificationReadRequest(accessToken, notificationId);
      setNotifications((current) =>
        current.map((notif) =>
          (notif._id === notificationId || notif.id === notificationId)
            ? { ...notif, read: true }
            : notif
        )
      );
    } catch (err) {
      // Silently fail
    }
  }, [accessToken]);

  const markAllAsRead = useCallback(async () => {
    if (!accessToken) return;

    try {
      await markAllNotificationsReadRequest(accessToken);
      setNotifications((current) => current.map((notif) => ({ ...notif, read: true })));
    } catch (err) {
      // Silently fail
    }
  }, [accessToken]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          ) : null}
          {unreadCount > 0 ? (
            <Pressable style={styles.markAllButton} onPress={markAllAsRead}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </Pressable>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.centerContent}>
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={loadNotifications}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.centerContent}>
            <Text style={styles.emptyText}>No notifications yet</Text>
            <Text style={styles.emptySubtext}>We'll notify you about orders, offers, and updates</Text>
          </View>
        ) : (
          <View style={styles.notificationsList}>
            {notifications.map((notification) => (
              <Pressable
                key={notification._id || notification.id}
                style={[styles.notificationCard, !notification.read && styles.unreadCard]}
                onPress={() => markAsRead(notification._id || notification.id || "")}
              >
                <View style={styles.notificationHeader}>
                  <Text style={styles.notificationTitle}>{String(notification.title || "Notification")}</Text>
                  {!notification.read && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.notificationMessage}>{String(notification.message || "")}</Text>
                <Text style={styles.notificationTime}>
                  {notification.createdAt
                    ? new Date(notification.createdAt).toLocaleDateString()
                    : "Recently"}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BRAND.bg,
  },
  container: {
    flexGrow: 1,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: BRAND.text,
  },
  badge: {
    backgroundColor: BRAND.orange,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: BRAND.surface,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  markAllText: {
    fontSize: 14,
    color: BRAND.navy,
    fontWeight: "600",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: BRAND.textMuted,
  },
  errorText: {
    fontSize: 16,
    color: "#dc2626",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: BRAND.navy,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: BRAND.surface,
    fontSize: 14,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: BRAND.text,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: BRAND.textMuted,
    textAlign: "center",
    marginTop: 8,
  },
  notificationsList: {
    gap: 12,
  },
  notificationCard: {
    backgroundColor: BRAND.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  unreadCard: {
    borderColor: BRAND.orange,
    borderWidth: 2,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: BRAND.text,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND.orange,
  },
  notificationMessage: {
    fontSize: 14,
    color: BRAND.textMuted,
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: BRAND.textMuted,
    fontWeight: "500",
  },
});