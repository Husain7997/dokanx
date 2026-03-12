import { AnalyticsCards, FinanceLedgerView } from "@dokanx/ui";

export default function FinancePage() {
  return (
    <div className="grid gap-6">
      <AnalyticsCards
        items={[
          { label: "Available Balance", value: "82K BDT", meta: "Withdrawable this week" },
          { label: "Pending Settlement", value: "19K BDT", meta: "Awaiting courier close" },
          { label: "Payout Schedule", value: "Weekly", meta: "Next run on Sunday" },
          { label: "Exception Queue", value: "2", meta: "Needs maker-checker review" },
        ]}
      />
      <FinanceLedgerView
        rows={[
          { reference: "SET-3021", type: "Settlement", amount: "18,200 BDT", status: "Ready" },
          { reference: "PAY-882", type: "Payout", amount: "30,000 BDT", status: "Processing" },
          { reference: "REV-90", type: "Refund Reserve", amount: "2,600 BDT", status: "Held" },
        ]}
      />
    </div>
  );
}
