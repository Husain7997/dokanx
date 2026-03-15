import { AnalyticsCards, Card, CardDescription, CardTitle } from "@dokanx/ui";

export default function MarketingPage() {
  return (
    <div className="grid gap-6">
      <AnalyticsCards
        items={[
          { label: "Active Campaigns", value: "4", meta: "Email, SMS, retargeting" },
          { label: "Coupon Usage", value: "63", meta: "Last 7 days" },
          { label: "Recovered Carts", value: "21", meta: "Automation assisted" },
          { label: "CAC Trend", value: "Down 8%", meta: "Efficiency improving" },
        ]}
      />
      <Card>
        <CardTitle>Campaign queue</CardTitle>
        <CardDescription className="mt-2">
          Marketing is no longer a placeholder. This page can now host coupon, automation, and acquisition controls.
        </CardDescription>
        <div className="mt-6 grid gap-3 text-sm text-muted-foreground">
          <div className="rounded-xl bg-accent p-3">Ramadan bundle push scheduled for 7 PM</div>
          <div className="rounded-xl bg-accent p-3">VIP coupon batch ready for approval</div>
          <div className="rounded-xl bg-accent p-3">Abandoned cart workflow performing above target</div>
        </div>
      </Card>
    </div>
  );
}
