import { useState } from "react";
import { Card, CardContent, CardTitle, Button, Badge } from "@dokanx/ui";

interface CartItem {
  product: Product;
  quantity: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  shopId: string;
  shopName: string;
}

interface Shop {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  deliveryBase: number;
  deliveryPerKm: number;
}

interface DeliveryInfo {
  distance: number;
  baseFee: number;
  perKmFee: number;
  totalFee: number;
}

interface PosCartSummaryProps {
  cart: CartItem[];
  shops: Shop[];
  customerLocation?: { lat: number; lng: number };
  onCheckout: () => void;
  onRemoveItem: (productId: string) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
}

export function PosCartSummary({
  cart,
  shops,
  customerLocation,
  onCheckout,
  onRemoveItem,
  onUpdateQuantity,
}: PosCartSummaryProps) {
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);

  // Group cart items by shop
  const cartByShop = cart.reduce((acc, item) => {
    const shopId = item.product.shopId;
    if (!acc[shopId]) {
      acc[shopId] = [];
    }
    acc[shopId].push(item);
    return acc;
  }, {} as Record<string, CartItem[]>);

  // Calculate delivery for each shop
  const calculateDelivery = (shop: Shop): DeliveryInfo | null => {
    if (!customerLocation || !deliveryEnabled) return null;

    const distance = Math.sqrt(
      Math.pow(customerLocation.lat - shop.location.lat, 2) +
      Math.pow(customerLocation.lng - shop.location.lng, 2)
    ) * 111; // Rough km conversion

    const baseFee = shop.deliveryBase;
    const perKmFee = distance * shop.deliveryPerKm;
    const totalFee = baseFee + perKmFee;

    return { distance, baseFee, perKmFee, totalFee };
  };

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const deliveryTotal = Object.keys(cartByShop).reduce((sum, shopId) => {
    const shop = shops.find(s => s.id === shopId);
    const delivery = shop ? calculateDelivery(shop) : null;
    return sum + (delivery?.totalFee || 0);
  }, 0);

  const total = subtotal + deliveryTotal;

  return (
    <Card className="h-fit">
      <CardContent className="p-6">
        <CardTitle className="mb-4">Cart Summary</CardTitle>

        {Object.entries(cartByShop).map(([shopId, items]) => {
          const shop = shops.find(s => s.id === shopId);
          const shopSubtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
          const delivery = shop ? calculateDelivery(shop) : null;

          return (
            <div key={shopId} className="mb-4 rounded-lg border border-border p-3">
              <h4 className="font-medium">{shop?.name || "Unknown Shop"}</h4>
              <div className="mt-2 space-y-2">
                {items.map((item) => (
                  <div key={item.product.id} className="flex items-center justify-between text-sm">
                    <div className="flex-1">
                      <span>{item.product.name}</span>
                      <span className="ml-2 text-muted-foreground">x{item.quantity}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>৳{(item.product.price * item.quantity).toFixed(2)}</span>
                      <button
                        onClick={() => onRemoveItem(item.product.id)}
                        className="text-destructive hover:text-destructive/80"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 border-t border-border pt-2">
                <div className="flex justify-between text-sm">
                  <span>Shop subtotal:</span>
                  <span>৳{shopSubtotal.toFixed(2)}</span>
                </div>
                {delivery && (
                  <div className="text-xs text-muted-foreground">
                    Delivery: ৳{delivery.totalFee.toFixed(2)} ({delivery.distance.toFixed(1)}km)
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>৳{subtotal.toFixed(2)}</span>
          </div>
          {deliveryTotal > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Delivery:</span>
              <span>৳{deliveryTotal.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-lg">
            <span>Total:</span>
            <span>৳{total.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={deliveryEnabled}
              onChange={(e) => setDeliveryEnabled(e.target.checked)}
              className="rounded"
            />
            Enable delivery charges
          </label>
        </div>

        <Button
          onClick={onCheckout}
          className="mt-4 w-full"
          disabled={cart.length === 0}
        >
          Checkout (৳{total.toFixed(2)})
        </Button>
      </CardContent>
    </Card>
  );
}