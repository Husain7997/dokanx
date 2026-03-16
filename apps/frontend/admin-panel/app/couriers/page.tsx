"use client";

import { useEffect, useState } from "react";
import { Card, CardDescription, CardTitle, DataTable } from "@dokanx/ui";

import { listCarriers } from "@/lib/admin-runtime-api";

type CarrierRow = {
  id?: string;
  name?: string;
  supportsTracking?: boolean;
};

export const dynamic = "force-dynamic";

export default function Page() {
  const [carriers, setCarriers] = useState<CarrierRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await listCarriers();
        if (!active) return;
        setCarriers(Array.isArray(response.data) ? (response.data as CarrierRow[]) : []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load couriers.");
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
        <h1 className="dx-display text-3xl">Couriers</h1>
        <p className="text-sm text-muted-foreground">Delivery partners and SLAs</p>
      </div>
      {error ? (
        <Card>
          <CardTitle>Couriers</CardTitle>
          <CardDescription className="mt-2">{error}</CardDescription>
        </Card>
      ) : null}
      <DataTable
        columns={[
          { key: "name", header: "Carrier" },
          { key: "tracking", header: "Tracking" },
        ]}
        rows={carriers.map((carrier) => ({
          name: carrier.name || carrier.id || "Carrier",
          tracking: carrier.supportsTracking ? "Enabled" : "Disabled",
        }))}
      />
    </div>
  );
}
