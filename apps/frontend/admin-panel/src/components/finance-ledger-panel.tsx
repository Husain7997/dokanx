"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, CardDescription, CardTitle, DataTable, Grid, Input, SelectDropdown } from "@dokanx/ui";

import { getPayoutAlerts, listSettlements } from "@/lib/admin-runtime-api";

type SettlementRow = {
  _id?: string;
  shopId?: string;
  totalAmount?: number;
  status?: string;
  createdAt?: string;
};

export function FinanceLedgerPanel() {
  const [settlements, setSettlements] = useState<SettlementRow[]>([]);
  const [alerts, setAlerts] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [shopFilter, setShopFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rangePreset, setRangePreset] = useState("CUSTOM");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [settlementResponse, alertsResponse] = await Promise.all([
          listSettlements(),
          getPayoutAlerts(),
        ]);
        if (!active) return;
        setSettlements(Array.isArray(settlementResponse.data) ? (settlementResponse.data as SettlementRow[]) : []);
        setAlerts(Array.isArray(alertsResponse.data) ? (alertsResponse.data as Array<Record<string, unknown>>) : []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load settlement ledger.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const filteredSettlements = useMemo(() => {
    return settlements.filter((row) => {
      if (shopFilter && !String(row.shopId || "").toLowerCase().includes(shopFilter.toLowerCase())) {
        return false;
      }
      if (statusFilter !== "ALL" && String(row.status || "PENDING") !== statusFilter) {
        return false;
      }
      if (fromDate) {
        const created = row.createdAt ? new Date(row.createdAt) : null;
        const from = new Date(fromDate);
        if (!created || Number.isNaN(created.getTime()) || created < from) return false;
      }
      if (toDate) {
        const created = row.createdAt ? new Date(row.createdAt) : null;
        const to = new Date(toDate);
        if (!created || Number.isNaN(created.getTime())) return false;
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        if (created > end) return false;
      }
      return true;
    });
  }, [fromDate, settlements, shopFilter, statusFilter, toDate]);

  useEffect(() => {
    const preset = inferPreset(fromDate, toDate);
    if (preset) {
      setRangePreset(preset);
    } else if (fromDate || toDate) {
      setRangePreset("CUSTOM");
    }
  }, [fromDate, toDate]);

  const totals = useMemo(() => {
    const pending = filteredSettlements.filter((row) => (row.status || "PENDING") === "PENDING");
    const paid = filteredSettlements.filter((row) => (row.status || "") === "PAID");
    return {
      pendingCount: pending.length,
      paidCount: paid.length,
      pendingTotal: pending.reduce((sum, row) => sum + (row.totalAmount || 0), 0),
      paidTotal: paid.reduce((sum, row) => sum + (row.totalAmount || 0), 0),
    };
  }, [filteredSettlements]);

  return (
    <Card>
      <CardTitle>Wallet & settlements</CardTitle>
      <CardDescription className="mt-2">Monitor payouts, pending balances, and payout alerts.</CardDescription>
      {error ? <p className="mt-3 text-sm text-muted-foreground">{error}</p> : null}

      <Grid minColumnWidth="200px" className="mt-4 gap-4">
        <Card>
          <CardTitle>Pending payouts</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{totals.pendingCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">{totals.pendingTotal} BDT awaiting release</p>
        </Card>
        <Card>
          <CardTitle>Paid settlements</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{totals.paidCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">{totals.paidTotal} BDT completed</p>
        </Card>
        <Card>
          <CardTitle>Payout alerts</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{alerts.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Flags requiring review</p>
        </Card>
      </Grid>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <Input
          value={shopFilter}
          onChange={(event) => setShopFilter(event.target.value)}
          placeholder="Filter by shop ID"
        />
        <SelectDropdown
          label="Status"
          value={statusFilter}
          onValueChange={setStatusFilter}
          options={[
            { label: "All", value: "ALL" },
            { label: "Pending", value: "PENDING" },
            { label: "Paid", value: "PAID" },
          ]}
        />
        <SelectDropdown
          label="Preset range"
          value={rangePreset}
          onValueChange={(value) => {
            setRangePreset(value);
            if (value === "LAST_7") {
              const end = new Date();
              const start = new Date();
              start.setDate(end.getDate() - 6);
              setFromDate(start.toISOString().slice(0, 10));
              setToDate(end.toISOString().slice(0, 10));
            } else if (value === "LAST_30") {
              const end = new Date();
              const start = new Date();
              start.setDate(end.getDate() - 29);
              setFromDate(start.toISOString().slice(0, 10));
              setToDate(end.toISOString().slice(0, 10));
            } else if (value === "THIS_WEEK") {
              const now = new Date();
              const day = now.getDay();
              const diff = (day === 0 ? -6 : 1) - day;
              const start = new Date(now);
              start.setDate(now.getDate() + diff);
              const end = new Date(start);
              end.setDate(start.getDate() + 6);
              setFromDate(start.toISOString().slice(0, 10));
              setToDate(end.toISOString().slice(0, 10));
            } else if (value === "THIS_MONTH") {
              const now = new Date();
              const start = new Date(now.getFullYear(), now.getMonth(), 1);
              const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
              setFromDate(start.toISOString().slice(0, 10));
              setToDate(end.toISOString().slice(0, 10));
            }
          }}
          options={[
            { label: "Custom", value: "CUSTOM" },
            { label: "Last 7 days", value: "LAST_7" },
            { label: "Last 30 days", value: "LAST_30" },
            { label: "This week", value: "THIS_WEEK" },
            { label: "This month", value: "THIS_MONTH" },
          ]}
        />
        <Input
          type="date"
          value={fromDate}
          onChange={(event) => setFromDate(event.target.value)}
          placeholder="From date"
        />
        <Input
          type="date"
          value={toDate}
          onChange={(event) => setToDate(event.target.value)}
          placeholder="To date"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const now = new Date();
            const day = now.getDay();
            const diff = (day === 0 ? -6 : 1) - day;
            const start = new Date(now);
            start.setDate(now.getDate() + diff);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            setRangePreset("THIS_WEEK");
            setFromDate(start.toISOString().slice(0, 10));
            setToDate(end.toISOString().slice(0, 10));
          }}
        >
          This week
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            setRangePreset("THIS_MONTH");
            setFromDate(start.toISOString().slice(0, 10));
            setToDate(end.toISOString().slice(0, 10));
          }}
        >
          This month
        </Button>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        Showing {filteredSettlements.length} of {settlements.length} settlements
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          variant="secondary"
          onClick={() => {
            const rows = filteredSettlements.map((row) => ({
              settlementId: row._id || "",
              shopId: row.shopId || "",
              totalAmount: row.totalAmount ?? 0,
              status: row.status || "PENDING",
              createdAt: row.createdAt || "",
            }));
            const csv = buildCsv(rows);
            downloadCsv(csv, `settlements-${new Date().toISOString().slice(0, 10)}.csv`);
          }}
        >
          Export settlements CSV
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const rows = alerts.map((row, index) => ({ id: index + 1, ...row }));
            const csv = buildCsv(rows as Array<Record<string, string | number>>);
            downloadCsv(csv, `payout-alerts-${new Date().toISOString().slice(0, 10)}.csv`);
          }}
          disabled={!alerts.length}
        >
          Export alerts CSV
        </Button>
      </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div>
            <DataTable
              columns={[
                { key: "settlement", header: "Settlement" },
                { key: "shop", header: "Shop" },
                { key: "total", header: "Total" },
                { key: "status", header: "Status" },
                { key: "created", header: "Created" },
              ]}
              rows={filteredSettlements.slice(0, 8).map((row) => ({
                id: String(row._id || ""),
                settlement: row._id ? String(row._id).slice(-6) : "Settlement",
                shop: row.shopId || "Shop",
                total: `${row.totalAmount ?? 0} BDT`,
                status: row.status || "PENDING",
              created: row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "Unknown",
            }))}
          />
          {!settlements.length ? (
            <p className="mt-3 text-sm text-muted-foreground">No settlements yet.</p>
          ) : null}
        </div>
        <div className="grid gap-3 text-sm text-muted-foreground">
          <p className="text-sm font-semibold text-foreground">Payout alerts</p>
          {alerts.slice(0, 6).map((alert, index) => (
            <div key={index} className="rounded-2xl border border-border/60 px-4 py-3">
              <Badge variant="warning">Alert</Badge>
              <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                {JSON.stringify(alert, null, 2)}
              </pre>
            </div>
          ))}
          {!alerts.length ? <p>No payout alerts.</p> : null}
        </div>
      </div>
    </Card>
  );
}

function buildCsv(rows: Array<Record<string, string | number>>) {
  const headers = rows.length ? Object.keys(rows[0]) : ["id"];
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

function inferPreset(fromDate: string, toDate: string) {
  if (!fromDate || !toDate) return null;
  const start = new Date(fromDate);
  const end = new Date(toDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const today = new Date();
  const iso = (date: Date) => date.toISOString().slice(0, 10);

  const last7Start = new Date(today);
  last7Start.setDate(today.getDate() - 6);
  if (iso(start) === iso(last7Start) && iso(end) === iso(today)) return "LAST_7";

  const last30Start = new Date(today);
  last30Start.setDate(today.getDate() - 29);
  if (iso(start) === iso(last30Start) && iso(end) === iso(today)) return "LAST_30";

  const day = today.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + diff);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  if (iso(start) === iso(weekStart) && iso(end) === iso(weekEnd)) return "THIS_WEEK";

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  if (iso(start) === iso(monthStart) && iso(end) === iso(monthEnd)) return "THIS_MONTH";

  return null;
}
