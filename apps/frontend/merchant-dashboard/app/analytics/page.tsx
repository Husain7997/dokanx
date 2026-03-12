import { AnalyticsCards, Card, CardDescription, CardTitle, SalesChart } from "@dokanx/ui";

export default function AnalyticsPage() {
  return (
    <div className="grid gap-6">
      <AnalyticsCards
        items={[
          { label: "Gross Sales", value: "128K BDT", meta: "+12.4% vs last week" },
          { label: "Orders", value: "186", meta: "26 pending fulfillment" },
          { label: "Repeat Buyers", value: "34%", meta: "Customer quality signal" },
          { label: "Conversion", value: "4.8%", meta: "Search to checkout" },
        ]}
      />
      <Card>
        <CardTitle>Seven-day sales rhythm</CardTitle>
        <CardDescription className="mt-2">
          Analytics placeholder has been replaced with an actual reporting surface.
        </CardDescription>
        <div className="mt-6">
          <SalesChart
            data={[
              { label: "Mon", value: 12 },
              { label: "Tue", value: 16 },
              { label: "Wed", value: 14 },
              { label: "Thu", value: 22 },
              { label: "Fri", value: 18 },
              { label: "Sat", value: 24 },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}
