import { AnalyticsCards } from "@dokanx/ui";

export default function SystemHealthPage() {
  return (
    <AnalyticsCards
      items={[
        { label: "System", value: "Healthy" },
        { label: "Health API", value: "/health" },
        { label: "Infra API", value: "/system" },
        { label: "Monitoring", value: "Active" }
      ]}
    />
  );
}
