import { AnalyticsCards, Card, CardDescription, CardTitle } from "@dokanx/ui";

export default function AppsPage() {
  return (
    <div className="grid gap-6">
      <AnalyticsCards
        items={[
          { label: "Installed", value: "5", meta: "Active in this workspace" },
          { label: "Pending Review", value: "1", meta: "Awaiting permission approval" },
          { label: "Webhooks", value: "14", meta: "Delivery + retry coverage" },
          { label: "Sandbox Tokens", value: "3", meta: "Developer integrations" },
        ]}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          ["CRM Sync", "Customer lifecycle sync and outreach triggers."],
          ["Courier Router", "Auto-select cheapest reliable courier by zone."],
          ["Loyalty Engine", "Segment-based rewards and wallet boosts."],
        ].map(([name, description]) => (
          <Card key={name}>
            <CardTitle>{name}</CardTitle>
            <CardDescription className="mt-2">{description}</CardDescription>
          </Card>
        ))}
      </div>
    </div>
  );
}
