"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, AnalyticsCards, Badge, Button, Card, CardDescription, CardTitle, DataTable, Input } from "@dokanx/ui";

import {
  checkFraudTransaction,
  getClaimAnalytics,
  getFraudAlerts,
  getFraudOverview,
  getFraudReports,
  listClaims,
  updateClaimStatus,
  reviewFraudCase,
} from "@/lib/admin-runtime-api";

type FraudSignal = {
  code?: string;
  label?: string;
  weight?: number;
  value?: unknown;
  threshold?: unknown;
};

type FraudCase = {
  _id?: string;
  entityType?: string;
  entityId?: string;
  orderId?: string;
  paymentAttemptId?: string;
  userId?: string;
  userName?: string;
  shopId?: string;
  shopName?: string;
  score?: number;
  level?: "safe" | "medium" | "high";
  status?: string;
  summary?: string;
  signals?: FraudSignal[];
  recommendedActions?: string[];
  updatedAt?: string;
};

type OverviewState = {
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
  flaggedOrders?: FraudCase[];
  suspiciousUsers?: Array<{
    userId?: string;
    userName?: string;
    score?: number;
    orderCount?: number;
    latestCaseAt?: string;
  }>;
  highRiskMerchants?: Array<{
    shopId?: string;
    shopName?: string;
    score?: number;
    caseCount?: number;
    latestCaseAt?: string;
  }>;
  alerts?: FraudCase[];
  analytics?: {
    totalOrders?: number;
    totalAttempts?: number;
    failedAttempts?: number;
    topSignals?: Array<{ code?: string; count?: number }>;
  };
};

export const dynamic = "force-dynamic";

