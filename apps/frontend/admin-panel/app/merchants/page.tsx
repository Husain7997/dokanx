"use client";

import { useEffect, useState } from "react";
import { Button, Card, CardDescription, CardTitle, DataTable } from "@dokanx/ui";

import { blockUser, listMerchants, unblockUser } from "@/lib/admin-runtime-api";

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
  const [busyId, setBusyId] = useState<string | null>(null);

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
          {
            key: "actions",
            header: "Actions",
            render: (row) => (
              <Button
                size="sm"
                variant={row.isBlocked ? "secondary" : "default"}
                onClick={async () => {
                  if (!row.id) return;
                  setBusyId(row.id);
                  try {
                    if (row.isBlocked) {
                      await unblockUser(row.id);
                    } else {
                      await blockUser(row.id);
                    }
                    const response = await listMerchants();
                    setMerchants(Array.isArray(response.data) ? (response.data as MerchantRow[]) : []);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Unable to update merchant.");
                  } finally {
                    setBusyId(null);
                  }
                }}
                disabled={busyId === row.id}
              >
                {busyId === row.id ? "Updating..." : row.isBlocked ? "Unblock" : "Block"}
              </Button>
            ),
          },
        ]}
        rows={merchants.map((merchant) => ({
          id: String(merchant._id || ""),
          isBlocked: Boolean(merchant.isBlocked),
          merchant: merchant.name || "Merchant",
          email: merchant.email || "Unknown",
          shop: merchant.shopId?.name || merchant.shopId?.domain || "Unassigned",
          status: merchant.isBlocked ? "Blocked" : "Active",
        }))}
      />
    </div>
  );
}
