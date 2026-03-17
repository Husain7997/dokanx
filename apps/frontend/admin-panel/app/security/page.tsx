"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, CardDescription, CardTitle, DataTable, Input } from "@dokanx/ui";

import { blockIp, listAuditLogs, listIpBlocks, unblockIp } from "@/lib/admin-runtime-api";

type AuditRow = {
  _id?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  createdAt?: string;
};

type IpBlockRow = {
  _id?: string;
  ip?: string;
  reason?: string;
  status?: string;
  createdAt?: string;
};

export const dynamic = "force-dynamic";

export default function SecurityPage() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [blocks, setBlocks] = useState<IpBlockRow[]>([]);
  const [ip, setIp] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [logsResponse, blockResponse] = await Promise.all([
          listAuditLogs(),
          listIpBlocks(),
        ]);
        if (!active) return;
        setLogs(Array.isArray(logsResponse.data) ? (logsResponse.data as AuditRow[]) : []);
        setBlocks(Array.isArray(blockResponse.data) ? (blockResponse.data as IpBlockRow[]) : []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load security logs.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const loginLogs = useMemo(
    () => logs.filter((log) => String(log.action || "").toUpperCase().includes("LOGIN")),
    [logs]
  );
  const apiLogs = useMemo(
    () => logs.filter((log) => String(log.action || "").toUpperCase().includes("API")),
    [logs]
  );

  async function handleBlockIp() {
    if (!ip) return;
    setStatus(null);
    try {
      await blockIp({ ip, reason });
      const response = await listIpBlocks();
      setBlocks(Array.isArray(response.data) ? (response.data as IpBlockRow[]) : []);
      setStatus("IP blocked.");
      setIp("");
      setReason("");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Unable to block IP.");
    }
  }

  async function handleUnblockIp(id: string) {
    setStatus(null);
    try {
      await unblockIp(id);
      const response = await listIpBlocks();
      setBlocks(Array.isArray(response.data) ? (response.data as IpBlockRow[]) : []);
      setStatus("IP unblocked.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Unable to unblock IP.");
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="dx-display text-3xl">Security</h1>
        <p className="text-sm text-muted-foreground">Login logs, API usage, and IP blocking.</p>
      </div>
      {error ? (
        <Card>
          <CardTitle>Security</CardTitle>
          <CardDescription className="mt-2">{error}</CardDescription>
        </Card>
      ) : null}

      <Card>
        <CardTitle>IP block list</CardTitle>
        <CardDescription className="mt-2">Block suspicious IPs from accessing the platform.</CardDescription>
        <div className="mt-4 flex flex-wrap gap-3">
          <Input value={ip} onChange={(event) => setIp(event.target.value)} placeholder="IP address" />
          <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason" />
          <Button onClick={handleBlockIp}>Block IP</Button>
        </div>
        {status ? <p className="mt-3 text-xs text-muted-foreground">{status}</p> : null}
        <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
          {blocks.map((block) => (
            <div key={String(block._id)} className="flex flex-wrap justify-between gap-2 rounded-2xl border border-border/60 px-4 py-3">
              <span>{block.ip}</span>
              <span>{block.reason || "No reason"}</span>
              <span>{block.status || "BLOCKED"}</span>
              <Button size="sm" variant="secondary" onClick={() => block._id && handleUnblockIp(block._id)}>
                Unblock
              </Button>
            </div>
          ))}
          {!blocks.length ? <p>No blocked IPs.</p> : null}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Login logs</CardTitle>
          <CardDescription className="mt-2">Recent authentication events.</CardDescription>
          <DataTable
            columns={[
              { key: "action", header: "Action" },
              { key: "target", header: "Target" },
              { key: "time", header: "Time" },
            ]}
            rows={loginLogs.map((log) => ({
              action: log.action || "LOGIN",
              target: `${log.targetType || "User"} ${log.targetId || ""}`.trim(),
              time: log.createdAt ? new Date(log.createdAt).toLocaleString() : "Unknown",
            }))}
          />
        </Card>
        <Card>
          <CardTitle>API logs</CardTitle>
          <CardDescription className="mt-2">Recent API access events.</CardDescription>
          <DataTable
            columns={[
              { key: "action", header: "Action" },
              { key: "target", header: "Target" },
              { key: "time", header: "Time" },
            ]}
            rows={apiLogs.map((log) => ({
              action: log.action || "API_CALL",
              target: `${log.targetType || "Endpoint"} ${log.targetId || ""}`.trim(),
              time: log.createdAt ? new Date(log.createdAt).toLocaleString() : "Unknown",
            }))}
          />
        </Card>
      </div>
    </div>
  );
}