export default function OrdersPage() {
  const [overview, setOverview] = useState<OverviewState | null>(null);
  const [alerts, setAlerts] = useState<FraudCase[]>([]);
  const [claims, setClaims] = useState<Array<Record<string, unknown>>>([]);
  const [claimAnalytics, setClaimAnalytics] = useState<Record<string, unknown> | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [reviewNote, setReviewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [overviewResponse, alertsResponse, reportsResponse] = await Promise.all([
        getFraudOverview(),
        getFraudAlerts(),
        getFraudReports(),
      ]);
      const [claimResponse, claimAnalyticsResponse] = await Promise.all([
        listClaims(),
        getClaimAnalytics(),
      ]);

      const normalizedOverview = normalizeOverview(overviewResponse.data, reportsResponse.data);
      setOverview(normalizedOverview);
      setAlerts(normalizeFraudCases(alertsResponse.data));
      setClaims(Array.isArray(claimResponse.data) ? claimResponse.data : []);
      setClaimAnalytics((claimAnalyticsResponse.data || null) as Record<string, unknown> | null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load fraud controls.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const allCases = useMemo(() => {
    const map = new Map<string, FraudCase>();
    [...(overview?.flaggedOrders || []), ...(alerts || []), ...(overview?.alerts || [])].forEach((item) => {
      if (!item._id) return;
      map.set(String(item._id), item);
    });
    return Array.from(map.values());
  }, [alerts, overview?.alerts, overview?.flaggedOrders]);

  useEffect(() => {
    if (!selectedCaseId && allCases[0]?._id) {
      setSelectedCaseId(String(allCases[0]._id));
    }
  }, [allCases, selectedCaseId]);

  const selectedCase = useMemo(
    () => allCases.find((item) => String(item._id || "") === selectedCaseId) || null,
    [allCases, selectedCaseId]
  );

  const cards = useMemo(() => {
    const summary = overview?.summary || {};
    return [
      { label: "Fraud cases", value: String(summary.cases ?? 0), meta: "Tracked transactions" },
      { label: "Open reviews", value: String(summary.openCases ?? 0), meta: "Needs analyst action" },
      { label: "High risk", value: String(summary.reviewRequired ?? 0), meta: "Manual review queue" },
      { label: "Fraud rate", value: `${summary.fraudRate ?? 0}%`, meta: "Flagged orders / total" },
      { label: "Payment failure", value: `${summary.paymentFailureRate ?? 0}%`, meta: "Failed attempts" },
      { label: "Blocked users", value: String(summary.blockedUsers ?? 0), meta: "Abusive accounts" },
      { label: "Suspended merchants", value: String(summary.suspendedMerchants ?? 0), meta: "Abuse control" },
      { label: "Frozen wallets", value: String(summary.frozenWallets ?? 0), meta: "Held payouts" },
    ];
  }, [overview?.summary]);

  async function handleReview(action: string) {
    if (!selectedCase?._id) return;
    setBusy(true);
    setStatus(null);
    try {
      await reviewFraudCase({
        caseId: String(selectedCase._id),
        action,
        note: reviewNote,
      });
      setStatus(`Action applied: ${action}`);
      await loadData();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Unable to apply review action.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRecheck() {
    if (!selectedCase?.orderId) return;
    setBusy(true);
    setStatus(null);
    try {
      await checkFraudTransaction({
        orderId: String(selectedCase.orderId),
        paymentAttemptId: selectedCase.paymentAttemptId ? String(selectedCase.paymentAttemptId) : undefined,
        source: "admin_recheck",
      });
      setStatus("Transaction rescored.");
      await loadData();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Unable to rescore transaction.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="dx-display text-3xl">Fraud Detection</h1>
        <p className="text-sm text-muted-foreground">
          Payment fraud, fake order risk, suspicious users, and merchant abuse in one review queue.
        </p>
      </div>

      <AnalyticsCards items={cards} />

      {loading ? <Alert variant="info">Loading fraud controls...</Alert> : null}

      {error ? (
        <Alert variant="warning">{error}</Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Warranty claim analytics</CardTitle>
          <CardDescription className="mt-2">Admin monitoring for warranty and guarantee activity.</CardDescription>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            <p>Total claims: {Number(claimAnalytics?.totalClaims || 0)}</p>
            <p>Pending: {Number(claimAnalytics?.pending || 0)}</p>
            <p>Resolved: {Number(claimAnalytics?.resolved || 0)}</p>
            <p>Refunds: {Number(claimAnalytics?.refunds || 0)}</p>
          </div>
        </Card>

        <Card>
          <CardTitle>Claim override queue</CardTitle>
          <CardDescription className="mt-2">Override merchant decisions and monitor abuse flags.</CardDescription>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            {claims.slice(0, 8).map((claim, index) => (
              <div key={`${String(claim._id || index)}`} className="rounded-2xl border border-border/60 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-foreground">
                    {String(claim.type || "claim").toUpperCase()} {String(claim.status || "pending").toUpperCase()}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={async () => {
                      if (!claim._id) return;
                      await updateClaimStatus(String(claim._id), { status: "approved", decisionNote: "Admin override" });
                      await loadData();
                    }}>
                      Approve
                    </Button>
                    <Button size="sm" onClick={async () => {
                      if (!claim._id) return;
                      await updateClaimStatus(String(claim._id), { status: "resolved", resolutionType: "refund", decisionNote: "Admin refund override" });
                      await loadData();
                    }}>
                      Refund
                    </Button>
                  </div>
                </div>
                <p className="mt-2 text-xs">Order {String(claim.orderId || "")} | Product {String(claim.productId || "")}</p>
                {!!(claim.fraudFlags && Array.isArray(claim.fraudFlags) && claim.fraudFlags.length) ? (
                  <p className="mt-1 text-xs">Flags: {(claim.fraudFlags as string[]).join(", ")}</p>
                ) : null}
              </div>
            ))}
            {!claims.length ? <p>No warranty claims found.</p> : null}
          </div>
        </Card>

        <Card>
          <CardTitle>Live alerts</CardTitle>
          <CardDescription className="mt-2">Medium and high risk cases generated by the scoring engine.</CardDescription>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            {(alerts.length ? alerts : overview?.alerts || []).slice(0, 8).map((item) => (
              <button
                key={String(item._id)}
                type="button"
                onClick={() => setSelectedCaseId(String(item._id || ""))}
                className="rounded-2xl border border-border/60 px-4 py-3 text-left"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-foreground">
                    {String(item.entityType || "case").toUpperCase()} {String(item.entityId || "").slice(-6)}
                  </span>
                  <Badge variant={resolveBadge(item.level)}>{formatLevel(item.level, item.score)}</Badge>
                </div>
                <p className="mt-2 text-sm">{item.summary || "Fraud alert generated."}</p>
                <p className="mt-2 text-xs">
                  {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "Unknown time"}
                </p>
              </button>
            ))}
            {!loading && !(alerts.length || overview?.alerts?.length) ? <p>No active fraud alerts.</p> : null}
          </div>
        </Card>

        <Card>
          <CardTitle>Fraud analytics</CardTitle>
          <CardDescription className="mt-2">Platform-level anomaly rates and dominant attack signals.</CardDescription>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            <div className="rounded-2xl border border-border/60 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Attempts</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{overview?.analytics?.totalAttempts ?? 0}</p>
              <p className="text-xs">Failed: {overview?.analytics?.failedAttempts ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-border/60 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Top signals</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(overview?.analytics?.topSignals || []).map((signal) => (
                  <Badge key={String(signal.code)} variant="neutral">
                    {signal.code} {signal.count}
                  </Badge>
                ))}
                {!overview?.analytics?.topSignals?.length ? <span>No signal data yet.</span> : null}
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Coverage</p>
              <p className="mt-2">Orders scored: {overview?.analytics?.totalOrders ?? 0}</p>
              <p className="text-xs">Signals include IP, device fingerprint, account age, refunds, and payment failures.</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Flagged orders</CardTitle>
          <CardDescription className="mt-2">Orders currently carrying fraud risk.</CardDescription>
          <DataTable
            columns={[
              { key: "order", header: "Order" },
              { key: "score", header: "Risk" },
              { key: "status", header: "Status" },
              { key: "action", header: "Action" },
            ]}
            rows={(overview?.flaggedOrders || []).map((item) => ({
              order: `#${String(item.orderId || item.entityId || "").slice(-6)}`,
              score: <Badge variant={resolveBadge(item.level)}>{formatLevel(item.level, item.score)}</Badge>,
              status: item.status || "OPEN",
              action: (
                <Button size="sm" variant="secondary" onClick={() => setSelectedCaseId(String(item._id || ""))}>
                  Review
                </Button>
              ),
            }))}
          />
        </Card>

        <Card>
          <CardTitle>Suspicious users</CardTitle>
          <CardDescription className="mt-2">Users repeatedly associated with flagged transactions.</CardDescription>
          <DataTable
            columns={[
              { key: "user", header: "User" },
              { key: "score", header: "Risk" },
              { key: "orders", header: "Flagged orders" },
              { key: "lastSeen", header: "Last seen" },
            ]}
            rows={(overview?.suspiciousUsers || []).map((item) => ({
              user: item.userName || String(item.userId || "").slice(-6),
              score: <Badge variant={resolveBadgeFromScore(item.score)}>{item.score ?? 0}/100</Badge>,
              orders: item.orderCount ?? 0,
              lastSeen: item.latestCaseAt ? new Date(item.latestCaseAt).toLocaleString() : "Unknown",
            }))}
          />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card>
          <CardTitle>High risk merchants</CardTitle>
          <CardDescription className="mt-2">Merchants linked to repeated refund or abuse patterns.</CardDescription>
          <DataTable
            columns={[
              { key: "merchant", header: "Merchant" },
              { key: "score", header: "Risk" },
              { key: "cases", header: "Cases" },
              { key: "lastSeen", header: "Last seen" },
            ]}
            rows={(overview?.highRiskMerchants || []).map((item) => ({
              merchant: item.shopName || String(item.shopId || "").slice(-6),
              score: <Badge variant={resolveBadgeFromScore(item.score)}>{item.score ?? 0}/100</Badge>,
              cases: item.caseCount ?? 0,
              lastSeen: item.latestCaseAt ? new Date(item.latestCaseAt).toLocaleString() : "Unknown",
            }))}
          />
        </Card>

        <Card>
          <CardTitle>Review console</CardTitle>
          <CardDescription className="mt-2">Approve, investigate, block, suspend, freeze, or rescore.</CardDescription>
          {selectedCase ? (
            <div className="mt-4 grid gap-4 text-sm text-muted-foreground">
              <div className="rounded-2xl border border-border/60 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-foreground">
                    {String(selectedCase.entityType || "case").toUpperCase()} {String(selectedCase.entityId || "").slice(-6)}
                  </span>
                  <Badge variant={resolveBadge(selectedCase.level)}>{formatLevel(selectedCase.level, selectedCase.score)}</Badge>
                </div>
                <p className="mt-2">{selectedCase.summary || "No summary provided."}</p>
                <p className="mt-2 text-xs">Status: {selectedCase.status || "OPEN"}</p>
              </div>

              <div className="rounded-2xl border border-border/60 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Signals</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(selectedCase.signals || []).map((signal) => (
                    <Badge key={`${signal.code}-${signal.label}`} variant="neutral">
                      {signal.label} +{signal.weight ?? 0}
                    </Badge>
                  ))}
                  {!selectedCase.signals?.length ? <span>No fraud signals listed.</span> : null}
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Analyst note</p>
                <Input
                  className="mt-3"
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  placeholder="Add review note for this fraud case"
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => handleReview("APPROVE")} disabled={busy}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleReview("INVESTIGATE")} disabled={busy}>
                    Investigate
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleReview("BLOCK_USER")} disabled={busy || !selectedCase.userId}>
                    Block user
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReview("SUSPEND_MERCHANT")}
                    disabled={busy || !selectedCase.shopId}
                  >
                    Suspend merchant
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReview("FREEZE_WALLET")}
                    disabled={busy || !selectedCase.shopId}
                  >
                    Freeze wallet
                  </Button>
                  <Button size="sm" onClick={handleRecheck} disabled={busy || !selectedCase.orderId}>
                    Recheck
                  </Button>
                </div>
                {status ? <p className="mt-3 text-xs">{status}</p> : null}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Select a fraud case to review.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function resolveBadge(level?: string) {
  if (level === "high") return "danger" as const;
  if (level === "medium") return "warning" as const;
  return "neutral" as const;
}

function resolveBadgeFromScore(score?: number) {
  if ((score || 0) >= 61) return "danger" as const;
  if ((score || 0) >= 31) return "warning" as const;
  return "neutral" as const;
}

function formatLevel(level?: string, score?: number) {
  return `${String(level || "safe").toUpperCase()} ${score ?? 0}/100`;
}

function normalizeFraudCases(input: unknown): FraudCase[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item, index) => normalizeFraudCase(item, index))
    .filter((item): item is FraudCase => item !== null);
}

function normalizeFraudCase(input: unknown, index = 0): FraudCase | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;
  const id = firstString(row._id, row.entityId, row.orderId, `case-${index}`);
  return {
    _id: id,
    entityType: firstString(row.entityType, "case"),
    entityId: firstString(row.entityId, row.orderId, id),
    orderId: toOptionalString(row.orderId),
    paymentAttemptId: toOptionalString(row.paymentAttemptId),
    userId: toOptionalString(row.userId),
    shopId: toOptionalString(row.shopId),
    score: toNumber(row.score),
    level: normalizeLevel(row.level, row.score),
    status: firstString(row.status, "OPEN"),
    summary: firstString(row.summary, "Fraud alert generated."),
    signals: normalizeSignals(row.signals),
    recommendedActions: Array.isArray(row.recommendedActions)
      ? row.recommendedActions.map((value) => String(value))
      : [],
    updatedAt: toOptionalString(row.updatedAt, row.createdAt),
  };
}

