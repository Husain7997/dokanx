import { CustomerTable } from "@dokanx/ui";

export default function MerchantsPage() {
  return (
    <CustomerTable
      rows={[
        {
          customer: "Merchant Accounts",
          email: "Mapped to admin merchant index",
          orders: "Multi-tenant",
          value: "Active"
        }
      ]}
    />
  );
}
