import { formatCurrency } from "../../lib/utils";
import { Button } from "../ui/button";
import { Card, CardDescription, CardTitle } from "../ui/card";

export type CartPanelItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
};

export function CartPanel({ items }: { items: CartPanelItem[] }) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <Card>
      <CardTitle>Cart Summary</CardTitle>
      <div className="mt-6 grid gap-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{item.name}</p>
              <CardDescription>Qty {item.quantity}</CardDescription>
            </div>
            <span className="text-sm">{formatCurrency(item.price * item.quantity)}</span>
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between border-t pt-4">
        <span className="text-sm text-muted-foreground">Subtotal</span>
        <span className="text-lg font-semibold">{formatCurrency(subtotal)}</span>
      </div>
      <Button className="mt-6 w-full">Proceed to Checkout</Button>
    </Card>
  );
}
