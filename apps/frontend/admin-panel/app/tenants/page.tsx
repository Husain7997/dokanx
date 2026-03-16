"use client";

import { useEffect, useState } from "react";
import { Card, CardDescription, CardTitle, DataTable } from "@dokanx/ui";

import { listShops } from "@/lib/admin-runtime-api";

type TenantRow = {
  _id?: string;
  name?: string;
  domain?: string;
  slug?: string;
  isActive?: boolean;
};

export const dynamic = "force-dynamic";

export default function Page() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await listShops();
        if (!active) return;
        setTenants(Array.isArray(response.data) ? (response.data as TenantRow[]) : []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load tenants.");
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
        <h1 className="dx-display text-3xl">Tenants</h1>
        <p className="text-sm text-muted-foreground">Onboard and monitor active tenants</p>
      </div>
      {error ? (
        <Card>
          <CardTitle>Tenants</CardTitle>
          <CardDescription className="mt-2">{error}</CardDescription>
        </Card>
      ) : null}
      <DataTable
        columns={[
          { key: "name", header: "Tenant" },
          { key: "domain", header: "Domain" },
          { key: "status", header: "Status" },
        ]}
        rows={tenants.map((tenant) => ({
          name: tenant.name || "Tenant",
          domain: tenant.domain || tenant.slug || "Pending",
          status: tenant.isActive ? "Active" : "Inactive",
        }))}
      />
    </div>
  );
}
