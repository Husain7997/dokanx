import { AnalyticsCards, CustomerTable } from "@dokanx/ui";

export default function CustomersPage() {
  return (
    <div className="grid gap-6">
      <AnalyticsCards
        items={[
          { label: "VIP Segment", value: "42", meta: "High value customers" },
          { label: "At Risk", value: "18", meta: "No purchase in 30 days" },
          { label: "Support Tickets", value: "7", meta: "Open touchpoints" },
          { label: "Repeat Rate", value: "34%", meta: "Rolling 60-day window" },
        ]}
      />
      <CustomerTable
        rows={[
          { customer: "Nadia Rahman", email: "nadia@example.com", orders: "12", value: "24,600 BDT" },
          { customer: "Rafi Karim", email: "rafi@example.com", orders: "8", value: "18,900 BDT" },
          { customer: "Tahsin Alam", email: "tahsin@example.com", orders: "5", value: "11,200 BDT" },
        ]}
      />
    </div>
  );
}
