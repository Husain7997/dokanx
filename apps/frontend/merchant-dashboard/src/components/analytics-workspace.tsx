"use client";

import { useEffect, useState } from "react";
import { AnalyticsCards, Button, Card, CardDescription, CardTitle, Input, SalesChart } from "@dokanx/ui";

import { listAnalyticsSnapshots } from "@/lib/runtime-api";

type SnapshotRow = {
  _id?: string;
  metricType?: string;
  dateKey?: string;
  payload?: Record<string, unknown>;
};

function pickMetric(rows: SnapshotRow[], metricType: string) {
  return rows.find((item) => item.metricType === metricType) || null;
}

export function AnalyticsWorkspace() {
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
  });
  const [rows, setRows] = useState<SnapshotRow[]>([]);
  const [message, setMessage] = useState<string | null>("Owner or admin session is required to load tenant analytics snapshots.");
  const [loading, setLoading] = useState(false);

  async function loadSnapshots() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await listAnalyticsSnapshots(filters);
      const snapshots = Array.isArray(response.data) ? (response.data as SnapshotRow[]) : [];
      setRows(snapshots);
      if (!snapshots.length) {
        setMessage("No analytics snapshots matched the selected date range.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSnapshots();
  }, []);

  const dailySales = pickMetric(rows, "DAILY_SALES");
  const trendAnalytics = pickMetric(rows, "TREND_ANALYTICS");

  const chartData = Array.isArray((trendAnalytics?.payload as Record<string, unknown> | null)?.current)
    ? ((trendAnalytics?.payload as { current?: Array<{ label?: string; value?: number }> }).current || []).map((item, index) => ({
        label: item.label || `Point ${index + 1}`,
        value: Number(item.value || 0),
      }))
    : [];

  const metricCards = [
    { label: "Snapshots", value: String(rows.length), meta: filters.dateFrom || "All dates" },
    { label: "Daily sales rows", value: String(Array.isArray(dailySales?.payload) ? dailySales?.payload.length || 0 : 0), meta: "Warehouse daily sales" },
    { label: "Trend points", value: String(chartData.length), meta: filters.dateTo || "Open-ended" },
    { label: "Active filter", value: filters.dateFrom || filters.dateTo ? "Scoped" : "Default", meta: "Date-driven analytics" },
  ];

  return (
    <div className="grid gap-6">
      <Card>
        <CardTitle>Date-filtered analytics</CardTitle>
        <CardDescription className="mt-2">
          Analytics now query warehouse snapshots with real date filters instead of a fixed placeholder chart.
        </CardDescription>
        <div className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <Input type="date" value={filters.dateFrom} onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))} />
          <Input type="date" value={filters.dateTo} onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))} />
          <Button onClick={() => void loadSnapshots()} disabled={loading}>
            {loading ? "Loading..." : "Apply Filters"}
          </Button>
        </div>
      </Card>
      <AnalyticsCards items={metricCards} />
      <Card>
        <CardTitle>Trend output</CardTitle>
        <div className="mt-6">
          <SalesChart data={chartData.length ? chartData : [{ label: "No data", value: 0 }]} />
        </div>
      </Card>
      {message ? (
        <Card>
          <CardDescription>{message}</CardDescription>
        </Card>
      ) : null}
    </div>
  );
}
