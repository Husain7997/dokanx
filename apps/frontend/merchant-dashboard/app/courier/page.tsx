import { CourierTrackingPanel } from "@dokanx/ui";

export default function CourierPage() {
  return (
    <CourierTrackingPanel
      courier="Courier Monitoring"
      status="Live"
      checkpoints={[
        { label: "Dashboard", time: "/courier/dashboard" },
        { label: "Anomalies", time: "/courier/anomalies" }
      ]}
    />
  );
}
