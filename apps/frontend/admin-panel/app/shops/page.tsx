"use client";

import { useEffect, useState } from "react";
import { Button, Card, CardDescription, CardTitle, DataTable } from "@dokanx/ui";

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

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="dx-display text-3xl">Shops</h1>
        <p className="text-sm text-muted-foreground">Storefront and merchant approvals</p>
      </div>
      {error ? (
        <Card>
          <CardTitle>Shops</CardTitle>
          <CardDescription className="mt-2">{error}</CardDescription>
        </Card>
      ) : null}
      <DataTable
        columns={[
          { key: "name", header: "Shop" },
          { key: "domain", header: "Domain" },
          { key: "owner", header: "Owner" },
          { key: "status", header: "Status" },
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
  );
}
