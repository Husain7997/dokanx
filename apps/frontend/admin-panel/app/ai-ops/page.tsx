"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, AnalyticsCards, Badge, Button, Card, CardDescription, CardTitle, DataTable, Input, SelectDropdown } from "@dokanx/ui";

import { AdminOpsPressure } from "@/components/admin-ops-pressure";
import { AdminOpsThresholds } from "@/components/admin-ops-thresholds";
import { checkFraudTransaction, freezeWallet, getAiMerchantInsights, getAiTrending, getFraudOverview, listAuditLogs } from "@/lib/admin-runtime-api";

type AuditRow = {
  _id?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  performedBy?: { name?: string; email?: string };
  meta?: Record<string, unknown>;
  createdAt?: string;
};

type FraudOverview = {
  summary?: {
    openCases?: number;
    reviewRequired?: number;
    fraudRate?: number;
    paymentFailureRate?: number;
  };
};

type MerchantInsight = {
  id?: string;
  title?: string;
  message?: string;
  badge?: "warning" | "info" | "success";
};

type TrendingItem = {
  name?: string;
  velocity?: number;
  changeLabel?: string;
  location?: string;
};

const AI_ACTIONS = new Set(["INVENTORY_ADJUSTED", "PAYMENT_RETRY_INITIATED", "CREDIT_POLICY_UPDATED", "ORDER_STATUS_UPDATED"]);

export const dynamic = "force-dynamic";

