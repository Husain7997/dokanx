"use client";

import dynamic from "next/dynamic";

const AnalyticsWorkspace = dynamic(
  () => import("@/components/analytics-workspace").then((mod) => mod.AnalyticsWorkspace),
  {
    ssr: false,
    loading: () => <div className="p-6 text-sm text-muted-foreground">Loading analytics...</div>,
  }
);

export function AnalyticsPageClient() {
  return <AnalyticsWorkspace />;
}
