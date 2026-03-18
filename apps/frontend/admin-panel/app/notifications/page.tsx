"use client";

import { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Badge, Button, Card, CardDescription, CardTitle, DataTable, Grid, Input, SelectDropdown } from "@dokanx/ui";
import { useAuthStore } from "@dokanx/auth";
import { getApiBaseUrl } from "@dokanx/utils";

import {
  getNotificationSettings,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationSettings,
} from "@/lib/admin-runtime-api";

type NotificationItem = {
  _id?: string;
  title?: string;
  message?: string;
  type?: string;
  isRead?: boolean;
  createdAt?: string;
  metadata?: Record<string, unknown>;
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
    noNotifications: "No notifications yet.",
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
  const [query, setQuery] = useState("");
  const [readFilter, setReadFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications]
  );
  const typeOptions = useMemo(() => {
    const values = Array.from(new Set(notifications.map((item) => String(item.type || "SYSTEM"))));
    return [{ label: "All types", value: "ALL" }, ...values.map((value) => ({ label: value, value }))];
  }, [notifications]);
  const filteredNotifications = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return notifications.filter((item) => {
      if (readFilter === "READ" && !item.isRead) return false;
      if (readFilter === "UNREAD" && item.isRead) return false;
      if (typeFilter !== "ALL" && String(item.type || "SYSTEM") !== typeFilter) return false;
      if (!needle) return true;
      return [item.title, item.message, item.type]
        .some((value) => String(value || "").toLowerCase().includes(needle));
    });
  }, [notifications, query, readFilter, typeFilter]);
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
          Real-time updates across orders, payments, inventory, and system signals.
        </p>
      </div>

      <Grid minColumnWidth="220px" className="gap-4">
        <Card>
          <CardTitle>Total notifications</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{notifications.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">All inbox items</p>
        </Card>
        <Card>
          <CardTitle>Unread</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{unreadCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Needs acknowledgement</p>
        </Card>
        <Card>
          <CardTitle>Channels enabled</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{Object.values(settings.channels).filter(Boolean).length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Notification delivery channels</p>
        </Card>
        <Card>
          <CardTitle>Categories enabled</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{Object.values(settings.categories).filter(Boolean).length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Active signal categories</p>
        </Card>
      </Grid>

      <Grid>
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle>{t.inbox}</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={handleMarkAllRead}>
                {t.markAllRead}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const csv = buildCsv(
                    filteredNotifications.map((item) => ({
                      title: item.title || "",
                      message: item.message || "",
                      type: item.type || "SYSTEM",
                      status: item.isRead ? "READ" : "UNREAD",
                      createdAt: item.createdAt || "",
                    }))
                  );
                  downloadCsv(csv, `notifications-${new Date().toISOString().slice(0, 10)}.csv`);
                }}
              >
                Export CSV
              </Button>
            </div>
          </div>
          <CardDescription className="mt-2">
            {loading ? "Loading notifications..." : `${t.unread}: ${unreadCount}`}
          </CardDescription>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search notifications"
            />
            <SelectDropdown
              label="Read status"
              value={readFilter}
              onValueChange={setReadFilter}
              options={[
                { label: "All", value: "ALL" },
                { label: "Unread", value: "UNREAD" },
                { label: "Read", value: "READ" },
              ]}
            />
            <SelectDropdown
              label="Type"
              value={typeFilter}
              onValueChange={setTypeFilter}
              options={typeOptions}
            />
          </div>

          <div className="space-y-3">
            {filteredNotifications.length === 0 && !loading ? (
              <p className="text-sm text-muted-foreground">{t.noNotifications}</p>
            ) : null}
            {filteredNotifications.map((item) => (
              <div
                key={item._id}
                className={`rounded-xl border border-white/40 p-4 ${
                  item.isRead ? "bg-white/40" : "bg-white/80"
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
            Choose which channels and categories should send notifications.
          </CardDescription>
          {saving ? <p className="text-xs text-muted-foreground">Saving...</p> : null}

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t.channels}</p>
            {Object.entries(settings.channels).map(([key, value]) => (
              <label key={key} className="flex items-center justify-between rounded-lg border border-white/40 p-3">
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
              <label key={key} className="flex items-center justify-between rounded-lg border border-white/40 p-3">
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

      <Card>
        <CardTitle>Notification audit view</CardTitle>
        <CardDescription className="mt-2">Filtered inbox snapshot for operations review.</CardDescription>
        <DataTable
          columns={[
            { key: "title", header: "Title" },
            { key: "type", header: "Type" },
            { key: "status", header: "Status" },
            { key: "time", header: "Time" },
          ]}
          rows={filteredNotifications.slice(0, 12).map((item) => ({
            id: String(item._id || ""),
            title: item.title || "Notification",
            type: item.type || "SYSTEM",
            status: item.isRead ? "READ" : "UNREAD",
            time: item.createdAt ? new Date(item.createdAt).toLocaleString() : "Unknown",
          }))}
        />
      </Card>
    </div>
  );
}

function buildCsv(rows: Array<Record<string, string | number>>) {
  const headers = rows.length ? Object.keys(rows[0]) : ["title", "message", "type", "status", "createdAt"];
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((key) => `"${String(row[key] ?? "").replace(/\"/g, '""')}"`)
        .join(",")
    ),
  ];
  return lines.join("\n");
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
