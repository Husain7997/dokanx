"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Card, CardDescription, CardTitle, ChartJsLineChart, ChartJsBarChart, Grid, ProgressBar } from "@dokanx/ui";

import { listAuditLogs, listOrders } from "@/lib/admin-runtime-api";

type OrderRow = {
  _id?: string;
  disputeStatus?: string;
  disputeReason?: string;
  createdAt?: string;
};

type AuditRow = {
  action?: string;
  targetId?: string;
  createdAt?: string;
  meta?: Record<string, unknown>;
};

export const dynamic = "force-dynamic";

const resolutionStatuses = new Set(["RESOLVED", "REJECTED"]);

export default function DisputesAnalyticsPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [orderResponse, auditResponse] = await Promise.all([listOrders(), listAuditLogs()]);
        if (!active) return;
        setOrders(Array.isArray(orderResponse.data) ? (orderResponse.data as OrderRow[]) : []);
        setAuditLogs(Array.isArray(auditResponse.data) ? (auditResponse.data as AuditRow[]) : []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load dispute analytics.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const disputes = useMemo(
    () => orders.filter((order) => (order.disputeStatus || "NONE") !== "NONE"),
    [orders]
  );

  const resolutionLogMap = useMemo(() => {
    const map = new Map<string, Date>();
    auditLogs
      .filter((log) => log.action === "ORDER_DISPUTE_UPDATE" && log.targetId)
      .forEach((log) => {
        const status = String((log.meta as Record<string, unknown>)?.disputeStatus || "");
        if (!resolutionStatuses.has(status)) return;
        const timestamp = log.createdAt ? new Date(log.createdAt) : null;
        if (!timestamp || Number.isNaN(timestamp.getTime())) return;
        const existing = map.get(String(log.targetId));
        if (!existing || timestamp < existing) {
          map.set(String(log.targetId), timestamp);
        }
      });
    return map;
  }, [auditLogs]);

  const resolutionMetrics = useMemo(() => {
    let resolved = 0;
    let within24h = 0;
    let within72h = 0;
    disputes.forEach((order) => {
      if (!order._id || !order.createdAt) return;
      const resolvedAt = resolutionLogMap.get(String(order._id));
      if (!resolvedAt) return;
      const createdAt = new Date(order.createdAt);
      if (Number.isNaN(createdAt.getTime())) return;
      resolved += 1;
      const deltaHours = Math.max(0, (resolvedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
      if (deltaHours <= 24) within24h += 1;
      if (deltaHours <= 72) within72h += 1;
    });
    return {
      resolved,
      resolutionRate: disputes.length ? Math.round((resolved / disputes.length) * 100) : 0,
      within24h,
      within72h,
    };
  }, [disputes, resolutionLogMap]);

  const disputeReasonSummary = useMemo(() => {
    const map = new Map<string, number>();
    disputes.forEach((order) => {
      const key = order.disputeReason || "NONE";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([label, count]) => ({ label, count }));
  }, [disputes]);

  const disputeDaily = useMemo(() => buildDailySeries(disputes, 14), [disputes]);

  const dailyChart = useMemo(
    () => ({
      labels: disputeDaily.map((row) => row.label),
      datasets: [
        {
          label: "Daily disputes",
          data: disputeDaily.map((row) => row.value),
          borderColor: "hsl(221 83% 53%)",
          backgroundColor: "hsl(221 83% 53% / 0.2)",
          tension: 0.35,
          fill: true,
        },
      ],
    }),
    [disputeDaily]
  );

  const reasonChart = useMemo(
    () => ({
      labels: disputeReasonSummary.map((row) => row.label),
      datasets: [
        {
          label: "Disputes by reason",
          data: disputeReasonSummary.map((row) => row.count),
          backgroundColor: "hsl(25 95% 53% / 0.65)",
          borderColor: "hsl(25 95% 53%)",
          borderWidth: 2,
          borderRadius: 8,
        },
      ],
    }),
    [disputeReasonSummary]
  );

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="dx-display text-3xl">Disputes Analytics</h1>
        <p className="text-sm text-muted-foreground">Trend, SLA, and resolution performance</p>
      </div>

      {error ? (
        <Card>
          <CardTitle>Disputes analytics</CardTitle>
          <CardDescription className="mt-2">{error}</CardDescription>
        </Card>
      ) : null}

      <Grid minColumnWidth="220px" className="gap-4">
        <Card>
          <CardTitle>Total disputes</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{disputes.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">All active disputes</p>
        </Card>
        <Card>
          <CardTitle>Resolution rate</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{resolutionMetrics.resolutionRate}%</p>
          <div className="mt-3">
            <ProgressBar value={resolutionMetrics.resolutionRate} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Resolved vs total disputes</p>
        </Card>
        <Card>
          <CardTitle>SLA within 24h</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{resolutionMetrics.within24h}</p>
          <p className="mt-1 text-xs text-muted-foreground">Resolved under 24 hours</p>
        </Card>
        <Card>
          <CardTitle>SLA within 72h</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{resolutionMetrics.within72h}</p>
          <p className="mt-1 text-xs text-muted-foreground">Resolved under 3 days</p>
        </Card>
      </Grid>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card>
          <CardTitle>Dispute trend</CardTitle>
          <CardDescription className="mt-2">Daily disputes (last 14 days)</CardDescription>
          <div className="mt-4 rounded-2xl border border-border/60 bg-card/60 p-4">
            {disputeDaily.length ? (
              <ChartJsLineChart data={dailyChart} height={240} />
            ) : (
              <p className="text-sm text-muted-foreground">Dispute trend data will appear here once customer issues start entering the review pipeline.</p>
            )}
          </div>
        </Card>
        <Card>
          <CardTitle>Reason mix</CardTitle>
          <CardDescription className="mt-2">Top dispute reasons</CardDescription>
          <div className="mt-4 rounded-2xl border border-border/60 bg-card/60 p-4">
            {disputeReasonSummary.length ? (
              <ChartJsBarChart data={reasonChart} height={240} />
            ) : (
              <p className="text-sm text-muted-foreground">Reason analysis will appear here once disputes accumulate enough signal to classify.</p>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {disputeReasonSummary.map((row) => (
              <Badge key={row.label} variant="neutral">
                {row.label}: {row.count}
              </Badge>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function buildDailySeries(rows: OrderRow[], days: number) {
  const today = new Date();
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    buckets.set(date.toLocaleDateString(), 0);
  }
  rows.forEach((order) => {
    if (!order.createdAt) return;
    const key = new Date(order.createdAt).toLocaleDateString();
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + 1);
  });
  return Array.from(buckets.entries()).map(([label, value]) => ({ label, value }));
}

