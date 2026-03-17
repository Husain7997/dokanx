"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, CardDescription, CardTitle, DataTable, Grid } from "@dokanx/ui";

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

  const totals = useMemo(() => {
    const pending = settlements.filter((row) => (row.status || "PENDING") === "PENDING");
    const paid = settlements.filter((row) => (row.status || "") === "PAID");
    return {
      pendingCount: pending.length,
      paidCount: paid.length,
      pendingTotal: pending.reduce((sum, row) => sum + (row.totalAmount || 0), 0),
      paidTotal: paid.reduce((sum, row) => sum + (row.totalAmount || 0), 0),
    };
  }, [settlements]);

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

      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          variant="secondary"
          onClick={() => {
            const rows = settlements.map((row) => ({
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
            rows={settlements.slice(0, 8).map((row) => ({
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
