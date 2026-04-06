"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, AnalyticsCards, Badge, Button, Card, CardDescription, CardTitle, DataTable } from "@dokanx/ui";

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

  const summary = useMemo(() => {
    const total = merchants.length;
    const blocked = merchants.filter((merchant) => merchant.isBlocked).length;
    const active = total - blocked;
    const assigned = merchants.filter((merchant) => merchant.shopId?.name || merchant.shopId?.domain).length;
    return [
      { label: "Total merchants", value: String(total), meta: "Accounts under active review" },
      { label: "Active", value: String(active), meta: "Currently allowed to operate" },
      { label: "Blocked", value: String(blocked), meta: "Restricted by admin control" },
      { label: "With shop", value: String(assigned), meta: "Linked to a storefront" },
    ];
  }, [merchants]);

  return (
    <div className="grid gap-6">
      <div className="rounded-[28px] border border-white/10 bg-[#0B1E3C] px-6 py-6 text-white shadow-[0_24px_60px_rgba(11,30,60,0.24)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-[#FFD49F]">DokanX Admin</p>
            <h1 className="dx-display text-3xl">Merchant Lifecycle</h1>
            <p className="text-sm text-slate-200">
              Review merchant access, linked storefront coverage, and account restrictions from one moderation queue.
            </p>
          </div>
          <Badge variant="secondary" className="border-white/15 bg-white/10 text-white">
            {merchants.length} loaded
          </Badge>
        </div>
      </div>

      <AnalyticsCards items={summary} />

      {error ? <Alert variant="warning">{error}</Alert> : null}

      <Card>
        <CardTitle>Merchant review queue</CardTitle>
        <CardDescription className="mt-2">
          Use this table to open merchant detail, confirm storefront assignment, and block or unblock access.
        </CardDescription>
        <div className="mt-4">
          <DataTable
            columns={[
              { key: "merchant", header: "Merchant" },
              { key: "email", header: "Email" },
              { key: "shop", header: "Shop" },
              {
                key: "status",
                header: "Status",
                render: (row) => (
                  <Badge variant={row.isBlocked ? "warning" : "success"}>{row.status}</Badge>
                ),
              },
              {
                key: "actions",
                header: "Actions",
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" asChild>
                      <a href={`/merchants/${row.id}`}>View</a>
                    </Button>
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
                  </div>
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
      </Card>
    </div>
  );
}

