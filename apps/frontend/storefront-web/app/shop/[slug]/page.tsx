import { Badge, Button, Card, CardDescription, CardTitle } from "@dokanx/ui";
import Link from "next/link";
import { headers } from "next/headers";

import { StorefrontProductGrid } from "@/components/storefront-product-grid";
import { getProductsData, getShopBySlug, getShopRecommendations } from "@/lib/server-data";
import { getTenantConfig } from "@/lib/tenant";

export const dynamic = "force-dynamic";

function getDisplayText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

export default async function ShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = getTenantConfig((await headers()).get("host") || "localhost:3000");
  const shop = await getShopBySlug(slug);

  if (!shop) {
    return (
      <Card className="border-dashed border-border/70 bg-card/60">
        <CardTitle>Shop not found</CardTitle>
        <CardDescription className="mt-2">Try browsing the shops directory.</CardDescription>
        <div className="mt-4">
          <Button asChild variant="secondary">
            <Link href="/shops">Browse shops</Link>
          </Button>
        </div>
      </Card>
    );
  }

  const products = await getProductsData(tenant, { shopId: String(shop._id || ""), limit: "12" });
  const recommendations = await getShopRecommendations(tenant, String(shop._id || ""));
  const nearbyPopular = (recommendations.nearby_popular_shops as Array<Record<string, unknown>>) || [];
  const topRated = (recommendations.top_rated_shops as Array<Record<string, unknown>>) || [];

  return (
    <div className="grid gap-8">
      <Card>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Marketplace shop</p>
            <CardTitle className="mt-2 text-3xl">{shop.name}</CardTitle>
            <CardDescription className="mt-3">
              {shop.domain || shop.slug || "DokanX partner"} • Verified storefront
            </CardDescription>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="success">Open</Badge>
              <Badge variant="neutral">4.7 ★</Badge>
              <Badge variant="neutral">Delivery in 2-3 days</Badge>
            </div>
          </div>
          <div className="rounded-3xl border border-border/60 bg-accent/40 p-6">
            <CardTitle>Shop highlights</CardTitle>
            <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
              <span>Fast response time</span>
              <span>Cash on delivery available</span>
              <span>Trusted by 4K+ customers</span>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/cart">Go to cart</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/search">Search products</Link>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle>Shop navigation</CardTitle>
        <CardDescription className="mt-2">Explore products and deals from this shop.</CardDescription>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          {["All products", "Flash deals", "Top rated", "New arrivals"].map((label) => (
            <Badge key={label} variant="secondary">
              {label}
            </Badge>
          ))}
        </div>
      </Card>

      <div>
        <CardTitle>Products</CardTitle>
        <div className="mt-6">
          <StorefrontProductGrid products={products} />
        </div>
      </div>

      {(nearbyPopular.length || topRated.length) ? (
        <Card>
          <CardTitle>Recommended shops</CardTitle>
          <CardDescription className="mt-2">More trusted shops you may like.</CardDescription>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[...nearbyPopular, ...topRated].slice(0, 4).map((shopItem, index) => (
              <div key={String(shopItem._id || shopItem.slug || index)} className="space-y-3">
                <Badge variant="secondary">
                  {getDisplayText(shopItem.city, getDisplayText(shopItem.country, "Nearby"))}
                </Badge>
                <CardTitle className="text-lg">{getDisplayText(shopItem.name, "Shop")}</CardTitle>
                <CardDescription>
                  {(shopItem.trustScore ? `Trust ${shopItem.trustScore}` : "Verified storefront")}
                </CardDescription>
                {shopItem.slug ? (
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/shop/${shopItem.slug}`}>Visit shop</Link>
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