export default function AiOpsPage() {
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([]);
  const [fraudOverview, setFraudOverview] = useState<FraudOverview | null>(null);
  const [merchantInsights, setMerchantInsights] = useState<MerchantInsight[]>([]);
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedActionId, setSelectedActionId] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [status, setStatus] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const [auditResponse, fraudResponse, insightsResponse, trendingResponse] = await Promise.all([
        listAuditLogs(),
        getFraudOverview(),
        getAiMerchantInsights({ limit: 6 }),
        getAiTrending({ limit: 6 }),
      ]);
      setAuditLogs(Array.isArray(auditResponse.data) ? (auditResponse.data as AuditRow[]) : []);
      setFraudOverview((fraudResponse.data || null) as FraudOverview | null);
      setMerchantInsights(Array.isArray(insightsResponse.data) ? (insightsResponse.data as MerchantInsight[]) : []);
      setTrending(Array.isArray(trendingResponse.data) ? (trendingResponse.data as TrendingItem[]) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load AI operations console.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const aiActions = useMemo(
    () =>
      auditLogs.filter((log) => {
        const action = String(log.action || "").toUpperCase();
        const source = String((log.meta as Record<string, unknown> | undefined)?.source || "").toLowerCase();
        return AI_ACTIONS.has(action) || source === "merchant_ai_dashboard";
      }),
    [auditLogs]
  );


  const actionOptions = useMemo(() => {
    const items = Array.from(new Set(aiActions.map((log) => String(log.action || "ACTION")).filter(Boolean)));
    return [{ label: "All actions", value: "ALL" }, ...items.map((item) => ({ label: item.replace(/_/g, " "), value: item }))];
  }, [aiActions]);

  const sourceOptions = useMemo(() => {
    const items = Array.from(new Set(aiActions.map((log) => String((log.meta as Record<string, unknown> | undefined)?.source || "system")).filter(Boolean)));
    return [{ label: "All sources", value: "ALL" }, ...items.map((item) => ({ label: item, value: item }))];
  }, [aiActions]);

  const filteredAiActions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return aiActions.filter((log) => {
      const source = String((log.meta as Record<string, unknown> | undefined)?.source || "system");
      const action = String(log.action || "ACTION");
      if (sourceFilter !== "ALL" && source !== sourceFilter) return false;
      if (actionFilter !== "ALL" && action !== actionFilter) return false;
      if (!needle) return true;
      return [action, source, log.targetType, log.targetId, log.performedBy?.name, log.performedBy?.email]
        .some((value) => String(value || "").toLowerCase().includes(needle));
    });
  }, [actionFilter, aiActions, query, sourceFilter]);


  const selectedAction = useMemo(
    () => filteredAiActions.find((log) => String(log._id || "") === selectedActionId) || filteredAiActions[0] || null,
    [filteredAiActions, selectedActionId]
  );

  const summary = useMemo(() => {
    const aiDashboardActions = aiActions.filter((log) => String((log.meta as Record<string, unknown> | undefined)?.source || "").toLowerCase() === "merchant_ai_dashboard").length;
    const paymentRetries = aiActions.filter((log) => String(log.action || "") === "PAYMENT_RETRY_INITIATED").length;
    const creditChanges = aiActions.filter((log) => String(log.action || "") === "CREDIT_POLICY_UPDATED").length;
    const inventoryActions = aiActions.filter((log) => String(log.action || "") === "INVENTORY_ADJUSTED").length;
    return [
      { label: "AI actions", value: String(aiActions.length), meta: "Audited automation events" },
      { label: "Dashboard-triggered", value: String(aiDashboardActions), meta: "Source: merchant_ai_dashboard" },
      { label: "Payment retries", value: String(paymentRetries), meta: "Retry workflows initiated" },
      { label: "Credit policy changes", value: String(creditChanges), meta: "AI-assisted credit updates" },
      { label: "Inventory actions", value: String(inventoryActions), meta: "AI restock actions" },
      { label: "Fraud review backlog", value: String(fraudOverview?.summary?.reviewRequired ?? 0), meta: "Cases waiting for action" },
    ];
  }, [aiActions, fraudOverview?.summary?.reviewRequired]);


  async function handleRecheckFraud() {
    const orderId = getMetaString(selectedAction?.meta, "orderId");
    if (!orderId) return;
    setBusyAction("recheck");
    setStatus(null);
    try {
      await checkFraudTransaction({
        orderId,
        source: "admin_ai_ops_console",
      });
      setStatus(`Fraud recheck queued for order ${orderId.slice(-6)}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to recheck fraud.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleFreezeWallet() {
    const shopId = getMetaString(selectedAction?.meta, "shopId");
    if (!shopId) return;
    setBusyAction("freeze");
    setStatus(null);
    try {
      const response = await freezeWallet(shopId);
      setStatus(response.message || `Wallet freeze requested for shop ${shopId.slice(-6)}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to freeze wallet.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="grid gap-6">
      <AdminOpsPageHeader
        eyebrow="DokanX Admin"
        title="AI Operations Console"
        description="Monitor AI-generated merchant signals, watch automated actions, and keep fraud or payment pressure under control."
        tone="dark"
        refreshLabel="Refresh AI ops"
        onRefresh={() => void load()}
        actions={[
          { href: "/risk", label: "Open risk desk", variant: "secondary" },
          { href: "/system-health", label: "Open system health", variant: "outline" },
          { href: "/security", label: "Open security", variant: "outline" },
        ]}
      />

      {error ? <Alert variant="error">{error}</Alert> : null}
      {status ? <Alert variant="info">{status}</Alert> : null}
      <AnalyticsCards items={summary} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Merchant AI signals</CardTitle>
          <CardDescription className="mt-2">Live insight cards from the merchant intelligence layer.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {merchantInsights.length ? merchantInsights.map((item) => (
              <div key={String(item.id || item.title)} className="rounded-2xl border border-border/60 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{item.title || "Insight"}</span>
                  <Badge variant={item.badge === "success" ? "success" : item.badge === "warning" ? "warning" : "neutral"}>{item.badge || "info"}</Badge>
                </div>
                <p className="mt-2 text-xs">{item.message || "No details available."}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">No merchant AI signals available right now.</p>}
          </div>
        </Card>

        <Card>
          <CardTitle>Trending demand</CardTitle>
          <CardDescription className="mt-2">Products the AI layer sees gaining short-term velocity.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {trending.length ? trending.map((item) => (
              <div key={String(item.name || `${item.location}-${item.velocity}`)} className="rounded-2xl border border-border/60 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{item.name || "Product"}</span>
                  <Badge variant="neutral">v{Number(item.velocity || 0).toFixed(2)}</Badge>
                </div>
                <p className="mt-2 text-xs">{item.changeLabel || "steady"}{item.location ? ` � ${item.location}` : ""}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">No trending demand items are available yet.</p>}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Risk pressure snapshot</CardTitle>
          <CardDescription className="mt-2">Fraud and payment stress that may require intervention.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
              <span>Open fraud cases</span>
              <Badge variant="warning">{fraudOverview?.summary?.openCases ?? 0}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
              <span>Review required</span>
              <Badge variant="warning">{fraudOverview?.summary?.reviewRequired ?? 0}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
              <span>Fraud rate</span>
              <Badge variant="neutral">{Math.round((fraudOverview?.summary?.fraudRate ?? 0) * 100)}%</Badge>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
              <span>Payment failure rate</span>
              <Badge variant="neutral">{Math.round((fraudOverview?.summary?.paymentFailureRate ?? 0) * 100)}%</Badge>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>AI-triggered action feed</CardTitle>
          <CardDescription className="mt-2">Inventory, payment, credit, and fulfillment actions flowing through audit.</CardDescription>
          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search action, target, actor" />
            <SelectDropdown label="Source" options={sourceOptions} value={sourceFilter} onValueChange={setSourceFilter} />
            <SelectDropdown label="Action" options={actionOptions} value={actionFilter} onValueChange={setActionFilter} />
          </div>
          <div className="mt-4">
            <DataTable
              columns={[
                { key: "action", header: "Action" },
                { key: "source", header: "Source" },
                { key: "reason", header: "Reason" },
                { key: "target", header: "Target" },
                { key: "actor", header: "Actor" },
                { key: "createdAt", header: "Time" },
                { key: "open", header: "Open" },
                { key: "inspect", header: "Inspect" },
              ]}
              rows={filteredAiActions.slice(0, 12).map((log) => ({
                action: <Badge variant="neutral">{String(log.action || "ACTION").replace(/_/g, " ")}</Badge>,
                source: String((log.meta as Record<string, unknown> | undefined)?.source || "system"),
                reason: getMetaString(log.meta, "reason") || getMetaString(log.meta, "note") || "No reason",
                target: `${log.targetType || "Target"} ${String(log.targetId || "").slice(-6)}`.trim(),
                actor: log.performedBy?.name || log.performedBy?.email || "System",
                createdAt: log.createdAt ? new Date(log.createdAt).toLocaleString() : "Unknown",
                open: (
                  <Button size="sm" variant="secondary" asChild>
                    <a href={resolveAiActionHref(String(log.action || ""), log.meta)}>Open</a>
                  </Button>
                ),
                inspect: (
                  <Button size="sm" variant="outline" onClick={() => setSelectedActionId(String(log._id || ""))}>
                    Inspect
                  </Button>
                ),
              }))}
            />
            {!filteredAiActions.length ? <p className="mt-3 text-sm text-muted-foreground">No AI-triggered actions match the current filters.</p> : null}
          </div>
        </Card>
      </div>

      <AdminOpsThresholds />
      <AdminOpsPressure />

      <Card>
        <CardTitle>Action detail</CardTitle>
        <CardDescription className="mt-2">Inspect actor, source, target, and meta payload for the selected AI action.</CardDescription>
        {selectedAction ? (
          <>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button size="sm" variant="secondary" asChild>
                <a href={resolveAiActionHref(String(selectedAction.action || ""), selectedAction.meta)}>Open related console</a>
              </Button>
              {getMetaString(selectedAction.meta, "orderId") ? (
                <Button size="sm" variant="outline" onClick={() => void handleRecheckFraud()} loading={busyAction === "recheck"} loadingText="Rechecking">
                  Recheck fraud
                </Button>
              ) : null}
              {getMetaString(selectedAction.meta, "shopId") ? (
                <Button size="sm" variant="outline" onClick={() => void handleFreezeWallet()} loading={busyAction === "freeze"} loadingText="Freezing">
                  Freeze wallet
                </Button>
              ) : null}
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="grid gap-3 text-sm text-muted-foreground">
                <div className="rounded-2xl border border-border/60 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Action</p>
                  <p className="mt-2 font-semibold text-foreground">{String(selectedAction.action || "ACTION").replace(/_/g, " ")}</p>
                  <p className="mt-1 text-xs">{selectedAction.createdAt ? new Date(selectedAction.createdAt).toLocaleString() : "Unknown time"}</p>
                </div>
                <div className="rounded-2xl border border-border/60 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Actor</p>
                  <p className="mt-2 font-semibold text-foreground">{selectedAction.performedBy?.name || selectedAction.performedBy?.email || "System"}</p>
                  <p className="mt-1 text-xs">Source {String((selectedAction.meta as Record<string, unknown> | undefined)?.source || "system")}</p>
                </div>
                <div className="rounded-2xl border border-border/60 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Target</p>
                  <p className="mt-2 font-semibold text-foreground">{selectedAction.targetType || "Target"}</p>
                  <p className="mt-1 text-xs">{String(selectedAction.targetId || "") || "No target id"}</p>
                </div>
                <div className="rounded-2xl border border-border/60 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Operator reason</p>
                  <p className="mt-2 text-sm text-foreground">{getMetaString(selectedAction.meta, "reason") || getMetaString(selectedAction.meta, "note") || "No explicit reason was captured for this action."}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Meta payload</p>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs text-foreground">{formatMeta(selectedAction.meta)}</pre>
              </div>
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">Select an action from the feed to inspect its payload.</p>
        )}
      </Card>
    </div>
  );
}
function resolveAiActionHref(action: string, meta?: Record<string, unknown>) {
  const normalized = String(action || "").toUpperCase();
  const orderQuery = encodeURIComponent(String(meta?.orderId || "").trim());
  const shopQuery = encodeURIComponent(String(meta?.shopId || meta?.targetId || "").trim());
  const customerQuery = encodeURIComponent(String(meta?.customerId || meta?.userId || "").trim());
  if (normalized === "PAYMENT_RETRY_INITIATED") return orderQuery ? `/payments?q=${orderQuery}&status=FAILED` : "/payments";
  if (normalized === "CREDIT_POLICY_UPDATED") return customerQuery ? `/permissions?q=${customerQuery}` : "/permissions";
  if (normalized === "ORDER_STATUS_UPDATED") return orderQuery ? `/orders?q=${orderQuery}` : "/orders";
  if (normalized === "INVENTORY_ADJUSTED") return shopQuery ? `/merchants?q=${shopQuery}` : "/products";
  return "/ai-ops";
}

function formatMeta(meta?: Record<string, unknown>) {
  if (!meta || !Object.keys(meta).length) return "No meta payload captured for this action.";
  return JSON.stringify(meta, null, 2);
}

function getMetaString(meta: Record<string, unknown> | undefined, key: string) {
  const value = meta?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}


