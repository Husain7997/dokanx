import { AdminFinanceOverview } from "@/components/admin-finance-overview";
import { FinanceControlPanel } from "@/components/finance-control-panel";
import { FinanceLedgerPanel } from "@/components/finance-ledger-panel";

export const dynamic = "force-dynamic";

export default function Page() {
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
