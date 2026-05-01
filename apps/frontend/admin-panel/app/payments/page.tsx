"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert, AnalyticsCards, Badge, Button, Card, CardDescription, CardTitle, DataTable, Input, Select } from "@dokanx/ui";

import { listPaymentGateways, getFraudOverview } from "@/lib/admin-runtime-api";

type GatewayRow = {
  id?: string;
  name?: string;
  status?: string;
  supportsRefunds?: boolean;
};

type TransactionRow = {
  id?: string;
  amount?: number;
  gateway?: string;
  status?: string;
  createdAt?: string;
  orderId?: string;
  userId?: string;
};

type WebhookLog = {
  id?: string;
  gateway?: string;
  status?: string;
  payload?: string;
  createdAt?: string;
};

export default function PaymentsPage() {
  const searchParams = useSearchParams();
  const [gateways, setGateways] = useState<GatewayRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [fraudOverview, setFraudOverview] = useState<{ summary?: { paymentFailureRate?: number } } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterGateway, setFilterGateway] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [gatewayResponse, fraudResponse] = await Promise.all([
          listPaymentGateways(),
          getFraudOverview(),
        ]);
        if (!active) return;
        setGateways(Array.isArray(gatewayResponse.data) ? (gatewayResponse.data as GatewayRow[]) : []);
        setFraudOverview(fraudResponse.data || null);
        // Mock transaction data - replace with actual API call
        setTransactions([
          { id: "TXN001", amount: 1500, gateway: "bKash", status: "SUCCESS", createdAt: new Date().toISOString(), orderId: "ORD001", userId: "USER001" },
          { id: "TXN002", amount: 2500, gateway: "Nagad", status: "FAILED", createdAt: new Date().toISOString(), orderId: "ORD002", userId: "USER002" },
        ]);
        setWebhookLogs([
          { id: "WH001", gateway: "bKash", status: "SUCCESS", payload: "payment_succeeded", createdAt: new Date().toISOString() },
          { id: "WH002", gateway: "Stripe", status: "FAILED", payload: "payment_failed", createdAt: new Date().toISOString() },
        ]);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load payment data.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setSearchQuery(searchParams.get("q") || "");
    setFilterStatus(searchParams.get("status") || "ALL");
    setFilterGateway(searchParams.get("gateway") || "ALL");
  }, [searchParams]);

  const summary = useMemo(() => {
    const totalTxns = transactions.length;
    const successTxns = transactions.filter((t) => t.status === "SUCCESS").length;
    const failedTxns = transactions.filter((t) => t.status === "FAILED").length;
    const successRate = totalTxns > 0 ? Math.round((successTxns / totalTxns) * 100) : 0;
    const activeGateways = gateways.filter((g) => g.status === "ACTIVE").length;
    return [
      { label: "Total transactions", value: String(totalTxns), meta: "Payment attempts" },
      { label: "Success rate", value: `${successRate}%`, meta: "Successful payments" },
      { label: "Failed payments", value: String(failedTxns), meta: "Require attention" },
      { label: "Active gateways", value: String(activeGateways), meta: "Available for payments" },
      { label: "Payment failure rate", value: `${fraudOverview?.summary?.paymentFailureRate ?? 0}%`, meta: "System-wide failures" },
      { label: "Webhook logs", value: String(webhookLogs.length), meta: "Recent gateway events" },
    ];
  }, [transactions, gateways, fraudOverview, webhookLogs]);

  const filteredTransactions = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return transactions.filter((txn) => {
      const statusMatch = filterStatus === "ALL" || txn.status === filterStatus;
      const gatewayMatch = filterGateway === "ALL" || txn.gateway === filterGateway;
      const searchMatch =
        !needle ||
        [txn.id, txn.orderId, txn.userId, txn.gateway, txn.status]
          .some((value) => String(value || "").toLowerCase().includes(needle));
      return statusMatch && gatewayMatch && searchMatch;
    });
  }, [transactions, filterStatus, filterGateway, searchQuery]);

  return (
    <div className="grid gap-6">
      <div className="rounded-[28px] border border-white/10 bg-[#0B1E3C] px-6 py-6 text-white shadow-[0_24px_60px_rgba(11,30,60,0.24)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-[#FFD49F]">DokanX Admin</p>
            <h1 className="dx-display text-3xl">Payment Gateway Control</h1>
            <p className="text-sm text-slate-200">
              Monitor payment gateways, transaction logs, webhook activity, and failure recovery from one operational dashboard.
            </p>
          </div>
          <Badge variant="secondary" className="border-white/15 bg-white/10 text-white">
            {gateways.length} gateways
          </Badge>
        </div>
      </div>

      <AnalyticsCards items={summary} />

      {error ? <Alert variant="warning">{error}</Alert> : null}

      <Card>
        <CardTitle>Gateway Management</CardTitle>
        <CardDescription className="mt-2">
          Control payment gateway availability and monitor their operational status.
        </CardDescription>
        <div className="mt-4">
          <DataTable
            columns={[
              { key: "name", header: "Gateway" },
              { key: "status", header: "Status" },
              { key: "refunds", header: "Refunds" },
              {
                key: "actions",
                header: "Actions",
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant={row.statusValue === "ACTIVE" ? "secondary" : "primary"}>
                      {row.statusValue === "ACTIVE" ? "Disable" : "Enable"}
                    </Button>
                    <Button size="sm" variant="outline">Configure</Button>
                  </div>
                ),
              },
            ]}
            rows={gateways.map((gateway) => ({
              id: gateway.id,
              name: gateway.name || gateway.id || "Gateway",
              status: (
                <Badge variant={gateway.status === "ACTIVE" ? "success" : "warning"}>
                  {gateway.status || "INACTIVE"}
                </Badge>
              ),
              statusValue: gateway.status,
              refunds: gateway.supportsRefunds ? "Auto" : "Manual",
              actions: "", // Handled by render
            }))}
          />
        </div>
      </Card>

      <Card>
        <CardTitle>Transaction Logs</CardTitle>
        <CardDescription className="mt-2">
          Review payment attempts, failures, and gateway performance with filtering and manual verification.
        </CardDescription>
        <div className="mt-4 flex flex-wrap gap-4">
          <Input
            placeholder="Search txn, order, user, gateway..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="max-w-sm"
          />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <option value="ALL">All Status</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
            <option value="PENDING">Pending</option>
          </Select>
          <Select value={filterGateway} onValueChange={setFilterGateway}>
            <option value="ALL">All Gateways</option>
            {gateways.map((g) => (
              <option key={g.id} value={g.name || g.id}>{g.name || g.id}</option>
            ))}
          </Select>
        </div>
        <div className="mt-4">
          <DataTable
            columns={[
              { key: "id", header: "Transaction ID" },
              { key: "amount", header: "Amount" },
              { key: "gateway", header: "Gateway" },
              { key: "status", header: "Status" },
              { key: "createdAt", header: "Time" },
              {
                key: "actions",
                header: "Actions",
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline">Verify</Button>
                    <Button size="sm" variant="secondary">Retry</Button>
                    <Button size="sm" variant="secondary">Refund</Button>
                  </div>
                ),
              },
            ]}
            rows={filteredTransactions.map((txn) => ({
              id: txn.id,
              amount: `${txn.amount} BDT`,
              gateway: txn.gateway,
              status: (
                <Badge variant={txn.status === "SUCCESS" ? "success" : txn.status === "FAILED" ? "warning" : "neutral"}>
                  {txn.status}
                </Badge>
              ),
              createdAt: txn.createdAt ? new Date(txn.createdAt).toLocaleString() : "N/A",
              actions: "", // Handled by render
            }))}
          />
        </div>
      </Card>

      <Card>
        <CardTitle>Webhook Logs</CardTitle>
        <CardDescription className="mt-2">
          Monitor gateway webhook deliveries and retry failed notifications.
        </CardDescription>
        <div className="mt-4">
          <DataTable
            columns={[
              { key: "id", header: "Webhook ID" },
              { key: "gateway", header: "Gateway" },
              { key: "status", header: "Status" },
              { key: "payload", header: "Event" },
              { key: "createdAt", header: "Time" },
              {
                key: "actions",
                header: "Actions",
                render: (row) => (
                  <Button size="sm" variant={row.statusValue === "FAILED" ? "secondary" : "outline"}>
                    {row.statusValue === "FAILED" ? "Retry" : "View"}
                  </Button>
                ),
              },
            ]}
            rows={webhookLogs.map((log) => ({
              id: log.id,
              gateway: log.gateway,
              status: (
                <Badge variant={log.status === "SUCCESS" ? "success" : "warning"}>
                  {log.status}
                </Badge>
              ),
              statusValue: log.status,
              payload: log.payload,
              createdAt: log.createdAt ? new Date(log.createdAt).toLocaleString() : "N/A",
              actions: "", // Handled by render
            }))}
          />
        </div>
      </Card>
    </div>
  );
}
