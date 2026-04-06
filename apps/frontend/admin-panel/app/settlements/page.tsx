"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, AnalyticsCards, Badge, Card, CardDescription, CardTitle, SettlementTable } from "@dokanx/ui";

import { listSettlements } from "@/lib/admin-runtime-api";

type SettlementRow = {
  _id?: string;
  shopId?: string;
  totalAmount?: number;
  status?: string;
  createdAt?: string;
};

export const dynamic = "force-dynamic";

export default function Page() {
  const [settlements, setSettlements] = useState<SettlementRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await listSettlements();
        if (!active) return;
        setSettlements(Array.isArray(response.data) ? (response.data as SettlementRow[]) : []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load settlements.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    const total = settlements.length;
    const pending = settlements.filter((row) => String(row.status || "PENDING").toUpperCase() !== "COMPLETED").length;
    const completed = total - pending;
    const volume = settlements.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
    return [
      { label: "Settlement runs", value: String(total), meta: "Payout batches currently visible" },
      { label: "Pending", value: String(pending), meta: "Needs monitoring or completion" },
      { label: "Completed", value: String(completed), meta: "Finished payout cycles" },
      { label: "Volume", value: `${volume.toFixed(2)} BDT`, meta: "Combined payout amount" },
    ];
  }, [settlements]);

  return (
    <div className="grid gap-6">
      <div className="rounded-[28px] border border-white/10 bg-[#0B1E3C] px-6 py-6 text-white shadow-[0_24px_60px_rgba(11,30,60,0.24)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-[#FFD49F]">DokanX Admin</p>
            <h1 className="dx-display text-3xl">Settlements</h1>
            <p className="text-sm text-slate-200">
              Watch payout cycles, batch readiness, and settlement throughput from one concise operator queue.
            </p>
          </div>
          <Badge variant="secondary" className="border-white/15 bg-white/10 text-white">
            {settlements.length} batches
          </Badge>
        </div>
      </div>

      <AnalyticsCards items={summary} />

      {error ? <Alert variant="warning">{error}</Alert> : null}

      <Card>
        <CardTitle>Settlement queue</CardTitle>
        <CardDescription className="mt-2">
          Use this queue to monitor payout batch progression and spot delayed settlement runs quickly.
        </CardDescription>
        <div className="mt-4">
          <SettlementTable
            rows={settlements.map((row) => ({
              batch: String(row._id || ""),
              merchant: row.shopId ? String(row.shopId) : "Shop",
              amount: `${Number(row.totalAmount || 0).toFixed(2)} BDT`,
              eta: row.status || "PENDING",
            }))}
          />
        </div>
      </Card>
    </div>
  );
}

