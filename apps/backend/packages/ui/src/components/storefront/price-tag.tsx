import { formatCurrency } from "../../lib/utils";

export function PriceTag({
  amount,
  compareAt,
  currency = "USD"
}: {
  amount: number;
  compareAt?: number;
  currency?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-lg font-semibold">{formatCurrency(amount, currency)}</span>
      {compareAt ? (
        <span className="text-sm text-muted-foreground line-through">
          {formatCurrency(compareAt, currency)}
        </span>
      ) : null}
    </div>
  );
}