function normalizeSignals(input: unknown): FraudSignal[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      return {
        code: toOptionalString(row.code),
        label: firstString(row.label, row.code, "Signal"),
        weight: toNumber(row.weight) ?? 0,
        value: row.value,
        threshold: row.threshold,
      };
    })
    .filter(Boolean) as FraudSignal[];
}

function normalizeOverview(overview: unknown, reports: unknown): OverviewState {
  const source = overview && typeof overview === "object" ? (overview as Record<string, unknown>) : {};
  const reportData = reports && typeof reports === "object" ? (reports as Record<string, unknown>) : {};
  const summary = source.summary && typeof source.summary === "object" ? (source.summary as Record<string, unknown>) : {};
  const analytics =
    source.analytics && typeof source.analytics === "object"
      ? (source.analytics as Record<string, unknown>)
      : reportData;

  return {
    summary: {
      cases: toNumber(summary.cases) ?? 0,
      openCases: toNumber(summary.openCases) ?? 0,
      reviewRequired: toNumber(summary.reviewRequired) ?? 0,
      blockedUsers: toNumber(summary.blockedUsers) ?? 0,
      suspendedMerchants: toNumber(summary.suspendedMerchants) ?? 0,
      frozenWallets: toNumber(summary.frozenWallets) ?? 0,
      fraudRate: toNumber(summary.fraudRate) ?? 0,
      paymentFailureRate: toNumber(summary.paymentFailureRate) ?? 0,
    },
    flaggedOrders: normalizeFraudCases(source.flaggedOrders),
    alerts: normalizeFraudCases(source.alerts),
    suspiciousUsers: normalizeRiskRows(source.suspiciousUsers, "userId", "orderCount"),
    highRiskMerchants: normalizeRiskRows(source.highRiskMerchants, "shopId", "caseCount"),
    analytics: {
      totalOrders: toNumber(analytics.totalOrders) ?? 0,
      totalAttempts: toNumber(analytics.totalAttempts) ?? 0,
      failedAttempts: toNumber(analytics.failedAttempts) ?? 0,
      topSignals: Array.isArray(analytics.topSignals)
        ? analytics.topSignals
            .map((item) => {
              if (!item || typeof item !== "object") return null;
              const row = item as Record<string, unknown>;
              return {
                code: firstString(row.code, "UNKNOWN"),
                count: toNumber(row.count) ?? 0,
              };
            })
            .filter(Boolean) as Array<{ code?: string; count?: number }>
        : [],
    },
  };
}

function normalizeRiskRows(input: unknown, idKey: "userId" | "shopId", countKey: "orderCount" | "caseCount") {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      return {
        [idKey]: toOptionalString(row[idKey]),
        score: toNumber(row.score) ?? 0,
        [countKey]: toNumber(row[countKey]) ?? 0,
        latestCaseAt: toOptionalString(row.latestCaseAt),
      };
    })
    .filter((item) => item !== null) as Array<{
      userId?: string;
      shopId?: string;
      score?: number;
      orderCount?: number;
      caseCount?: number;
      latestCaseAt?: string;
    }>;
}

function normalizeLevel(level: unknown, score: unknown): "safe" | "medium" | "high" {
  if (level === "high" || level === "medium" || level === "safe") return level;
  const numericScore = toNumber(score) ?? 0;
  if (numericScore >= 61) return "high";
  if (numericScore >= 31) return "medium";
  return "safe";
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function toOptionalString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function firstString(...values: unknown[]): string {
  return toOptionalString(...values) || "";
}
