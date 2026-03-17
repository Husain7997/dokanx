"use client";

import { useEffect, useState } from "react";
import { Card, CardDescription, CardTitle, DataTable } from "@dokanx/ui";

import { listPaymentGateways } from "@/lib/admin-runtime-api";

type GatewayRow = {
  id?: string;
  name?: string;
  status?: string;
  supportsRefunds?: boolean;
};

export default function PaymentsPage() {
  const [gateways, setGateways] = useState<GatewayRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await listPaymentGateways();
        if (!active) return;
        setGateways(Array.isArray(response.data) ? (response.data as GatewayRow[]) : []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load gateways.");
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
        <h1 className="dx-display text-3xl">Payments</h1>
        <p className="text-sm text-muted-foreground">Monitor payment gateways and refund capabilities.</p>
      </div>
      {error ? (
        <Card>
          <CardTitle>Payment gateways</CardTitle>
          <CardDescription className="mt-2">{error}</CardDescription>
        </Card>
      ) : null}
      <DataTable
        columns={[
          { key: "name", header: "Gateway" },
          { key: "status", header: "Status" },
          { key: "refunds", header: "Refunds" },
        ]}
        rows={gateways.map((gateway) => ({
          name: gateway.name || gateway.id || "Gateway",
          status: gateway.status || "ACTIVE",
          refunds: gateway.supportsRefunds ? "Supported" : "Manual",
        }))}
      />
    </div>
  );
}
