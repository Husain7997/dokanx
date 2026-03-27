"use client";

import { useEffect, useState } from "react";
import { Button, Card, CardDescription, CardTitle, DataTable } from "@dokanx/ui";

import { listAgents, updateAgentStatus } from "@/lib/admin-runtime-api";

type AgentRow = {
  _id?: string;
  agentCode?: string;
  status?: string;
  clickCount?: number;
  shopConversionCount?: number;
  totalEarnings?: number;
  userId?: {
    name?: string;
    email?: string;
    phone?: string;
  };
};

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const response = await listAgents();
    setAgents(Array.isArray(response.data) ? (response.data as AgentRow[]) : []);
  }

  useEffect(() => {
    void load().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Unable to load agents.");
    });
  }, []);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="dx-display text-3xl">Agents</h1>
        <p className="text-sm text-muted-foreground">Approve, ban, and monitor agent funnel performance.</p>
      </div>
      {error ? (
        <Card>
          <CardTitle>Agents</CardTitle>
          <CardDescription className="mt-2">{error}</CardDescription>
        </Card>
      ) : null}
      <DataTable
        columns={[
          { key: "agent", header: "Agent" },
          { key: "code", header: "Code" },
          { key: "status", header: "Status" },
          { key: "performance", header: "Performance" },
          { key: "earnings", header: "Earnings" },
          {
            key: "actions",
            header: "Actions",
            render: (row) => (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busyId === row.id}
                  onClick={async () => {
                    setBusyId(row.id);
                    setError(null);
                    try {
                      await updateAgentStatus(String(row.id), "ACTIVE");
                      await load();
                    } catch (actionError) {
                      setError(actionError instanceof Error ? actionError.message : "Unable to approve agent.");
                    } finally {
                      setBusyId(null);
                    }
                  }}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  disabled={busyId === row.id}
                  onClick={async () => {
                    setBusyId(row.id);
                    setError(null);
                    try {
                      await updateAgentStatus(String(row.id), "BANNED");
                      await load();
                    } catch (actionError) {
                      setError(actionError instanceof Error ? actionError.message : "Unable to ban agent.");
                    } finally {
                      setBusyId(null);
                    }
                  }}
                >
                  Ban
                </Button>
              </div>
            ),
          },
        ]}
        rows={agents.map((agent) => ({
          id: String(agent._id || ""),
          agent: agent.userId?.name || agent.userId?.email || agent.userId?.phone || "Agent",
          code: agent.agentCode || "-",
          status: agent.status || "ACTIVE",
          performance: `${agent.clickCount ?? 0} clicks / ${agent.shopConversionCount ?? 0} shops`,
          earnings: `${agent.totalEarnings ?? 0} BDT`,
        }))}
      />
    </div>
  );
}
