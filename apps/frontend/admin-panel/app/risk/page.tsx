"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  AnalyticsCards,
  Badge,
  Button,
  Card,
  CardDescription,
  CardTitle,
  DataTable,
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ProgressBar,
  TextInput,
} from "@dokanx/ui";

import { AdminOpsPageHeader } from "@/components/admin-ops-page-header";
import { formatOpsLag, getOutboxHealth, getQueueHealth, type OutboxState, type QueueState } from "@/lib/admin-ops-health";
import {
  approveShop,
  blockUser,
  freezeWallet,
  getAdminMetrics,
  getFraudAlerts,
  getFraudOverview,
  getFraudReports,
  getOpsSettings,
  listAuditLogs,
  reviewFraudCase,
  suspendShop,
  unblockUser,
  unfreezeWallet,
} from "@/lib/admin-runtime-api";
import type { OpsThresholdSettings } from "@/config/ops-thresholds";

type FraudSignal = {
  code?: string;
  count?: number;
};

type FraudCase = {
  _id?: string;
  entityType?: string;
  entityId?: string;
  orderId?: string;
  userId?: string;
  userName?: string;
  shopId?: string;
  shopName?: string;
  score?: number;
  level?: "safe" | "medium" | "high";
  status?: string;
  reviewRequired?: boolean;
  source?: string;
  summary?: string;
  recommendedActions?: string[];
  updatedAt?: string;
  createdAt?: string;
};

type FraudOverviewState = {
  summary?: {
    cases?: number;
    openCases?: number;
    reviewRequired?: number;
    blockedUsers?: number;
    suspendedMerchants?: number;
    frozenWallets?: number;
    fraudRate?: number;
    paymentFailureRate?: number;
  };
  alerts?: FraudCase[];
};

type FraudReportsState = {
  totalOrders?: number;
  totalAttempts?: number;
  failedAttempts?: number;
  topSignals?: FraudSignal[];
};

type AdminMetricsState = {
  shops?: number;
  orders?: number;
  queues?: Record<string, QueueState>;
  outbox?: OutboxState;
};

type AuditRow = {
  _id?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  performedBy?: { name?: string; email?: string };
  meta?: Record<string, unknown>;
  createdAt?: string;
};

type RiskActionKey =
  | "freeze-wallet"
  | "unfreeze-wallet"
  | "block-user"
  | "unblock-user"
  | "suspend-merchant"
  | "restore-merchant";

