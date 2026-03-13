"use client";

import Link from "next/link";
import { useState } from "react";
import type { Product } from "@dokanx/types";
import { Badge, Button, Card, CardTitle, HoverLift, PriceTag, StockIndicator } from "@dokanx/ui";

import { addToCart } from "@/lib/runtime-api";

type StorefrontProductGridProps = {
  products: Array<Product & { _id?: string }>;
};

function resolveProductId(product: Product & { _id?: string }) {
  return String(product._id || product.id || "");
}

function resolveProductHref(product: Product & { _id?: string }) {
  const slug = product.slug || product.id;
  return `/product/${slug}`;
}

export function StorefrontProductGrid({ products }: StorefrontProductGridProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {products.map((product) => (
        <StorefrontProductCard key={resolveProductId(product) || product.name} product={product} />
      ))}
    </div>
  );
}

function StorefrontProductCard({ product }: { product: Product & { _id?: string } }) {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const productId = resolveProductId(product);
  const shopId = product.shopId ? String(product.shopId) : "";
  const inStock = product.stock === undefined ? true : product.stock > 0;
  const canAdd = Boolean(productId && shopId && inStock);

  async function handleAddToCart() {
    if (!canAdd) {
      setStatus(shopId ? "Product is out of stock." : "Shop context is required for cart.");
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      await addToCart({ shopId, productId, quantity: 1 });
      setStatus("Added to cart.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to add item to cart.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <HoverLift>
      <Card className="overflow-hidden p-0">
        <div className="aspect-[4/3] bg-accent">
          <img
            src={product.image || "https://placehold.co/800x600"}
            alt={product.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between gap-3">
            {product.category ? <Badge>{product.category}</Badge> : <span />}
            {!inStock ? <Badge variant="destructive">Out of stock</Badge> : null}
          </div>
          <CardTitle className="mt-4">{product.name}</CardTitle>
          <div className="mt-2">
            <PriceTag amount={product.price || 0} />
          </div>
          <div className="mt-3">
            <StockIndicator inStock={inStock} />
          </div>
          <div className="mt-5 grid gap-2">
            <Button variant="secondary" onClick={handleAddToCart} disabled={!canAdd || loading}>
              {loading ? "Adding..." : "Add To Cart"}
            </Button>
            <Button asChild variant="outline">
              <Link href={resolveProductHref(product)}>View Product</Link>
            </Button>
          </div>
          {status ? <p className="mt-3 text-xs text-muted-foreground">{status}</p> : null}
        </div>
      </Card>
    </HoverLift>
  );
}
