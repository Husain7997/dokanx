"use client";

import { useEffect, useMemo, useState } from "react";
import { AnalyticsCards, Card, CardDescription, CardTitle, FinanceLedgerView } from "@dokanx/ui";

import { getShopSettlements, getShopSummary } from "@/lib/runtime-api";

type SettlementRow = {
  _id?: string;
  totalAmount?: number;
  netAmount?: number;
  status?: string;
  createdAt?: string;
};

export default function FinancePage() {
  const [summary, setSummary] = useState<{ sales?: { totalSales?: number; totalOrders?: number }; settlements?: { settledAmount?: number; totalSettlements?: number } } | null>(null);
  const [settlements, setSettlements] = useState<SettlementRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [summaryResponse, settlementResponse] = await Promise.all([
          getShopSummary(),
          getShopSettlements(),
        ]);
        if (!active) return;
        setSummary(summaryResponse.data || null);
        setSettlements(Array.isArray(settlementResponse.data) ? (settlementResponse.data as SettlementRow[]) : []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load finance data.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const cards = useMemo(() => {
    return [
      { label: "Total sales", value: `${summary?.sales?.totalSales ?? 0} BDT`, meta: "Completed orders" },
      { label: "Orders", value: String(summary?.sales?.totalOrders ?? 0), meta: "Processed in this shop" },
      { label: "Settled amount", value: `${summary?.settlements?.settledAmount ?? 0} BDT`, meta: "Payout processed" },
      { label: "Settlements", value: String(summary?.settlements?.totalSettlements ?? 0), meta: "Recent cycles" },
    ];
  }, [summary]);

  return (
    <div className="grid gap-6">
      <AnalyticsCards items={cards} />
      {error ? (
        <Card>
          <CardTitle>Finance</CardTitle>
          <CardDescription className="mt-2">{error}</CardDescription>
        </Card>
      ) : null}
      <FinanceLedgerView
        rows={settlements.map((row) => ({
          reference: String(row._id || ""),
          type: "Settlement",
          amount: `${row.totalAmount ?? 0} BDT`,
          status: row.status || "PENDING",
        }))}
      />
    </div>
  );
}
