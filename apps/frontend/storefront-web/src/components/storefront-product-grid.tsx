"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "@dokanx/types";
import { Button, ProductCard } from "@dokanx/ui";

import { addToCart, getProductReviews, trackRecommendationClick, trackRecommendationImpression } from "@/lib/runtime-api";

type StorefrontProduct = Partial<Product> & {
  _id?: string;
  id?: string;
  name?: string;
  slug?: string;
  category?: string;
  price?: number;
  stock?: number;
  shopId?: string;
  image?: string;
};

type StorefrontProductGridProps = {
  products: StorefrontProduct[];
  trackingContext?: string;
};

function resolveProductId(product: StorefrontProduct) {
  return String(product._id || product.id || "");
}

function resolveProductHref(product: StorefrontProduct) {
  const slug = product.slug || product.id || product._id || "";
  return `/product/${slug}`;
}

function resolveDiscountLabel(product: StorefrontProduct) {
  const price = Number(product.price || 0);
  const discountRate = Number((product as Record<string, unknown>).discountRate || (product as Record<string, unknown>).discountPercent || 0);
  const salePrice = Number((product as Record<string, unknown>).salePrice || 0);

  if (discountRate > 0) {
    return `${discountRate}% off`;
  }
  if (salePrice > 0 && price > 0 && salePrice < price) {
    const computed = Math.round((1 - salePrice / price) * 100);
    return computed > 0 ? `${computed}% off` : undefined;
  }
  return undefined;
}

export function StorefrontProductGrid({ products, trackingContext }: StorefrontProductGridProps) {
  const [ratings, setRatings] = useState<Record<string, { average: number; count: number }>>({});
  const ratingsCacheRef = useRef<Record<string, { average: number; count: number; timestamp: number }>>({});
  const inFlightRef = useRef<Set<string>>(new Set());
  const debounceRef = useRef<number | null>(null);
  const impressionsRef = useRef<string | null>(null);
  const pageSize = 20;
  const cacheTtlMs = 5 * 60 * 1000;
  const productIds = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map((product) => resolveProductId(product))
            .filter((id) => id && id.length > 0)
        )
      ),
    [products]
  );

  useEffect(() => {
    let active = true;
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(async () => {
      const cache = ratingsCacheRef.current;
      const now = Date.now();
      const pending = productIds.filter((id) => {
        const cached = cache[id];
        const stale = cached ? now - cached.timestamp > cacheTtlMs : true;
        return stale && !inFlightRef.current.has(id);
      });
      if (!pending.length) return;
      pending.forEach((id) => inFlightRef.current.add(id));

      const results = await Promise.all(
        pending.map(async (id) => {
          try {
            const response = await getProductReviews(id, { page: "1", limit: String(pageSize) });
            const rows = response.data || [];
            const count = rows.length;
            const average = count
              ? rows.reduce((sum, row) => sum + Number(row.rating || 0), 0) / count
              : 0;
            return { id, average: Number(average.toFixed(1)), count };
          } catch {
            return { id, average: 0, count: 0 };
          }
        })
      );

      if (!active) return;
      const nextCache = { ...ratingsCacheRef.current };
      results.forEach((row) => {
        nextCache[row.id] = { average: row.average, count: row.count, timestamp: Date.now() };
        inFlightRef.current.delete(row.id);
      });
      ratingsCacheRef.current = nextCache;
      const viewCache: Record<string, { average: number; count: number }> = {};
      Object.keys(nextCache).forEach((key) => {
        viewCache[key] = { average: nextCache[key].average, count: nextCache[key].count };
      });
      setRatings(viewCache);
    }, 250);

    return () => {
      active = false;
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [productIds]);

  useEffect(() => {
    if (!trackingContext || !productIds.length) return;
    const signature = `${trackingContext}:${productIds.join(",")}`;
    if (impressionsRef.current === signature) return;
    impressionsRef.current = signature;
    trackRecommendationImpression({ productIds, context: trackingContext }).catch(() => undefined);
  }, [productIds, trackingContext]);

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {products.map((product) => (
        <StorefrontProductCard
          key={resolveProductId(product) || product.name}
          product={product}
          trackingContext={trackingContext}
          ratings={ratings}
        />
      ))}
    </div>
  );
}

function StorefrontProductCard({
  product,
  trackingContext,
  ratings,
}: {
  product: StorefrontProduct;
  trackingContext?: string;
  ratings: Record<string, { average: number; count: number }>;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const productId = resolveProductId(product);
  const shopId = product.shopId ? String(product.shopId) : "";
  const inStock = product.stock === undefined ? true : product.stock > 0;
  const canAdd = Boolean(productId && shopId && inStock);
  const promo = ratings[productId] || { average: 0, count: 0 };
  const discountLabel = resolveDiscountLabel(product);
  const basePrice = Number(product.price || 0);
  const salePrice = Number((product as Record<string, unknown>).salePrice || 0);
  const displayPrice = salePrice > 0 && salePrice < basePrice ? salePrice : basePrice;
  const originalPrice = salePrice > 0 && salePrice < basePrice ? basePrice : undefined;
  const distanceKm = Number((product as Record<string, unknown>).distanceKm);
  const ratingAverage = Number((product as Record<string, unknown>).ratingAverage);
  const trustScore = (product as Record<string, unknown>).shop && typeof (product as Record<string, unknown>).shop === "object"
    ? Number(((product as Record<string, unknown>).shop as Record<string, unknown>).trustScore)
    : undefined;

  const indicators = [
    Number.isFinite(distanceKm) ? `Distance ${distanceKm.toFixed(1)} km` : null,
    Number.isFinite(ratingAverage) && ratingAverage > 0 ? `Rating ${ratingAverage.toFixed(1)}` : null,
    typeof trustScore === "number" && Number.isFinite(trustScore) ? `Trust ${Math.round(trustScore)}` : null,
  ].filter(Boolean) as string[];

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
    <div className="space-y-3">
      <ProductCard
        title={product.name || "Product"}
        price={displayPrice}
        originalPrice={originalPrice}
        image={product.image || "https://placehold.co/800x600"}
        category={product.category}
        status={!inStock ? "Out of stock" : undefined}
        inStock={inStock}
        discountLabel={discountLabel}
        rating={promo.average || undefined}
        ratingCount={promo.count || undefined}
        primaryAction={
          <Button
            variant="secondary"
            onClick={handleAddToCart}
            disabled={!canAdd}
            loading={loading}
            loadingText="Adding to cart"
            className="w-full"
          >
            Add To Cart
          </Button>
        }
        secondaryAction={
          <Button asChild variant="outline" className="w-full">
            <Link
              href={resolveProductHref(product)}
              onClick={() => {
                if (!trackingContext || !productId) return;
                trackRecommendationClick({ productId, context: trackingContext }).catch(() => undefined);
              }}
            >
              View Product
            </Link>
          </Button>
        }
      />
      {indicators.length ? (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {indicators.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      ) : null}
      {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
    </div>
  );
}
