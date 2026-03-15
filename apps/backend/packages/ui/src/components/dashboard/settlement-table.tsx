import { DataTable } from "../layout/data-table";

type SettlementRow = {
  batch: string;
  merchant: string;
  amount: string;
  eta: string;
};

export function SettlementTable({ rows }: { rows: SettlementRow[] }) {
  return (
    <DataTable
      columns={[
        { key: "batch", header: "Batch" },
        { key: "merchant", header: "Merchant" },
        { key: "amount", header: "Amount" },
        { key: "eta", header: "ETA" }
      ]}
      rows={rows}
    />
  );
}
