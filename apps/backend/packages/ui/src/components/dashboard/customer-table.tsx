import { DataTable } from "../layout/data-table";

type CustomerRow = {
  customer: string;
  email: string;
  orders: string;
  value: string;
};

export function CustomerTable({ rows }: { rows: CustomerRow[] }) {
  return (
    <DataTable
      columns={[
        { key: "customer", header: "Customer" },
        { key: "email", header: "Email" },
        { key: "orders", header: "Orders" },
        { key: "value", header: "Value" }
      ]}
      rows={rows}
    />
  );
}
