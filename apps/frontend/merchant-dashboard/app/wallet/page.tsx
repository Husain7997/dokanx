import { FinanceLedgerView } from "@dokanx/ui";

export default function WalletPage() {
  return (
    <FinanceLedgerView
      rows={[
        {
          reference: "WALLET-SUMMARY",
          type: "Balance",
          amount: "Connected to /shop/wallet",
          status: "Ready"
        }
      ]}
    />
  );
}
