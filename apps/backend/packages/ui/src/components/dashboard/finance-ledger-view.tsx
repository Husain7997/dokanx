import { Badge } from "../ui/badge";
import { DataTable } from "../layout/data-table";

type LedgerRow = {
  reference: string;
  type: string;
  amount: string;
  status: string;
};

export function FinanceLedgerView({ rows }: { rows: LedgerRow[] }) {
  return (
    <DataTable
      columns={[
        { key: "reference", header: "Reference" },
        { key: "type", header: "Type" },
        { key: "amount", header: "Amount" },
        {
          key: "status",
          header: "Status",
          render: (row) => <Badge>{String(row.status)}</Badge>
        }
      ]}
      rows={rows}
    />
  );
}
