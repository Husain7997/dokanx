"use client";

import dynamic from "next/dynamic";
import { AnalyticsCards, Badge, Card, CardDescription, CardTitle } from "@dokanx/ui";

const AdminFinanceOverview = dynamic(
  () => import("@/components/admin-finance-overview").then((mod) => mod.AdminFinanceOverview),
  { ssr: false, loading: () => <div className="rounded-3xl border border-border/60 bg-card px-6 py-6 text-sm text-muted-foreground">Loading finance overview...</div> }
);
const FinanceControlPanel = dynamic(
  () => import("@/components/finance-control-panel").then((mod) => mod.FinanceControlPanel),
  { ssr: false, loading: () => <div className="rounded-3xl border border-border/60 bg-card px-6 py-6 text-sm text-muted-foreground">Loading finance controls...</div> }
);
const FinanceLedgerPanel = dynamic(
  () => import("@/components/finance-ledger-panel").then((mod) => mod.FinanceLedgerPanel),
  { ssr: false, loading: () => <div className="rounded-3xl border border-border/60 bg-card px-6 py-6 text-sm text-muted-foreground">Loading ledger...</div> }
);

const summary = [
  { label: "Control center", value: "3", meta: "Policy, ledger, and overview surfaces" },
  { label: "Admin workflow", value: "Live", meta: "Connected to runtime finance controls" },
  { label: "Review mode", value: "Daily", meta: "Best used for payout and audit windows" },
  { label: "Primary focus", value: "Ledger", meta: "Revenue, control, and settlement alignment" },
];

export function FinancePageClient() {
  return (
    <div className="grid gap-6">
      <div className="rounded-[28px] border border-white/10 bg-[#0B1E3C] px-6 py-6 text-white shadow-[0_24px_60px_rgba(11,30,60,0.24)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-[#FFD49F]">DokanX Admin</p>
            <h1 className="dx-display text-3xl">Platform Finance</h1>
            <p className="text-sm text-slate-200">
              Review policy controls, ledger movement, and platform-wide finance posture from one operating surface.
            </p>
          </div>
          <Badge variant="secondary" className="border-white/15 bg-white/10 text-white">
            Revenue and ledger
          </Badge>
        </div>
      </div>

      <AnalyticsCards items={summary} />

      <Card>
        <CardTitle>Finance operations map</CardTitle>
        <CardDescription className="mt-2">
          Start with controls, verify ledger movement in the middle panel, then review summary and anomalies in the overview panel.
        </CardDescription>
      </Card>

      <FinanceControlPanel />
      <FinanceLedgerPanel />
      <AdminFinanceOverview />
    </div>
  );
}

