"use client";

import { useEffect, useState } from "react";
import { Card, CardDescription, CardTitle, DataTable } from "@dokanx/ui";

import { listMerchants } from "@/lib/admin-runtime-api";

type MerchantRow = {
  _id?: string;
  name?: string;
  email?: string;
  isBlocked?: boolean;
  shopId?: { name?: string; domain?: string };
};

export const dynamic = "force-dynamic";

export default function Page() {
  const [merchants, setMerchants] = useState<MerchantRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await listMerchants();
        if (!active) return;
        setMerchants(Array.isArray(response.data) ? (response.data as MerchantRow[]) : []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load merchants.");
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
        <h1 className="dx-display text-3xl">Merchants</h1>
        <p className="text-sm text-muted-foreground">Merchant lifecycle and access</p>
      </div>
      {error ? (
        <Card>
          <CardTitle>Merchants</CardTitle>
          <CardDescription className="mt-2">{error}</CardDescription>
        </Card>
      ) : null}
      <DataTable
        columns={[
          { key: "merchant", header: "Merchant" },
          { key: "email", header: "Email" },
          { key: "shop", header: "Shop" },
          { key: "status", header: "Status" },
        ]}
        rows={merchants.map((merchant) => ({
          merchant: merchant.name || "Merchant",
          email: merchant.email || "Unknown",
          shop: merchant.shopId?.name || merchant.shopId?.domain || "Unassigned",
          status: merchant.isBlocked ? "Blocked" : "Active",
        }))}
      />
    </div>
  );
}
