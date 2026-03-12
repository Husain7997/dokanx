"use client";

import { useState } from "react";
import { Button, CardDescription, Input } from "@dokanx/ui";
import type { Product } from "@dokanx/types";

import { saveCart } from "@/lib/runtime-api";

type ProductPurchasePanelProps = {
  product: Product & { _id?: string };
};

export function ProductPurchasePanel({ product }: ProductPurchasePanelProps) {
  const [quantity, setQuantity] = useState("1");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleAddToCart() {
    const productId = String(product._id || product.id || "");
    const shopId = String(product.shopId || "");
    const parsedQuantity = Math.max(1, Number(quantity) || 1);

    if (!productId || !shopId) {
      setStatus("Live product and shop context are required before adding to cart.");
      return;
    }

    setSubmitting(true);
    setStatus(null);

    try {
      await saveCart({
        shopId,
        items: [
          {
            productId,
            quantity: parsedQuantity,
          },
        ],
      });
      setStatus("Item added to cart. Open /cart to continue.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to add item to cart.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <label className="grid gap-2 text-sm">
        <span>Quantity</span>
        <Input value={quantity} onChange={(event) => setQuantity(event.target.value)} />
      </label>
      <Button type="button" disabled={submitting} className="w-full" onClick={handleAddToCart}>
        {submitting ? "Adding..." : "Add To Cart"}
      </Button>
      {status ? <CardDescription>{status}</CardDescription> : null}
    </div>
  );
}
