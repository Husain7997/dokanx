"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Flame, PackagePlus, Snowflake, TrendingDown } from "lucide-react";
import { Alert, Badge, Card, CardDescription, CardTitle } from "@dokanx/ui";

import { getInventoryIntelligence } from "@/lib/runtime-api";

type InventoryProductInsight = {
  _id?: string;
  name?: string;
  category?: string;
  price?: number;
  costPrice?: number;
  stock?: number;
  minStock?: number;
  lastSoldAt?: string | null;
  totalSold?: number;
  avgDailySale?: number;
  reorderQty?: number;
  margin?: number;
  marginPct?: number;
  isLossRisk?: boolean;
  quantitySold7d?: number;
  orderCount7d?: number;
};

type IntelligenceState = {
  summary?: {
    lowStockCount?: number;
    deadStockCount?: number;
    topSellingCount?: number;
    reorderCount?: number;
    lossRiskCount?: number;
  };
  lowStock?: InventoryProductInsight[];
  deadStock?: InventoryProductInsight[];
  topSelling?: InventoryProductInsight[];
  reorder?: InventoryProductInsight[];
  lossRisk?: InventoryProductInsight[];
};

function money(value?: number) {
  return `BDT ${Number(value || 0).toFixed(2)}`;
}

function stockLabel(product: InventoryProductInsight) {
  return `${Number(product.stock || 0)} in stock / min ${Number(product.minStock ?? 5)}`;
}

function InsightList({
  title,
  description,
  rows,
  empty,
  metric,
}: {
  title: string;
  description: string;
  rows: InventoryProductInsight[];
  empty: string;
  metric: (row: InventoryProductInsight) => string;
}) {
  return (
    <Card className="p-5">
      <CardTitle>{title}</CardTitle>
      <CardDescription className="mt-2">{description}</CardDescription>
      <div className="mt-4 grid gap-3">
        {rows.length ? rows.slice(0, 8).map((row) => (
          <div key={String(row._id || row.name)} className="rounded-[var(--radius-md)] border border-border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{row.name || "Product"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{row.category || "General"} - {stockLabel(row)}</p>
              </div>
              <Badge variant={row.isLossRisk ? "danger" : "neutral"}>{metric(row)}</Badge>
            </div>
          </div>
        )) : (
          <div className="rounded-[var(--radius-md)] border border-dashed border-border p-5 text-sm text-muted-foreground">{empty}</div>
        )}
      </div>
    </Card>
  );
}

export default function InventoryPage() {
  const [data, setData] = useState<IntelligenceState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await getInventoryIntelligence();
        if (alive) setData(response.data || {});
      } catch (loadError) {
        if (alive) setError(loadError instanceof Error ? loadError.message : "Unable to load inventory intelligence.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, []);

  const summary = data?.summary || {};
  const lowStock = data?.lowStock || [];
  const deadStock = data?.deadStock || [];
  const topSelling = data?.topSelling || [];
  const reorder = data?.reorder || [];
  const lossRisk = data?.lossRisk || [];

  const summaryCards = useMemo(() => [
    { label: "Low stock", value: summary.lowStockCount || 0, icon: AlertTriangle, tone: Number(summary.lowStockCount || 0) > 0 ? "warning" : "success" },
    { label: "Dead stock", value: summary.deadStockCount || 0, icon: Snowflake, tone: Number(summary.deadStockCount || 0) > 0 ? "warning" : "success" },
    { label: "Top sellers", value: summary.topSellingCount || 0, icon: Flame, tone: "neutral" },
    { label: "Reorder", value: summary.reorderCount || 0, icon: PackagePlus, tone: Number(summary.reorderCount || 0) > 0 ? "warning" : "success" },
    { label: "Loss risk", value: summary.lossRiskCount || 0, icon: TrendingDown, tone: Number(summary.lossRiskCount || 0) > 0 ? "danger" : "success" },
  ], [summary.deadStockCount, summary.lossRiskCount, summary.lowStockCount, summary.reorderCount, summary.topSellingCount]);

  return (
    <div className="grid gap-5">
      <Card className="overflow-hidden p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Inventory intelligence</p>
            <CardTitle className="mt-3 text-3xl">Stock decisions before stockouts happen.</CardTitle>
            <CardDescription className="mt-2 max-w-2xl">
              Low stock, dead stock, fast sellers, margin risk, and reorder suggestions are calculated from live products and order movement.
            </CardDescription>
          </div>
          <Badge variant={loading ? "neutral" : "success"}>{loading ? "Loading" : "Live"}</Badge>
        </div>
      </Card>

      {error ? <Alert variant="warning">{error}</Alert> : null}
      {lowStock.length ? <Alert variant="warning">Low stock items need reorder attention now.</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((item) => (
          <Card key={item.label} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <item.icon size={22} className="text-primary" />
              <Badge variant={item.tone as "success" | "warning" | "danger" | "neutral"}>{item.value}</Badge>
            </div>
            <p className="mt-3 text-sm font-semibold">{item.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <InsightList
          title="Low stock"
          description="Products where stock is at or below the configured minimum."
          rows={lowStock}
          empty="No low stock pressure right now."
          metric={(row) => `${Number(row.stock || 0)} left`}
        />
        <InsightList
          title="Smart reorder"
          description="Suggested buy quantity from average daily sale and current stock."
          rows={reorder}
          empty="No reorder suggestion right now."
          metric={(row) => `Buy ${Number(row.reorderQty || 0)}`}
        />
        <InsightList
          title="Fast selling"
          description="Top products from the last 7 days order movement."
          rows={topSelling}
          empty="No recent sales velocity yet."
          metric={(row) => `${Number(row.quantitySold7d || 0)} sold`}
        />
        <InsightList
          title="Dead stock"
          description="Items with no sale for 30 days while stock is still sitting."
          rows={deadStock}
          empty="No dead stock detected."
          metric={(row) => row.lastSoldAt ? new Date(row.lastSoldAt).toLocaleDateString() : "No sale"}
        />
      </div>

      <InsightList
        title="Loss risk"
        description="Products where selling price is below cost price."
        rows={lossRisk}
        empty="No negative-margin products detected."
        metric={(row) => `${money(row.price)} < ${money(row.costPrice)}`}
      />
    </div>
  );
}
