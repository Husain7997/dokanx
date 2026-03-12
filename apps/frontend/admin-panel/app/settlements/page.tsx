import { SettlementTable } from "@dokanx/ui";

export default function SettlementsPage() {
  return (
    <SettlementTable
      rows={[
        {
          batch: "SET-001",
          merchant: "Platform",
          amount: "Connected to /admin/settlements",
          eta: "Live"
        }
      ]}
    />
  );
}
