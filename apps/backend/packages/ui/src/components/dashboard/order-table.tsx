import { Badge } from "../ui/badge";
import { DataTable } from "../layout/data-table";

type OrderRow = {
  order: string;
  customer: string;
  total: string;
  status: string;
};

export function OrderTable({ rows }: { rows: OrderRow[] }) {
  return (
    <DataTable
      columns={[
        { key: "order", header: "Order" },
        { key: "customer", header: "Customer" },
        { key: "total", header: "Total" },
        {
          key: "status",
          header: "Status",
          render: (row) => <Badge variant="neutral">{String(row.status)}</Badge>
        }
      ]}
      rows={rows}
    />
  );
}

export const OrdersTable = OrderTable;