export const dynamic = "force-dynamic";

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default function RiskPage() {
  const [overview, setOverview] = useState<FraudOverviewState | null>(null);
  const [alerts, setAlerts] = useState<FraudCase[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([]);
  const [reports, setReports] = useState<FraudReportsState | null>(null);
  const [metrics, setMetrics] = useState<AdminMetricsState | null>(null);
  const [opsSettings, setOpsSettings] = useState<Partial<OpsThresholdSettings> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<RiskActionKey | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [selectedAlertId, setSelectedAlertId] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setError(null);
    setRefreshing(true);
    try {
      const [opsResponse, overviewResponse, alertsResponse, reportsResponse, metricsResponse, auditResponse] = await Promise.all([
        getOpsSettings(),
        getFraudOverview(),
        getFraudAlerts(),
        getFraudReports(),
        getAdminMetrics(),
        listAuditLogs(),
      ]);
      setOpsSettings(opsResponse?.data || null);
      setOverview(overviewResponse.data || null);
      setAlerts(Array.isArray(alertsResponse.data) ? alertsResponse.data : []);
      setReports(reportsResponse.data || null);
      setMetrics(metricsResponse || null);
      setAuditLogs(Array.isArray(auditResponse.data) ? (auditResponse.data as AuditRow[]) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load risk insights.");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredAlerts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return alerts;
    return alerts.filter((item) =>
      [
        item.summary,
        item.entityType,
        item.entityId,
        item.orderId,
        item.shopId,
        item.status,
        item.level,
      ].some((value) => String(value || "").toLowerCase().includes(needle))
    );
  }, [alerts, query]);

  const selectedAlert = useMemo(
    () => filteredAlerts.find((item) => String(item._id || "") === selectedAlertId) || filteredAlerts[0] || null,
    [filteredAlerts, selectedAlertId]
  );

  const queues = useMemo(
    () =>
      Object.entries(metrics?.queues || {}).map(([name, queue]) => ({
        key: name,
        name,
        queue,
        health: getQueueHealth(queue, opsSettings || undefined),
      })),
    [metrics?.queues, opsSettings]
  );

  const paymentsQueue = queues.find((item) => item.key === "payments")?.queue;
  const analyticsQueue = queues.find((item) => item.key === "analytics")?.queue;
  const outboxStatus = getOutboxHealth(metrics?.outbox, opsSettings || undefined);

  const summaryCards = useMemo(
    () => [
      { label: "Open cases", value: String(overview?.summary?.openCases ?? 0), meta: "Active fraud investigations" },
      { label: "Review required", value: String(overview?.summary?.reviewRequired ?? 0), meta: "Cases waiting for admin action" },
      { label: "Payment queue lag", value: formatOpsLag(paymentsQueue?.oldestWaitingMs), meta: `${paymentsQueue?.counts?.waiting ?? 0} waiting jobs` },
      { label: "Analytics queue lag", value: formatOpsLag(analyticsQueue?.oldestWaitingMs), meta: `${analyticsQueue?.counts?.waiting ?? 0} waiting jobs` },
      { label: "Outbox lag", value: formatOpsLag(metrics?.outbox?.oldestPendingLagMs), meta: `${metrics?.outbox?.pending ?? 0} pending events` },
      { label: "Fraud rate", value: formatPercent(overview?.summary?.fraudRate ?? 0), meta: "Flagged orders vs processed orders" },
    ],
    [
      analyticsQueue?.counts?.waiting,
      analyticsQueue?.oldestWaitingMs,
      metrics?.outbox?.oldestPendingLagMs,
      metrics?.outbox?.pending,
      overview?.summary?.fraudRate,
      overview?.summary?.openCases,
      overview?.summary?.reviewRequired,
      paymentsQueue?.counts?.waiting,
      paymentsQueue?.oldestWaitingMs,
    ]
  );

  async function handleReview(caseId: string, action: string) {
    setBusyId(caseId);
    setError(null);
    setStatus(null);
    try {
      await reviewFraudCase({
        caseId,
        action,
        note: reviewNotes[caseId] || undefined,
      });
      setStatus(`Case ${caseId.slice(-6)} marked as ${action}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to review fraud case.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleFreezeSelectedWallet() {
    const shopId = selectedAlert?.shopId;
    if (!shopId) return;
    setBusyAction("freeze-wallet");
    setError(null);
    setStatus(null);
    try {
      const response = await freezeWallet(shopId, { reason: actionReason.trim() || undefined });
      setStatus(response.message || `Wallet frozen for shop ${shopId.slice(-6)}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to freeze wallet.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleBlockSelectedUser() {
    const userId = selectedAlert?.userId;
    if (!userId) return;
    setBusyAction("block-user");
    setError(null);
    setStatus(null);
    try {
      const response = await blockUser(userId, { reason: actionReason.trim() || undefined });
      setStatus(response.message || `User ${userId.slice(-6)} blocked.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to block user.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSuspendSelectedMerchant() {
    const shopId = selectedAlert?.shopId;
    if (!shopId) return;
    setBusyAction("suspend-merchant");
    setError(null);
    setStatus(null);
    try {
      const response = await suspendShop(shopId, { reason: actionReason.trim() || undefined });
      setStatus(response.message || `Merchant ${shopId.slice(-6)} suspended.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to suspend merchant.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleUnfreezeSelectedWallet() {
    const shopId = selectedAlert?.shopId;
    if (!shopId) return;
    setBusyAction("unfreeze-wallet");
    setError(null);
    setStatus(null);
    try {
      const response = await unfreezeWallet(shopId, { reason: actionReason.trim() || undefined });
      setStatus(response.message || `Wallet unfrozen for shop ${shopId.slice(-6)}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to unfreeze wallet.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleUnblockSelectedUser() {
    const userId = selectedAlert?.userId;
    if (!userId) return;
    setBusyAction("unblock-user");
    setError(null);
    setStatus(null);
    try {
      const response = await unblockUser(userId, { reason: actionReason.trim() || undefined });
      setStatus(response.message || `User ${userId.slice(-6)} unblocked.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to unblock user.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRestoreSelectedMerchant() {
    const shopId = selectedAlert?.shopId;
    if (!shopId) return;
    setBusyAction("restore-merchant");
    setError(null);
    setStatus(null);
    try {
      const response = await approveShop(shopId, { reason: actionReason.trim() || undefined });
      setStatus(response.message || `Merchant ${shopId.slice(-6)} restored.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to restore merchant.");
    } finally {
      setBusyAction(null);
    }
  }

  async function confirmPendingAction() {
    if (!pendingAction) return;
    switch (pendingAction) {
      case "freeze-wallet":
        await handleFreezeSelectedWallet();
        break;
      case "unfreeze-wallet":
        await handleUnfreezeSelectedWallet();
        break;
      case "block-user":
        await handleBlockSelectedUser();
        break;
      case "unblock-user":
        await handleUnblockSelectedUser();
        break;
      case "suspend-merchant":
        await handleSuspendSelectedMerchant();
        break;
      case "restore-merchant":
        await handleRestoreSelectedMerchant();
        break;
      default:
        break;
    }
    setPendingAction(null);
    setActionReason("");
  }

  const pendingActionMeta = pendingAction ? getRiskActionMeta(pendingAction, selectedAlert) : null;
  const recentEnforcementActions = useMemo(() => {
    if (!selectedAlert) return [];
    const relevantIds = new Set(
      [selectedAlert.shopId, selectedAlert.userId, selectedAlert.orderId, selectedAlert._id]
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    );
    const relevantActions = new Set([
      "BLOCK_USER",
      "UNBLOCK_USER",
      "APPROVE_SHOP",
      "SUSPEND_SHOP",
      "FREEZE_WALLET",
      "UNFREEZE_WALLET",
      "FRAUD_CASE_REVIEWED",
    ]);

    return auditLogs
      .filter((log) => {
        const action = String(log.action || "").toUpperCase();
        if (!relevantActions.has(action)) return false;
        const targetId = String(log.targetId || "").trim();
        const meta = (log.meta as Record<string, unknown> | undefined) || {};
        const metaShopId = String(meta.shopId || "").trim();
        const metaOrderId = String(meta.orderId || "").trim();
        const metaCaseId = String(meta.caseId || "").trim();
        return [targetId, metaShopId, metaOrderId, metaCaseId].some((value) => value && relevantIds.has(value));
      })
      .slice(0, 6);
  }, [auditLogs, selectedAlert]);

  return (
    <div className="grid gap-6">
      <AdminOpsPageHeader
        eyebrow="Admin control tower"
        title="Risk & Runtime Pressure"
        description="Review fraud signals, watch queue and outbox lag, and see whether platform pressure is operational or abusive."
        tone="dark"
        refreshLabel="Refresh risk desk"
        onRefresh={() => void load()}
        refreshing={refreshing}
        actions={[
          { href: "/security", label: "Tune thresholds", variant: "secondary" },
          { href: "/system-health", label: "Open system health", variant: "outline" },
          { href: "/ai-ops", label: "Open AI ops", variant: "outline" },
        ]}
      />

      {error ? <Alert variant="error">{error}</Alert> : null}
      {status ? <Alert variant="info">{status}</Alert> : null}

      <AnalyticsCards items={summaryCards} />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardTitle>Runtime pressure board</CardTitle>
          <CardDescription className="mt-2">Queue backlog and event drain pressure that can turn into user-facing slowdown.</CardDescription>
          <div className="mt-4 grid gap-3">
            {queues.length ? (
              queues.map(({ key, queue, health }) => {
                const waiting = Number(queue?.counts?.waiting || 0);
                const active = Number(queue?.counts?.active || 0);
                const failed = Number(queue?.counts?.failed || 0);
                const deadLetter = Number(queue?.deadLetter?.waiting || 0) + Number(queue?.deadLetter?.failed || 0);
                const lagCeiling = Number(opsSettings?.lagCriticalMs || 300000);
                const lagMinutes = Math.min(100, lagCeiling ? (Number(queue?.oldestWaitingMs || 0) / lagCeiling) * 100 : 0);

                return (
                  <div key={key} className="rounded-2xl border border-border/60 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-foreground">{queue?.name || key}</p>
                        <p className="text-xs text-muted-foreground">Oldest waiting: {formatOpsLag(queue?.oldestWaitingMs)}</p>
                      </div>
                      <Badge variant={health.variant}>{health.label}</Badge>
                    </div>
                    <div className="mt-3">
                      <ProgressBar value={lagMinutes} />
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                      <div className="rounded-2xl bg-muted/40 px-3 py-2">Waiting: {waiting}</div>
                      <div className="rounded-2xl bg-muted/40 px-3 py-2">Active: {active}</div>
                      <div className="rounded-2xl bg-muted/40 px-3 py-2">Failed: {failed}</div>
                      <div className="rounded-2xl bg-muted/40 px-3 py-2">Dead-letter: {deadLetter}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">Queue metrics are not available yet.</p>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>Outbox & control posture</CardTitle>
          <CardDescription className="mt-2">Event fanout health plus enforcement status across the platform.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
              <span>Outbox health</span>
              <Badge variant={outboxStatus.variant}>{outboxStatus.label}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
              <span>Pending events</span>
              <span>{metrics?.outbox?.pending ?? 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
              <span>In flight</span>
              <span>{metrics?.outbox?.inFlight ?? 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
              <span>Errored events</span>
              <span>{metrics?.outbox?.errored ?? 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
              <span>Oldest pending lag</span>
              <span>{formatOpsLag(metrics?.outbox?.oldestPendingLagMs)}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
              <span>Blocked users</span>
              <span>{overview?.summary?.blockedUsers ?? 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
              <span>Suspended merchants</span>
              <span>{overview?.summary?.suspendedMerchants ?? 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
              <span>Frozen wallets</span>
              <span>{overview?.summary?.frozenWallets ?? 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
              <span>Total payment attempts</span>
              <span>{reports?.totalAttempts ?? 0}</span>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Active ops thresholds</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Watch lag {formatOpsLag(opsSettings?.lagWatchMs)} · Critical lag {formatOpsLag(opsSettings?.lagCriticalMs)}
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <a href="/security">Tune thresholds</a>
              </Button>
            </div>
            <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
              <div className="rounded-2xl bg-background/80 px-3 py-2">
                Queue waiting watch: {opsSettings?.queueWaitingWatch ?? 20}
              </div>
              <div className="rounded-2xl bg-background/80 px-3 py-2">
                Queue active watch: {opsSettings?.queueActiveWatch ?? 10}
              </div>
              <div className="rounded-2xl bg-background/80 px-3 py-2">
                Outbox pending watch: {opsSettings?.outboxPendingWatch ?? 50}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Top fraud signals</CardTitle>
          <CardDescription className="mt-2">Most frequent risk indicators from the engine.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {reports?.topSignals?.length ? (
              reports.topSignals.slice(0, 8).map((signal) => (
                <div
                  key={`${signal.code}-${signal.count}`}
                  className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3"
                >
                  <span>{signal.code || "UNKNOWN_SIGNAL"}</span>
                  <Badge variant="warning">{signal.count ?? 0}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No fraud signals have been reported in the current dataset.</p>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>Fraud review snapshot</CardTitle>
          <CardDescription className="mt-2">Current queue state for investigators and runtime triage.</CardDescription>
          <DataTable
            columns={[
              { key: "case", header: "Case" },
              { key: "entity", header: "Entity" },
              { key: "level", header: "Level" },
              { key: "status", header: "Status" },
              { key: "updated", header: "Updated" },
            ]}
            rows={filteredAlerts.slice(0, 12).map((item) => ({
              id: String(item._id || ""),
              case: item._id ? String(item._id).slice(-6) : "Case",
              entity: `${item.entityType || "UNKNOWN"} ${item.entityId || ""}`.trim(),
              level: item.level || "safe",
              status: item.status || "OPEN",
              updated: item.updatedAt
                ? new Date(item.updatedAt).toLocaleString()
                : item.createdAt
                  ? new Date(item.createdAt).toLocaleString()
                  : "Unknown",
            }))}
          />
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Fraud alert queue</CardTitle>
            <CardDescription className="mt-2">Review, dismiss, or escalate suspicious platform activity.</CardDescription>
          </div>
          <div className="w-full max-w-sm">
            <TextInput
              placeholder="Search by order, entity, shop, level"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4">
          {filteredAlerts.slice(0, 10).map((item) => (
            <div key={String(item._id || "")} className="rounded-2xl border border-border/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={item.level === "high" ? "danger" : item.level === "medium" ? "warning" : "neutral"}>
                      {item.level || "safe"}
                    </Badge>
                    <Badge variant="outline">{item.status || "OPEN"}</Badge>
                    <span className="text-xs text-muted-foreground">{item.source || "risk-engine"}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{item.summary || "Fraud alert"}</p>
                  <p className="text-xs text-muted-foreground">
                    Entity: {item.entityType || "UNKNOWN"} {item.entityId || ""} | Order: {item.orderId || "N/A"} | Shop: {item.shopId || "N/A"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-foreground">{item.score ?? 0}</p>
                  <p className="text-xs text-muted-foreground">risk score</p>
                </div>
              </div>

              {item.recommendedActions?.length ? (
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {item.recommendedActions.map((action) => (
                    <span key={action} className="rounded-full border border-border/60 px-3 py-1">
                      {action}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
                <TextInput
                  placeholder="Review note"
                  value={reviewNotes[item._id || ""] ?? ""}
                  onChange={(event) =>
                    setReviewNotes((current) => ({
                      ...current,
                      [item._id || ""]: event.target.value,
                    }))
                  }
                />
                <Button
                  variant="ghost"
                  disabled={!item._id}
                  onClick={() => setSelectedAlertId(String(item._id || ""))}
                >
                  Inspect
                </Button>
                <Button
                  variant="secondary"
                  disabled={!item._id || busyId === item._id}
                  onClick={() => item._id && handleReview(item._id, "approve")}
                >
                  Approve
                </Button>
                <Button
                  variant="outline"
                  disabled={!item._id || busyId === item._id}
                  onClick={() => item._id && handleReview(item._id, "dismiss")}
                >
                  Dismiss
                </Button>
                <Button
                  variant="ghost"
                  disabled={!item._id || busyId === item._id}
                  onClick={() => item._id && handleReview(item._id, "escalate")}
                >
                  Escalate
                </Button>
              </div>
            </div>
          ))}
          {!filteredAlerts.length ? <p className="text-sm text-muted-foreground">No fraud alerts match the current filter.</p> : null}
        </div>
      </Card>

      <Card>
        <CardTitle>Incident detail</CardTitle>
        <CardDescription className="mt-2">Inspect the selected fraud case, see its incident timeline, and jump to the relevant desk.</CardDescription>
        {selectedAlert ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="grid gap-3 text-sm text-muted-foreground">
              <div className="rounded-2xl border border-border/60 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={selectedAlert.level === "high" ? "danger" : selectedAlert.level === "medium" ? "warning" : "neutral"}>
                    {selectedAlert.level || "safe"}
                  </Badge>
                  <Badge variant="outline">{selectedAlert.status || "OPEN"}</Badge>
                </div>
                <p className="mt-3 font-semibold text-foreground">{selectedAlert.summary || "Fraud alert"}</p>
                <p className="mt-2 text-xs">Case ID {String(selectedAlert._id || "").slice(-6) || "N/A"}</p>
              </div>
              <div className="rounded-2xl border border-border/60 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Entity</p>
                <p className="mt-2 font-semibold text-foreground">
                  {selectedAlert.entityType || "UNKNOWN"} {selectedAlert.entityId || ""}
                </p>
                <p className="mt-1 text-xs">
                  Order {selectedAlert.orderId || "N/A"} | Shop {selectedAlert.shopName || selectedAlert.shopId || "N/A"}
                </p>
                <p className="mt-1 text-xs">
                  User {selectedAlert.userName || selectedAlert.userId || "N/A"}
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Recommended actions</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedAlert.recommendedActions?.length ? (
                    selectedAlert.recommendedActions.map((action) => (
                      <span key={action} className="rounded-full border border-border/60 px-3 py-1 text-xs text-foreground">
                        {action}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs">No recommended action payload was attached.</span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button size="sm" variant="secondary" asChild>
                  <a href="/ai-ops">Open AI Ops</a>
                </Button>
                {selectedAlert.orderId ? (
                  <Button size="sm" variant="outline" asChild>
                    <a href="/orders">Open orders desk</a>
                  </Button>
                ) : null}
                {selectedAlert.shopId ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPendingAction("freeze-wallet")}
                    loading={busyAction === "freeze-wallet"}
                    loadingText="Freezing"
                  >
                    Freeze wallet
                  </Button>
                ) : null}
                {selectedAlert.shopId ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPendingAction("unfreeze-wallet")}
                    loading={busyAction === "unfreeze-wallet"}
                    loadingText="Unfreezing"
                  >
                    Unfreeze wallet
                  </Button>
                ) : null}
                {selectedAlert.userId ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPendingAction("block-user")}
                    loading={busyAction === "block-user"}
                    loadingText="Blocking"
                  >
                    Block user
                  </Button>
                ) : null}
                {selectedAlert.userId ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPendingAction("unblock-user")}
                    loading={busyAction === "unblock-user"}
                    loadingText="Unblocking"
                  >
                    Unblock user
                  </Button>
                ) : null}
                {selectedAlert.shopId ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPendingAction("suspend-merchant")}
                    loading={busyAction === "suspend-merchant"}
                    loadingText="Suspending"
                  >
                    Suspend merchant
                  </Button>
                ) : null}
                {selectedAlert.shopId ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPendingAction("restore-merchant")}
                    loading={busyAction === "restore-merchant"}
                    loadingText="Restoring"
                  >
                    Restore merchant
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Incident timeline</p>
              <div className="mt-4 grid gap-3">
                {buildIncidentTimeline(selectedAlert).map((event) => (
                  <div key={`${event.label}-${event.at || "unknown"}`} className="rounded-2xl border border-border/60 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-foreground">{event.label}</p>
                      <Badge variant="neutral">{event.at ? new Date(event.at).toLocaleString() : "Unknown"}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{event.detail}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 border-t border-border/60 pt-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Recent enforcement actions</p>
                <div className="mt-3 grid gap-3">
                  {recentEnforcementActions.length ? recentEnforcementActions.map((entry) => (
                    <div key={String(entry._id || `${entry.action}-${entry.createdAt}`)} className="rounded-2xl border border-border/60 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-foreground">{String(entry.action || "ACTION").replace(/_/g, " ")}</p>
                        <Badge variant="neutral">{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "Unknown"}</Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        By {entry.performedBy?.name || entry.performedBy?.email || "System"} � {getAuditReason(entry)}
                      </p>
                      <div className="mt-3">
                        <Button size="sm" variant="outline" asChild>
                          <a href={resolveRiskAuditHref(entry, selectedAlert)}>Open related desk</a>
                        </Button>
                      </div>
                    </div>
                  )) : (
                    <p className="text-xs text-muted-foreground">No related enforcement actions have been audited for this incident yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">Select a fraud case to inspect its incident detail.</p>
        )}
      </Card>

      <Modal
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingAction(null);
            setActionReason("");
          }
        }}
      >
        <ModalContent>
          <ModalHeader>
            <ModalTitle>{pendingActionMeta?.title || "Confirm admin action"}</ModalTitle>
            <ModalDescription>{pendingActionMeta?.description || "Review this action before continuing."}</ModalDescription>
          </ModalHeader>
          <div className="grid gap-3 py-2">
            <div className="rounded-2xl border border-border/60 px-4 py-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{pendingActionMeta?.subject || "Selected incident"}</p>
              <p className="mt-1 text-xs">{pendingActionMeta?.target || "No target context available."}</p>
            </div>
            <TextInput
              placeholder="Reason for this admin action"
              value={actionReason}
              onChange={(event) => setActionReason(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              This reason is sent with the admin action and captured in the related audit meta.
            </p>
          </div>
          <ModalFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setPendingAction(null);
                setActionReason("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={() => void confirmPendingAction()} disabled={!actionReason.trim() || busyAction !== null}>
              {busyAction ? "Working..." : pendingActionMeta?.confirmLabel || "Confirm action"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

function buildIncidentTimeline(item: FraudCase) {
  return [
    {
      label: "Case created",
      at: item.createdAt,
      detail: `Signal source ${item.source || "risk-engine"} opened this case.`,
    },
    {
      label: "Latest case update",
      at: item.updatedAt || item.createdAt,
      detail: `Current status is ${item.status || "OPEN"} with score ${item.score ?? 0}.`,
    },
    {
      label: "Review posture",
      at: item.updatedAt || item.createdAt,
      detail: item.reviewRequired ? "Manual review is still required." : "The case is not marked as requiring manual review.",
    },
  ];
}

function getRiskActionMeta(action: RiskActionKey, item: FraudCase | null) {
  const shopLabel = item?.shopName || item?.shopId || "this merchant";
  const userLabel = item?.userName || item?.userId || "this user";

  switch (action) {
    case "freeze-wallet":
      return {
        title: "Freeze wallet?",
        description: "This will stop wallet movement for the selected merchant until an admin unfreezes it.",
        confirmLabel: "Freeze wallet",
        subject: "Merchant wallet containment",
        target: `Target: ${shopLabel}`,
      };
    case "unfreeze-wallet":
      return {
        title: "Unfreeze wallet?",
        description: "This will restore wallet movement for the selected merchant.",
        confirmLabel: "Unfreeze wallet",
        subject: "Merchant wallet recovery",
        target: `Target: ${shopLabel}`,
      };
    case "block-user":
      return {
        title: "Block user?",
        description: "This will prevent the selected user from continuing activity until they are unblocked.",
        confirmLabel: "Block user",
        subject: "User containment",
        target: `Target: ${userLabel}`,
      };
    case "unblock-user":
      return {
        title: "Unblock user?",
        description: "This will restore platform access for the selected user.",
        confirmLabel: "Unblock user",
        subject: "User recovery",
        target: `Target: ${userLabel}`,
      };
    case "suspend-merchant":
      return {
        title: "Suspend merchant?",
        description: "This will suspend the selected merchant account while the incident is under review.",
        confirmLabel: "Suspend merchant",
        subject: "Merchant containment",
        target: `Target: ${shopLabel}`,
      };
    case "restore-merchant":
      return {
        title: "Restore merchant?",
        description: "This will restore the selected merchant account after review.",
        confirmLabel: "Restore merchant",
        subject: "Merchant recovery",
        target: `Target: ${shopLabel}`,
      };
    default:
      return null;
  }
}

function getAuditReason(entry: AuditRow) {
  const meta = (entry.meta as Record<string, unknown> | undefined) || {};
  const reason = String(meta.reason || meta.note || "").trim();
  return reason || "No explicit operator reason captured.";
}

function resolveRiskAuditHref(entry: AuditRow, incident: FraudCase | null) {
  const action = String(entry.action || "").toUpperCase();
  const meta = (entry.meta as Record<string, unknown> | undefined) || {};
  const userQuery = encodeURIComponent(String(incident?.userId || incident?.userName || "").trim());
  const merchantQuery = encodeURIComponent(String(incident?.shopId || incident?.shopName || meta.shopId || "").trim());
  const orderQuery = encodeURIComponent(String(incident?.orderId || meta.orderId || "").trim());
  if (action === "BLOCK_USER" || action === "UNBLOCK_USER") return userQuery ? `/users?q=${userQuery}` : "/users";
  if (action === "APPROVE_SHOP" || action === "SUSPEND_SHOP" || action === "FREEZE_WALLET" || action === "UNFREEZE_WALLET") return merchantQuery ? `/merchants?q=${merchantQuery}` : "/merchants";
  if ((incident?.orderId || String(meta.orderId || "").trim()) && action === "FRAUD_CASE_REVIEWED") return orderQuery ? `/orders?q=${orderQuery}` : "/orders";
  return "/ai-ops";
}
