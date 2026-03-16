"use client";

import { useEffect, useState } from "react";
import { Card, CardDescription, CardTitle, SettlementTable } from "@dokanx/ui";

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

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="dx-display text-3xl">Settlements</h1>
        <p className="text-sm text-muted-foreground">Payout cycles and settlement runs</p>
      </div>
      {error ? (
        <Card>
          <CardTitle>Settlements</CardTitle>
          <CardDescription className="mt-2">{error}</CardDescription>
        </Card>
      ) : null}
      <SettlementTable
        rows={settlements.map((row) => ({
          batch: String(row._id || ""),
          merchant: row.shopId ? String(row.shopId) : "Shop",
          amount: `${row.totalAmount ?? 0} BDT`,
          eta: row.status || "PENDING",
        }))}
      />
    </div>
  );
}
