import { AdminSystemHealth } from "@/components/admin-system-health";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="dx-display text-3xl">System Health</h1>
        <p className="text-sm text-muted-foreground">Runtime checks and service readiness</p>
      </div>
      <AdminSystemHealth />
    </div>
  );
}
