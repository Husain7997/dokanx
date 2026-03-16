"use client";

import { useEffect, useState } from "react";
import { Card, CardDescription, CardTitle, DataTable } from "@dokanx/ui";

import { listAuditLogs } from "@/lib/admin-runtime-api";

type AuditRow = {
  _id?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  createdAt?: string;
};

export const dynamic = "force-dynamic";

export default function Page() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await listAuditLogs();
        if (!active) return;
        setLogs(Array.isArray(response.data) ? (response.data as AuditRow[]) : []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load audit logs.");
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
        <h1 className="dx-display text-3xl">Risk</h1>
        <p className="text-sm text-muted-foreground">Compliance flags and risk posture</p>
      </div>
      {error ? (
        <Card>
          <CardTitle>Risk feed</CardTitle>
          <CardDescription className="mt-2">{error}</CardDescription>
        </Card>
      ) : null}
      <DataTable
        columns={[
          { key: "action", header: "Action" },
          { key: "target", header: "Target" },
          { key: "time", header: "Time" },
        ]}
        rows={logs.map((log) => ({
          action: log.action || "AUDIT",
          target: `${log.targetType || "Target"} ${log.targetId || ""}`.trim(),
          time: log.createdAt ? new Date(log.createdAt).toLocaleString() : "Unknown",
        }))}
      />
    </div>
  );
}
