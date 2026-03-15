import { Badge } from "../ui/badge";
import { DataTable } from "../layout/data-table";

type InventoryRow = {
  item: string;
  sku: string;
  stock: string;
  state: string;
};

export function InventoryTable({ rows }: { rows: InventoryRow[] }) {
  return (
    <DataTable
      columns={[
        { key: "item", header: "Item" },
        { key: "sku", header: "SKU" },
        { key: "stock", header: "Stock" },
        {
          key: "state",
          header: "State",
          render: (row) => (
            <Badge variant={row.state === "Low" ? "warning" : "success"}>
              {String(row.state)}
            </Badge>
          )
        }
      ]}
      rows={rows}
    />
  );
}

export const InventoryGridTable = InventoryTable;
