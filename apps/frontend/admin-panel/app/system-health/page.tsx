import { AdminEtaHealth } from "@/components/admin-eta-health";
import { AdminOpsPageHeader } from "@/components/admin-ops-page-header";
import { AdminOpsPressure } from "@/components/admin-ops-pressure";
import { AdminOpsThresholds } from "@/components/admin-ops-thresholds";
import { AdminSystemHealth } from "@/components/admin-system-health";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="grid gap-6">
      <AdminOpsPageHeader
        title="System health"
        description="Runtime checks, readiness signals, and operational pressure in one place."
        actions={[
          { href: "/security", label: "Tune thresholds", variant: "secondary" },
          { href: "/risk", label: "Open risk desk", variant: "outline" },
          { href: "/dashboard", label: "Open dashboard", variant: "outline" },
        ]}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <AdminSystemHealth />
        <AdminEtaHealth />
      </div>
      <AdminOpsThresholds />
      <AdminOpsPressure />
    </div>
  );
}
