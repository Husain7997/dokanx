export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="dx-display text-3xl">Analytics</h1>
        <p className="text-sm text-muted-foreground">KPI trends and signals</p>
      </div>
      <div className="grid gap-3 rounded-3xl border border-white/40 bg-white/70 p-6 shadow-sm">
        <p className="text-sm font-semibold text-foreground">Workspace ready</p>
        <p className="text-sm text-muted-foreground">
          Connect the API data sources to populate this view with live admin insights.
        </p>
      </div>
    </div>
  );
}
