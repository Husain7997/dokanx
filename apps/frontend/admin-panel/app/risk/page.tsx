"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Card, CardDescription, CardTitle, DataTable, Grid, TextInput } from "@dokanx/ui";

import { getFraudAlerts, getFraudOverview, getFraudReports, reviewFraudCase } from "@/lib/admin-runtime-api";

type FraudSignal = {
  code?: string;
  count?: number;
};

type FraudCase = {
  _id?: string;
  entityType?: string;
  entityId?: string;
  orderId?: string;
  shopId?: string;
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

export const dynamic = "force-dynamic";

export default function RiskPage() {
  const [overview, setOverview] = useState<FraudOverviewState | null>(null);
  const [alerts, setAlerts] = useState<FraudCase[]>([]);
  const [reports, setReports] = useState<FraudReportsState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [overviewResponse, alertsResponse, reportsResponse] = await Promise.all([
          getFraudOverview(),
          getFraudAlerts(),
          getFraudReports(),
        ]);
        if (!active) return;
        setOverview(overviewResponse.data || null);
        setAlerts(Array.isArray(alertsResponse.data) ? alertsResponse.data : []);
        setReports(reportsResponse.data || null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load risk insights.");
      }
    }
    void load();
    return () => {
      active = false;
    };
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

  async function handleReview(caseId: string, action: string) {
    setBusyId(caseId);
    setError(null);
    try {
      await reviewFraudCase({
        caseId,
        action,
        note: reviewNotes[caseId] || undefined,
      });
      const [overviewResponse, alertsResponse] = await Promise.all([
        getFraudOverview(),
        getFraudAlerts(),
      ]);
      setOverview(overviewResponse.data || null);
      setAlerts(Array.isArray(alertsResponse.data) ? alertsResponse.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to review fraud case.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="dx-display text-3xl">Risk</h1>
        <p className="text-sm text-muted-foreground">Fraud alerts, compliance posture, and review workflow.</p>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Grid minColumnWidth="220px" className="gap-4">
        <Card>
          <CardTitle>Open cases</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{overview?.summary?.openCases ?? 0}</p>
          <p className="mt-1 text-xs text-muted-foreground">Active fraud investigations</p>
        </Card>
        <Card>
          <CardTitle>Review required</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{overview?.summary?.reviewRequired ?? 0}</p>
          <p className="mt-1 text-xs text-muted-foreground">Cases waiting for admin action</p>
        </Card>
        <Card>
          <CardTitle>Fraud rate</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{Math.round((overview?.summary?.fraudRate ?? 0) * 100)}%</p>
          <p className="mt-1 text-xs text-muted-foreground">Flagged orders vs processed orders</p>
        </Card>
        <Card>
          <CardTitle>Payment failure rate</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{Math.round((overview?.summary?.paymentFailureRate ?? 0) * 100)}%</p>
          <p className="mt-1 text-xs text-muted-foreground">Failed payment attempts</p>
        </Card>
      </Grid>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Control posture</CardTitle>
          <CardDescription className="mt-2">Current enforcement state across the platform.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
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
        </Card>

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
              <p>No fraud signals reported yet.</p>
            )}
          </div>
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
        <CardTitle>Review history snapshot</CardTitle>
        <CardDescription className="mt-2">Current queue state for audit and triage.</CardDescription>
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
            updated: item.updatedAt ? new Date(item.updatedAt).toLocaleString() : (item.createdAt ? new Date(item.createdAt).toLocaleString() : "Unknown"),
          }))}
        />
      </Card>
    </div>
  );
}
