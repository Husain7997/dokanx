"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, AnalyticsCards, Badge, Button, Card, CardDescription, CardTitle, DataTable } from "@dokanx/ui";

import { approveShop, listShops, suspendShop } from "@/lib/admin-runtime-api";

type ShopRow = {
  _id?: string;
  name?: string;
  domain?: string;
  slug?: string;
  isActive?: boolean;
  owner?: { name?: string; email?: string };
};

export const dynamic = "force-dynamic";

export default function Page() {
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await listShops();
        if (!active) return;
        setShops(Array.isArray(response.data) ? (response.data as ShopRow[]) : []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load shops.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    const total = shops.length;
    const active = shops.filter((shop) => shop.isActive).length;
    const pending = total - active;
    const withOwner = shops.filter((shop) => shop.owner?.name || shop.owner?.email).length;
    return [
      { label: "Total shops", value: String(total), meta: "Merchant storefronts in the system" },
      { label: "Active", value: String(active), meta: "Currently approved and operating" },
      { label: "Pending", value: String(pending), meta: "Needs approval or reactivation" },
      { label: "Owner linked", value: String(withOwner), meta: "Store has clear ownership metadata" },
    ];
  }, [shops]);

  return (
    <div className="grid gap-6">
      <div className="rounded-[28px] border border-white/10 bg-[#0B1E3C] px-6 py-6 text-white shadow-[0_24px_60px_rgba(11,30,60,0.24)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-[#FFD49F]">DokanX Admin</p>
            <h1 className="dx-display text-3xl">Shop Approvals</h1>
            <p className="text-sm text-slate-200">
              Monitor storefront readiness, ownership linkage, and approval state without leaving the main review queue.
            </p>
          </div>
          <Badge variant="secondary" className="border-white/15 bg-white/10 text-white">
            {shops.length} loaded
          </Badge>
        </div>
      </div>

      <AnalyticsCards items={summary} />

      {error ? <Alert variant="warning">{error}</Alert> : null}

      <Card>
        <CardTitle>Storefront approval queue</CardTitle>
        <CardDescription className="mt-2">
          Approve, suspend, and inspect ownership coverage for every merchant shop from one table.
        </CardDescription>
        <div className="mt-4">
          <DataTable
            columns={[
              { key: "name", header: "Shop" },
              { key: "domain", header: "Domain" },
              { key: "owner", header: "Owner" },
              {
                key: "status",
                header: "Status",
                render: (row) => <Badge variant={row.isActive ? "success" : "warning"}>{row.status}</Badge>,
              },
              {
                key: "actions",
                header: "Actions",
                render: (row) => (
                  <Button
                    size="sm"
                    variant={row.isActive ? "secondary" : "default"}
                    onClick={async () => {
                      if (!row.id) return;
                      setBusyId(row.id);
                      try {
                        if (row.isActive) {
                          await suspendShop(row.id);
                        } else {
                          await approveShop(row.id);
                        }
                        const response = await listShops();
                        setShops(Array.isArray(response.data) ? (response.data as ShopRow[]) : []);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Unable to update shop.");
                      } finally {
                        setBusyId(null);
                      }
                    }}
                    disabled={busyId === row.id}
                  >
                    {busyId === row.id ? "Updating..." : row.isActive ? "Suspend" : "Approve"}
                  </Button>
                ),
              },
            ]}
            rows={shops.map((shop) => ({
              id: String(shop._id || ""),
              isActive: Boolean(shop.isActive),
              name: shop.name || "Shop",
              domain: shop.domain || shop.slug || "Pending",
              owner: shop.owner?.name || shop.owner?.email || "Unknown",
              status: shop.isActive ? "Active" : "Inactive",
            }))}
          />
        </div>
      </Card>
    </div>
  );
}

