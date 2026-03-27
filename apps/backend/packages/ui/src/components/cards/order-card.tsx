import { Badge } from "../ui/badge";
import { Card, CardDescription, CardTitle } from "../ui/card";

export type OrderCardProps = {
  orderId: string;
  products: string[];
  price: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  tracking?: string;
};

const statusVariant: Record<OrderCardProps["status"], "warning" | "success" | "danger" | "neutral"> = {
  pending: "warning",
  processing: "neutral",
  shipped: "success",
  delivered: "success",
  cancelled: "danger"
};

export function OrderCard({ orderId, products, price, status, tracking }: OrderCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <CardTitle>Order {orderId}</CardTitle>
          <CardDescription className="mt-2">
            {products.join(", ")}
          </CardDescription>
          {tracking ? (
            <p className="mt-3 text-sm text-muted-foreground">Tracking: {tracking}</p>
          ) : null}
        </div>
        <div className="text-right">
          <Badge variant={statusVariant[status]}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
          <p className="mt-3 text-lg font-semibold text-foreground">{price}</p>
        </div>
      </div>
    </Card>
  );
}
