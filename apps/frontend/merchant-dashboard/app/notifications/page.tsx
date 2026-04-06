"use client";

import { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Badge, Button, Card, CardDescription, CardTitle, Grid } from "@dokanx/ui";
import { useAuthStore } from "@dokanx/auth";
import { getApiBaseUrl } from "@dokanx/utils";

import {
  getNotificationSettings,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationSettings,
} from "@/lib/runtime-api";

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

const labels = {
  en: {
    inbox: "Inbox",
    unread: "Unread",
    markRead: "Mark read",
    markAllRead: "Mark all read",
    preferences: "Preferences",
    channels: "Channels",
    categories: "Categories",
    read: "Read",
    new: "New",
    noNotifications: "No notifications have landed yet. New order, payment, and inventory updates will appear here.",
    categoryLabels: {
      order: "Order Notifications",
      payment: "Payment Notifications",
      inventory: "Inventory Alerts",
      marketing: "Marketing Notifications",
      system: "System Alerts",
    } as Record<string, string>,
  },
  bn: {
    inbox: "ইনবক্স",
    unread: "অপঠিত",
    markRead: "রিড করুন",
    markAllRead: "সব রিড করুন",
    preferences: "পছন্দসমূহ",
    channels: "চ্যানেল",
    categories: "ক্যাটাগরি",
    read: "রিড",
    new: "নতুন",
    noNotifications: "এখনও কোনো নোটিফিকেশন নেই।",
    categoryLabels: {
      order: "অর্ডার নোটিফিকেশন",
      payment: "পেমেন্ট নোটিফিকেশন",
      inventory: "ইনভেন্টরি অ্যালার্ট",
      marketing: "মার্কেটিং নোটিফিকেশন",
      system: "সিস্টেম অ্যালার্ট",
    } as Record<string, string>,
  },
};

export default function NotificationsPage() {
  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications]
  );
  const locale = (tenant?.language || "en").toLowerCase().startsWith("bn") ? "bn" : "en";
  const t = labels[locale];

  useEffect(() => {
    let socket: Socket | null = null;

    async function load() {
      try {
        setLoading(true);
        const [notificationResponse, settingsResponse] = await Promise.all([
          listNotifications(),
          getNotificationSettings(),
        ]);
        setNotifications((notificationResponse.data as NotificationItem[]) || []);
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
    }

    load();

    if (user?.id || user?._id) {
      const socketBase = getApiBaseUrl().replace(/\/api$/, "");
      socket = io(socketBase, { transports: ["websocket"] });
      socket.on("connect", () => {
        socket?.emit("identify", { userId: user.id || user._id });
      });
      socket.on("notification:new", (payload: NotificationItem) => {
        setNotifications((current) => [payload, ...current]);
      });
    }

    return () => {
      socket?.disconnect();
    };
  }, [user?.id, user?._id]);

  async function handleMarkRead(id?: string) {
    if (!id) return;
    try {
      await markNotificationRead(id);
      setNotifications((current) =>
        current.map((item) => (item._id === id ? { ...item, isRead: true } : item))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update notification.");
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update notifications.");
    }
  }

  async function handleToggle(section: "channels" | "categories", key: string) {
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
      await updateNotificationSettings(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save settings.");
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Operations</p>
        <h1 className="dx-display text-3xl">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Track live updates for orders, payments, and inventory alerts.
        </p>
      </div>

      <Grid>
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle>{t.inbox}</CardTitle>
            <Button variant="secondary" size="sm" onClick={handleMarkAllRead}>
              {t.markAllRead}
            </Button>
          </div>
          <CardDescription className="mt-2">
            {loading ? "Loading notifications..." : `${t.unread}: ${unreadCount}`}
          </CardDescription>
          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <div className="space-y-3">
            {notifications.length === 0 && !loading ? (
              <p className="text-sm text-muted-foreground">{t.noNotifications}</p>
            ) : null}
            {notifications.map((item) => (
              <div
                key={item._id}
                className={`rounded-xl border border-border/50 p-4 ${
                  item.isRead ? "bg-muted/20" : "bg-muted/60"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.title || "Notification"}</p>
                    <p className="text-xs text-muted-foreground">{item.message}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={item.isRead ? "neutral" : "success"}>
                      {item.isRead ? t.read : t.new}
                    </Badge>
                    <Button variant="secondary" size="sm" onClick={() => handleMarkRead(item._id)}>
                      {t.markRead}
                    </Button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-4">
          <CardTitle>{t.preferences}</CardTitle>
          <CardDescription className="mt-2">
            Control channels for operational and marketing alerts.
          </CardDescription>
          {saving ? <p className="text-xs text-muted-foreground">Saving...</p> : null}

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t.channels}</p>
            {Object.entries(settings.channels).map(([key, value]) => (
              <label key={key} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                <span className="text-sm font-semibold capitalize text-foreground">{key}</span>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={() => handleToggle("channels", key)}
                  className="h-4 w-4 accent-foreground"
                />
              </label>
            ))}
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t.categories}</p>
            {Object.entries(settings.categories).map(([key, value]) => (
              <label key={key} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                <span className="text-sm font-semibold text-foreground">
                  {t.categoryLabels[key] || key}
                </span>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={() => handleToggle("categories", key)}
                  className="h-4 w-4 accent-foreground"
                />
              </label>
            ))}
          </div>
        </Card>
      </Grid>
    </div>
  );
}

