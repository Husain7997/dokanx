import { Badge } from "../ui/badge";

export function StockIndicator({
  inStock,
  quantity
}: {
  inStock: boolean;
  quantity?: number;
}) {
  return (
    <Badge variant={inStock ? "success" : "danger"}>
      {inStock ? `In Stock${quantity ? ` (${quantity})` : ""}` : "Out of Stock"}
    </Badge>
  );
}
