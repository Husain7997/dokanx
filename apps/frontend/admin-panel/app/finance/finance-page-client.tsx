"use client";

import dynamic from "next/dynamic";

const AdminFinanceOverview = dynamic(
  () => import("@/components/admin-finance-overview").then((mod) => mod.AdminFinanceOverview),
  { ssr: false, loading: () => <div className="p-6 text-sm text-muted-foreground">Loading finance overview...</div> }
);
const FinanceControlPanel = dynamic(
  () => import("@/components/finance-control-panel").then((mod) => mod.FinanceControlPanel),
  { ssr: false, loading: () => <div className="p-6 text-sm text-muted-foreground">Loading controls...</div> }
);
const FinanceLedgerPanel = dynamic(
  () => import("@/components/finance-ledger-panel").then((mod) => mod.FinanceLedgerPanel),
  { ssr: false, loading: () => <div className="p-6 text-sm text-muted-foreground">Loading ledger...</div> }
);

export function FinancePageClient() {
  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="dx-display text-3xl">Finance</h1>
        <p className="text-sm text-muted-foreground">Platform revenue and ledger snapshots</p>
      </div>
      <FinanceControlPanel />
      <FinanceLedgerPanel />
      <AdminFinanceOverview />
    </div>
  );
}
