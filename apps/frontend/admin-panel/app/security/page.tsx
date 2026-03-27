"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, CardDescription, CardTitle, DataTable, Input, SelectDropdown } from "@dokanx/ui";

import { blockIp, getRiskSettings, listAuditLogs, listIpBlocks, unblockIp, updateRiskSettings } from "@/lib/admin-runtime-api";

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
  const [auditQuery, setAuditQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [selectedBlocks, setSelectedBlocks] = useState<Record<string, boolean>>({});
  const [highRiskThreshold, setHighRiskThreshold] = useState(80);
  const [mediumRiskThreshold, setMediumRiskThreshold] = useState(50);
  const [riskTag, setRiskTag] = useState("Security");
  const [riskStatus, setRiskStatus] = useState<string | null>(null);
  const defaultRiskRules = { high: 80, medium: 50, tag: "Security" };
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
        const riskResponse = await getRiskSettings();
        if (!active) return;
        if (riskResponse?.data) {
          setHighRiskThreshold(Number(riskResponse.data.highThreshold ?? 80));
          setMediumRiskThreshold(Number(riskResponse.data.mediumThreshold ?? 50));
          setRiskTag(String(riskResponse.data.tag ?? "Security"));
        }
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

  const filteredLogs = useMemo(() => {
    const needle = auditQuery.trim().toLowerCase();
    return logs.filter((log) => {
      if (actionFilter !== "ALL" && String(log.action || "") !== actionFilter) return false;
      if (!needle) return true;
      return [log.action, log.targetType, log.targetId].some((value) =>
        String(value || "").toLowerCase().includes(needle)
      );
    });
  }, [actionFilter, auditQuery, logs]);

  const actionOptions = useMemo(() => {
    const uniqueActions = Array.from(new Set(logs.map((log) => String(log.action || "UNKNOWN")))).filter(Boolean);
    return [{ label: "All actions", value: "ALL" }, ...uniqueActions.map((action) => ({ label: action, value: action }))];
  }, [logs]);

  const loginLogs = useMemo(
    () => filteredLogs.filter((log) => String(log.action || "").toUpperCase().includes("LOGIN")),
    [filteredLogs]
  );
  const apiLogs = useMemo(
    () => filteredLogs.filter((log) => String(log.action || "").toUpperCase().includes("API")),
    [filteredLogs]
  );
  const ipAuditLogs = useMemo(
    () =>
      filteredLogs.filter((log) => {
        const action = String(log.action || "").toUpperCase();
        return action.includes("IP") || action.includes("BLOCK");
      }),
    [filteredLogs]
  );

  const selectedIds = useMemo(
    () => blocks.filter((block) => selectedBlocks[String(block._id || "")]).map((block) => String(block._id || "")),
    [blocks, selectedBlocks]
  );

  async function handleBulkUnblock() {
    if (!selectedIds.length) return;
    setStatus(null);
    try {
      await Promise.all(selectedIds.map((id) => unblockIp(id)));
      const response = await listIpBlocks();
      setBlocks(Array.isArray(response.data) ? (response.data as IpBlockRow[]) : []);
      setSelectedBlocks({});
      setStatus("Selected IPs unblocked.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Unable to bulk unblock.");
    }
  }

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

  async function handleSaveRiskRules() {
    setRiskStatus(null);
    try {
      const response = await updateRiskSettings({
        highThreshold: Number(highRiskThreshold),
        mediumThreshold: Number(mediumRiskThreshold),
        tag: riskTag || "Security",
      });
      if (response?.data) {
        setHighRiskThreshold(Number(response.data.highThreshold ?? highRiskThreshold));
        setMediumRiskThreshold(Number(response.data.mediumThreshold ?? mediumRiskThreshold));
        setRiskTag(String(response.data.tag ?? riskTag));
      }
      setRiskStatus("Risk rules saved.");
    } catch (err) {
      setRiskStatus(err instanceof Error ? err.message : "Unable to save risk rules.");
    }
  }

  async function handleResetRiskRules() {
    setHighRiskThreshold(defaultRiskRules.high);
    setMediumRiskThreshold(defaultRiskRules.medium);
    setRiskTag(defaultRiskRules.tag);
    setRiskStatus(null);
    try {
      const response = await updateRiskSettings({
        highThreshold: defaultRiskRules.high,
        mediumThreshold: defaultRiskRules.medium,
        tag: defaultRiskRules.tag,
      });
      if (response?.data) {
        setHighRiskThreshold(Number(response.data.highThreshold ?? defaultRiskRules.high));
        setMediumRiskThreshold(Number(response.data.mediumThreshold ?? defaultRiskRules.medium));
        setRiskTag(String(response.data.tag ?? defaultRiskRules.tag));
      }
      setRiskStatus("Risk rules reset to defaults.");
    } catch (err) {
      setRiskStatus(err instanceof Error ? err.message : "Unable to reset risk rules.");
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
        <div className="mt-4 flex flex-wrap gap-3">
          <Button size="sm" variant="secondary" onClick={handleBulkUnblock} disabled={!selectedIds.length}>
            Bulk unblock ({selectedIds.length})
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const next: Record<string, boolean> = {};
              blocks.forEach((block) => {
                if (block._id) next[String(block._id)] = true;
              });
              setSelectedBlocks(next);
            }}
          >
            Select all
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              const rows = blocks.map((block) => ({
                ip: block.ip || "",
                reason: block.reason || "",
                status: block.status || "",
                severity: getSeverity(block.reason).label,
                createdAt: block.createdAt || "",
              }));
              const csv = buildCsv(rows);
              downloadCsv(csv, `ip-blocks-${new Date().toISOString().slice(0, 10)}.csv`);
            }}
          >
            Export IP blocks CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const rows = blocks
                .filter((block) => selectedBlocks[String(block._id || "")])
                .map((block) => ({
                  ip: block.ip || "",
                  reason: block.reason || "",
                  status: block.status || "",
                  severity: getSeverity(block.reason).label,
                  createdAt: block.createdAt || "",
                }));
              const csv = buildCsv(rows);
              downloadCsv(csv, `ip-blocks-selected-${new Date().toISOString().slice(0, 10)}.csv`);
            }}
            disabled={!selectedIds.length}
          >
            Export selected
          </Button>
        </div>
        <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
          {blocks.map((block) => (
            <div key={String(block._id)} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/60 px-4 py-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedBlocks[String(block._id || "")] || false}
                  onChange={(event) =>
                    setSelectedBlocks((current) => ({
                      ...current,
                      [String(block._id || "")]: event.target.checked,
                    }))
                  }
                />
                <span>{block.ip}</span>
              </label>
              <span>{block.reason || "No reason"}</span>
              <Badge variant={getSeverity(block.reason).variant}>{getSeverity(block.reason).label}</Badge>
              <span>{block.status || "BLOCKED"}</span>
              <Button size="sm" variant="secondary" onClick={() => block._id && handleUnblockIp(block._id)}>
                Unblock
              </Button>
            </div>
          ))}
          {!blocks.length ? <p>No blocked IPs.</p> : null}
        </div>
      </Card>

      <Card>
        <CardTitle>Risk scoring rules</CardTitle>
        <CardDescription className="mt-2">Tune thresholds and tags used for audit scoring.</CardDescription>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Input
            type="number"
            value={String(highRiskThreshold)}
            onChange={(event) => setHighRiskThreshold(Number(event.target.value))}
            placeholder="High risk threshold"
          />
          <Input
            type="number"
            value={String(mediumRiskThreshold)}
            onChange={(event) => setMediumRiskThreshold(Number(event.target.value))}
            placeholder="Medium risk threshold"
          />
          <Input
            value={riskTag}
            onChange={(event) => setRiskTag(event.target.value)}
            placeholder="Risk tag"
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          High risk ≥ {highRiskThreshold}, Medium risk ≥ {mediumRiskThreshold}. Tag: {riskTag || "Security"}.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Button size="sm" variant="secondary" onClick={handleSaveRiskRules}>
            Save rules
          </Button>
          <Button size="sm" variant="outline" onClick={handleResetRiskRules}>
            Reset defaults
          </Button>
          {riskStatus ? <span className="text-xs text-muted-foreground">{riskStatus}</span> : null}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Login logs</CardTitle>
          <CardDescription className="mt-2">Recent authentication events.</CardDescription>
          <div className="mt-3 grid gap-3">
            <Input value={auditQuery} onChange={(event) => setAuditQuery(event.target.value)} placeholder="Filter logs by action/target" />
            <SelectDropdown label="Action filter" options={actionOptions} value={actionFilter} onValueChange={setActionFilter} />
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="neutral">Total {loginLogs.length}</Badge>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  exportAuditCsv(
                    loginLogs,
                    `login-logs-${new Date().toISOString().slice(0, 10)}.csv`,
                    highRiskThreshold,
                    mediumRiskThreshold,
                    riskTag
                  )
                }
              >
                Export login logs
              </Button>
            </div>
          </div>
          <DataTable
            columns={[
              { key: "action", header: "Action" },
              { key: "target", header: "Target" },
              { key: "time", header: "Time" },
              { key: "risk", header: "Risk" },
            ]}
            rows={loginLogs.map((log) => {
              const risk = getRiskScore(log.action || "", highRiskThreshold, mediumRiskThreshold, riskTag);
              return {
                action: log.action || "LOGIN",
                target: `${log.targetType || "User"} ${log.targetId || ""}`.trim(),
                time: log.createdAt ? new Date(log.createdAt).toLocaleString() : "Unknown",
                risk: <Badge variant={risk.variant}>{risk.label}</Badge>,
              };
            })}
          />
        </Card>
        <Card>
          <CardTitle>API logs</CardTitle>
          <CardDescription className="mt-2">Recent API access events.</CardDescription>
          <div className="mt-3 grid gap-3">
            <Input value={auditQuery} onChange={(event) => setAuditQuery(event.target.value)} placeholder="Filter logs by action/target" />
            <SelectDropdown label="Action filter" options={actionOptions} value={actionFilter} onValueChange={setActionFilter} />
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="neutral">Total {apiLogs.length}</Badge>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  exportAuditCsv(
                    apiLogs,
                    `api-logs-${new Date().toISOString().slice(0, 10)}.csv`,
                    highRiskThreshold,
                    mediumRiskThreshold,
                    riskTag
                  )
                }
              >
                Export API logs
              </Button>
            </div>
          </div>
          <DataTable
            columns={[
              { key: "action", header: "Action" },
              { key: "target", header: "Target" },
              { key: "time", header: "Time" },
              { key: "risk", header: "Risk" },
            ]}
            rows={apiLogs.map((log) => {
              const risk = getRiskScore(log.action || "", highRiskThreshold, mediumRiskThreshold, riskTag);
              return {
                action: log.action || "API_CALL",
                target: `${log.targetType || "Endpoint"} ${log.targetId || ""}`.trim(),
                time: log.createdAt ? new Date(log.createdAt).toLocaleString() : "Unknown",
                risk: <Badge variant={risk.variant}>{risk.label}</Badge>,
              };
            })}
          />
        </Card>
      </div>

      <Card>
        <CardTitle>Audit export</CardTitle>
        <CardDescription className="mt-2">Bulk export audit logs with risk scoring.</CardDescription>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => exportAuditCsv(filteredLogs, `audit-logs-filtered-${new Date().toISOString().slice(0, 10)}.csv`, highRiskThreshold, mediumRiskThreshold, riskTag)}
            disabled={!filteredLogs.length}
          >
            Export filtered logs
          </Button>
          <Button
            variant="outline"
            onClick={() => exportAuditCsv(logs, `audit-logs-all-${new Date().toISOString().slice(0, 10)}.csv`, highRiskThreshold, mediumRiskThreshold, riskTag)}
            disabled={!logs.length}
          >
            Export all logs
          </Button>
        </div>
      </Card>

      <Card>
        <CardTitle>IP block audit trail</CardTitle>
        <CardDescription className="mt-2">Audit log of IP block/unblock events.</CardDescription>
        <div className="mt-3 grid gap-3">
          <Input value={auditQuery} onChange={(event) => setAuditQuery(event.target.value)} placeholder="Filter audit trail" />
          <SelectDropdown label="Action filter" options={actionOptions} value={actionFilter} onValueChange={setActionFilter} />
        </div>
        <DataTable
          columns={[
            { key: "action", header: "Action" },
            { key: "target", header: "Target" },
            { key: "time", header: "Time" },
          ]}
          rows={ipAuditLogs.map((log) => ({
            id: String(log._id || ""),
            action: log.action || "IP_BLOCK",
            target: `${log.targetType || "IP"} ${log.targetId || ""}`.trim(),
            time: log.createdAt ? new Date(log.createdAt).toLocaleString() : "Unknown",
          }))}
        />
        {!ipAuditLogs.length ? (
          <p className="mt-3 text-sm text-muted-foreground">No IP audit entries found.</p>
        ) : null}
      </Card>
    </div>
  );
}

