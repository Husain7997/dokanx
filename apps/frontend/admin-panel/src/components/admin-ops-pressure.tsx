"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, CardDescription, CardTitle, ProgressBar } from "@dokanx/ui";

import type { OpsThresholdSettings } from "@/config/ops-thresholds";
import { OPS_LAG_CRITICAL_MS, formatOpsLag, getOpsHealth, getOutboxHealth, type OutboxState, type QueueState } from "@/lib/admin-ops-health";
import { getAdminMetrics, getOpsSettings } from "@/lib/admin-runtime-api";

type AdminMetricsState = {
  queues?: Record<string, QueueState>;
  outbox?: OutboxState;
};

export function AdminOpsPressure() {
  const [metrics, setMetrics] = useState<AdminMetricsState | null>(null);
  const [opsSettings, setOpsSettings] = useState<Partial<OpsThresholdSettings> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    setError(null);
    try {
      const [metricsResponse, opsResponse] = await Promise.all([
        getAdminMetrics(),
        getOpsSettings(),
      ]);
      setMetrics(metricsResponse || null);
      setOpsSettings(opsResponse?.data || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load operational pressure.");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const queues = useMemo(
    () =>
      Object.entries(metrics?.queues || {}).map(([key, queue]) => {
        const waiting = Number(queue?.counts?.waiting || 0);
        const failed = Number(queue?.counts?.failed || 0);
        const lag = Number(queue?.oldestWaitingMs || 0);
        return {
          key,
          queue,
          waiting,
          active: Number(queue?.counts?.active || 0),
          failed,
          deadLetter: Number(queue?.deadLetter?.waiting || 0) + Number(queue?.deadLetter?.failed || 0),
          lag,
          health: getOpsHealth(waiting, failed, lag, Number(queue?.counts?.active || 0), opsSettings || undefined),
        };
      }),
    [metrics?.queues, opsSettings]
  );

  const outboxWaiting = Number(metrics?.outbox?.pending || 0);
  const outboxErrored = Number(metrics?.outbox?.errored || 0);
  const outboxLag = Number(metrics?.outbox?.oldestPendingLagMs || 0);
  const outboxState = getOutboxHealth(metrics?.outbox, opsSettings || undefined);
  const lagCeiling = Number(opsSettings?.lagCriticalMs || OPS_LAG_CRITICAL_MS);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <CardTitle>Operational pressure</CardTitle>
          <CardDescription className="mt-2">
            Queue backlog and outbox drain pressure across the platform. Critical lag threshold: {formatOpsLag(opsSettings?.lagCriticalMs ?? OPS_LAG_CRITICAL_MS)}.
          </CardDescription>
        </div>
        <Button size="sm" variant="secondary" onClick={() => void load()} disabled={refreshing}>
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 grid gap-3">
        {queues.length ? (
          queues.map((item) => (
            <div key={item.key} className="rounded-2xl border border-border/60 px-4 py-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{item.queue?.name || item.key}</p>
                  <p className="text-xs text-muted-foreground">Oldest waiting: {formatOpsLag(item.lag)}</p>
                </div>
                <Badge variant={item.health.variant}>{item.health.label}</Badge>
              </div>
              <div className="mt-3">
                <ProgressBar value={Math.min(100, lagCeiling ? (item.lag / lagCeiling) * 100 : 0)} />
              </div>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                <div className="rounded-2xl bg-muted/40 px-3 py-2">Waiting: {item.waiting}</div>
                <div className="rounded-2xl bg-muted/40 px-3 py-2">Active: {item.active}</div>
                <div className="rounded-2xl bg-muted/40 px-3 py-2">Failed: {item.failed}</div>
                <div className="rounded-2xl bg-muted/40 px-3 py-2">Dead-letter: {item.deadLetter}</div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Queue metrics are not available yet.</p>
        )}

        <div className="rounded-2xl border border-border/60 px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-medium text-foreground">Outbox</p>
              <p className="text-xs text-muted-foreground">Oldest pending: {formatOpsLag(outboxLag)}</p>
            </div>
            <Badge variant={outboxState.variant}>{outboxState.label}</Badge>
          </div>
          <div className="mt-3">
            <ProgressBar value={Math.min(100, lagCeiling ? (outboxLag / lagCeiling) * 100 : 0)} />
          </div>
          <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
            <div className="rounded-2xl bg-muted/40 px-3 py-2">Pending: {outboxWaiting}</div>
            <div className="rounded-2xl bg-muted/40 px-3 py-2">In flight: {metrics?.outbox?.inFlight ?? 0}</div>
            <div className="rounded-2xl bg-muted/40 px-3 py-2">Errored: {outboxErrored}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