function buildCsv(rows: Array<Record<string, string | number>>) {
  const headers = rows.length ? Object.keys(rows[0]) : ["ip", "reason", "status", "createdAt"];
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((key) => `"${String(row[key] ?? "").replace(/\"/g, '""')}"`)
        .join(",")
    ),
  ];
  return lines.join("\n");
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function exportAuditCsv(
  rows: AuditRow[],
  filename: string,
  highThreshold = 80,
  mediumThreshold = 50,
  tag = "Security"
) {
  const csvRows = rows.map((log) => ({
    action: log.action || "",
    targetType: log.targetType || "",
    targetId: log.targetId || "",
    riskScore: getRiskScore(log.action || "", highThreshold, mediumThreshold, tag).score,
    riskLabel: getRiskScore(log.action || "", highThreshold, mediumThreshold, tag).label,
    createdAt: log.createdAt || "",
  }));
  const csv = buildCsv(csvRows);
  downloadCsv(csv, filename);
}

function getSeverity(reason?: string | null) {
  const value = String(reason || "").toLowerCase();
  if (value.includes("fraud") || value.includes("attack") || value.includes("abuse")) {
    return { label: "High", variant: "danger" as const };
  }
  if (value.includes("suspicious") || value.includes("brute") || value.includes("spam")) {
    return { label: "Medium", variant: "warning" as const };
  }
  return { label: "Low", variant: "neutral" as const };
}

function getRiskScore(action: string, highThreshold: number, mediumThreshold: number, tag: string) {
  const value = action.toUpperCase();
  let score = 30;
  if (value.includes("FAILED") || value.includes("BLOCK") || value.includes("SUSPEND")) {
    score = 90;
  } else if (value.includes("LOGIN") && value.includes("FAILED")) {
    score = 80;
  } else if (value.includes("LOGIN") || value.includes("TOKEN") || value.includes("AUTH")) {
    score = 60;
  } else if (value.includes("API")) {
    score = 40;
  }
  if (score >= highThreshold) {
    return { score, label: `${tag} High`, variant: "danger" as const };
  }
  if (score >= mediumThreshold) {
    return { score, label: `${tag} Medium`, variant: "warning" as const };
  }
  return { score, label: `${tag} Low`, variant: "neutral" as const };
}
