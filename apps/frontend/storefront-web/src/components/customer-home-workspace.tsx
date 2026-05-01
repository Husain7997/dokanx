"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AnalyticsCards,
  Button,
  Card,
  CardDescription,
  CardTitle,
  SearchInput,
  SelectDropdown,
} from "@dokanx/ui";

import {
  getCustomerOverview,
  getProfile,
  getRuntimeCart,
  getTrafficContext,
  searchSuggestions,
} from "@/lib/runtime-api";
import { StorefrontProductGrid } from "@/components/storefront-product-grid";
import { useStorefrontTheme } from "@/components/storefront-theme-provider";
import type { HomepageSection } from "@/lib/theme-config";
import { renderHomepageSection } from "@/components/storefront-sections/registry";
import { SectionShell } from "@/components/storefront-sections/section-shell";

type ShopDirectoryItem = {
  slug: string;
  name: string;
  description: string;
  rating: string;
  verified: boolean;
  district: string;
  thana: string;
  market: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
};

type ProductRow = {
  _id?: string;
  id?: string;
  name?: string;
  category?: string;
  price?: number;
  stock?: number;
  shopId?: string;
  image?: string;
  slug?: string;
};

type RecommendedShop = {
  _id?: string;
  name?: string;
  slug?: string;
  logoUrl?: string;
  city?: string;
  country?: string;
  trustScore?: number;
  popularityScore?: number;
};

type CustomerHomeWorkspaceProps = {
  shopId?: string;
  shopName?: string;
  shops: ShopDirectoryItem[];
  featuredProducts: ProductRow[];
  recommendedProducts: ProductRow[];
  flashDeals: ProductRow[];
  recentlyViewed: ProductRow[];
  recommendedShops: RecommendedShop[];
};

export function CustomerHomeWorkspace({
  shopId,
  shopName = "DokanX Storefront",
  shops,
  featuredProducts,
  recommendedProducts,
  flashDeals,
  recentlyViewed,
  recommendedShops,
}: CustomerHomeWorkspaceProps) {
  const { config } = useStorefrontTheme();
  const [traffic, setTraffic] = useState<{ type?: "direct" | "marketplace"; isMarketplaceEnabled?: boolean } | null>(null);
  const [profileSummary, setProfileSummary] = useState<{
    totalDue?: number;
    totalIncome?: number;
    orders?: number;
    claims?: number;
  } | null>(null);
  const [cartSummary, setCartSummary] = useState<{
    itemCount: number;
    quantity: number;
    subtotal: number;
    shops: string[];
  }>({ itemCount: 0, quantity: 0, subtotal: 0, shops: [] });
  const [geoLocation, setGeoLocation] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  const [selectedThana, setSelectedThana] = useState("all");
  const [selectedMarket, setSelectedMarket] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedShop, setSelectedShop] = useState("all");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [trafficResponse, profileResponse] = await Promise.all([
          getTrafficContext().catch(() => null),
          getProfile().catch(() => null),
        ]);
        if (!active) return;
        setTraffic(trafficResponse?.data || null);

        const globalCustomerId =
          typeof profileResponse?.user?.globalCustomerId === "string"
            ? profileResponse.user.globalCustomerId
            : null;

        if (globalCustomerId) {
          const overview = await getCustomerOverview(globalCustomerId).catch(() => null);
          if (!active) return;
          setProfileSummary({
            totalDue: Number(overview?.data?.walletSummary?.totalDue || 0),
            totalIncome: Number(overview?.data?.walletSummary?.totalIncome || 0),
            orders: Array.isArray(overview?.data?.orders) ? overview.data.orders.length : 0,
            claims: Array.isArray(overview?.data?.claims) ? overview.data.claims.length : 0,
          });
        }

        const cartResponse = await getRuntimeCart().catch(() => null);
        const items = cartResponse?.data?.items || [];
        const groupedShops = Array.from(new Set(items.map((item) => String(item.shopId || "")).filter(Boolean)));
        setCartSummary({
          itemCount: Number(cartResponse?.data?.totals?.itemCount || items.length || 0),
          quantity: Number(cartResponse?.data?.totals?.quantity || 0),
          subtotal: Number(cartResponse?.data?.totals?.subtotal || 0),
          shops: groupedShops,
        });
      } catch {
        // keep fallback experience
      }
    }

    void load();
    resolveBrowserLocation().then((location) => {
      if (active) setGeoLocation(location);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!deferredQuery.trim()) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const response = await searchSuggestions(deferredQuery.trim());
        const items = Array.isArray(response.data) ? response.data : [];
        setSuggestions(
          items
            .map((item) => String(item.name || item.title || item.id || ""))
            .filter(Boolean)
            .slice(0, 7)
        );
      } catch {
        setSuggestions([]);
      }
    }, 200);

    return () => clearTimeout(handle);
  }, [deferredQuery]);

  const categories = useMemo(() => uniqueValues(shops, "category"), [shops]);
  const districts = useMemo(() => uniqueValues(shops, "district"), [shops]);
  const thanas = useMemo(() => uniqueValues(shops, "thana"), [shops]);
  const markets = useMemo(() => uniqueValues(shops, "market"), [shops]);
  const shopNames = useMemo(() => uniqueValues(shops, "name"), [shops]);

  const filteredShops = useMemo(
    () =>
      shops.filter((shop) => {
        if (selectedDistrict !== "all" && shop.district !== selectedDistrict) return false;
        if (selectedThana !== "all" && shop.thana !== selectedThana) return false;
        if (selectedMarket !== "all" && shop.market !== selectedMarket) return false;
        if (selectedCategory !== "all" && shop.category !== selectedCategory) return false;
        if (selectedShop !== "all" && shop.name !== selectedShop) return false;
        return true;
      }),
    [selectedCategory, selectedDistrict, selectedMarket, selectedShop, selectedThana, shops]
  );

  const heroStats = useMemo(
    () => [
      { label: "Nearby shops", value: String(filteredShops.length), meta: geoLocation ? "Location-aware discovery" : "Filtered by manual selectors" },
      { label: "Cart subtotal", value: `${cartSummary.subtotal} BDT`, meta: `${cartSummary.itemCount} lines in cart` },
      { label: "Open due", value: `${profileSummary?.totalDue || 0} BDT`, meta: "Across connected shops" },
      { label: "Past orders", value: String(profileSummary?.orders || 0), meta: "Used for repeat-buy ranking" },
      { label: "Live suggestions", value: String(suggestions.length), meta: "Search intent signals" },
      { label: "Claims", value: String(profileSummary?.claims || 0), meta: "Trust and support history" },
      { label: "Traffic mode", value: traffic?.isMarketplaceEnabled === false ? "Direct" : "Marketplace", meta: "Controls discovery scope" },
      { label: "Grouped shops", value: String(cartSummary.shops.length), meta: "Eligible for bundled checkout" },
    ],
    [cartSummary.itemCount, cartSummary.shops.length, cartSummary.subtotal, filteredShops.length, geoLocation, profileSummary?.claims, profileSummary?.orders, profileSummary?.totalDue, suggestions.length, traffic?.isMarketplaceEnabled]
  );

  const walletWidgets = [
    { label: "Wallet balance", value: `${profileSummary?.totalIncome || 0} BDT`, meta: "Customer wallet credits" },
    { label: "Total due", value: `${profileSummary?.totalDue || 0} BDT`, meta: "Open credit across shops" },
    {
      label: "Multi-shop cart",
      value: `${cartSummary.shops.length} shops`,
      meta: cartSummary.shops.length > 1 ? "Grouped delivery eligible" : "Single-shop cart",
    },
  ];

  const recommendationFeed = useMemo(() => {
    const locationBoost = geoLocation ? "Location tuned" : "Behavior tuned";
    return [
      { label: "Past orders", value: String(profileSummary?.orders || 0), meta: "Used for repeat-buy ranking" },
      { label: "Search intent", value: String(suggestions.length), meta: "Live search signals" },
      { label: "Nearby shops", value: String(filteredShops.length), meta: locationBoost },
      { label: "Claims", value: String(profileSummary?.claims || 0), meta: "Trust layer history" },
    ];
  }, [filteredShops.length, geoLocation, profileSummary?.claims, profileSummary?.orders, suggestions.length]);
  const homepageSections = useMemo(
    () =>
      (Array.isArray(config.homepageSections) ? config.homepageSections : [])
        .filter((section): section is HomepageSection => Boolean(section?.type))
        .filter((section) => section.enabled),
    [config.homepageSections]
  );
  const heroSection = homepageSections.find((section) => section.type === "hero") || null;
  const contentSections = homepageSections.filter((section) => section.type !== "hero");
  const heroSearch = (
    <>
      <SmartSearchBar query={query} setQuery={setQuery} suggestions={suggestions} />
      <LocationSelector
        districts={districts}
        thanas={thanas}
        markets={markets}
        categories={categories}
        shopNames={shopNames}
        selectedDistrict={selectedDistrict}
        setSelectedDistrict={setSelectedDistrict}
        selectedThana={selectedThana}
        setSelectedThana={setSelectedThana}
        selectedMarket={selectedMarket}
        setSelectedMarket={setSelectedMarket}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedShop={selectedShop}
        setSelectedShop={setSelectedShop}
      />
    </>
  );

  return (
    <div className="grid gap-6">
      {heroSection
        ? renderHomepageSection(heroSection, {
            shopName,
            shopId,
            heroSearch,
            featuredProducts,
            recommendedProducts,
            flashDeals,
            recentlyViewed,
            shops: filteredShops.slice(0, 6),
            recommendedShops,
          })
        : null}

      <AnalyticsCards items={heroStats} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {traffic?.isMarketplaceEnabled !== false ? (
          <MapDiscoveryPreview shops={filteredShops.slice(0, 10)} />
        ) : (
          <Card>
            <CardTitle>Direct traffic scope</CardTitle>
            <CardDescription className="mt-2">
              Marketplace recommendations, other-shop discovery, and map browsing are hidden for direct campaign traffic.
            </CardDescription>
          </Card>
        )}
        <div className="grid gap-4">
          <MetricStrip title="Wallet + due" items={walletWidgets} />
          <MetricStrip title="Smart recommendation inputs" items={recommendationFeed} />
          <GroupedCommerceCard cartSummary={cartSummary} />
        </div>
      </div>

      <div className="sticky bottom-4 z-20 flex justify-center lg:hidden">
        <div className="flex w-full max-w-md items-center justify-between rounded-full border border-border/70 bg-background/95 px-4 py-3 shadow-lg backdrop-blur">
          <div className="text-sm">
            <p className="font-semibold">{cartSummary.shops.length} shops</p>
            <p className="text-xs text-muted-foreground">{cartSummary.itemCount} lines • {cartSummary.subtotal} BDT</p>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="secondary">
              <Link href="/map">Map</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/cart">Cart</Link>
            </Button>
          </div>
        </div>
      </div>

      {contentSections.map((section) => {
        if (section.type === "categories" && traffic?.isMarketplaceEnabled === false) return null;
        if (section.type === "testimonials" && (traffic?.isMarketplaceEnabled === false || !recommendedShops.length)) return null;
        return renderHomepageSection(section, {
          shopName,
          shopId,
          heroSearch,
          featuredProducts,
          recommendedProducts,
          flashDeals,
          recentlyViewed,
          shops: filteredShops.slice(0, 6),
          recommendedShops,
        });
      })}

      {recentlyViewed.length ? (
        <SectionShell
          sectionId="recently-viewed"
          sectionType="featuredProducts"
          shopId={shopId}
          title="Recently viewed"
          subtitle="Resume browsing and send products into one grouped checkout journey."
          ctaLabel="View all"
          ctaLink="/products"
        >
          <StorefrontProductGrid products={recentlyViewed} trackingContext="home-recent" />
        </SectionShell>
      ) : null}

    </div>
  );
}

function MetricStrip({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; value: string; meta: string }>;
}) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl border border-border/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
            <p className="mt-2 text-lg font-semibold">{item.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SmartSearchBar({
  query,
  setQuery,
  suggestions,
}: {
  query: string;
  setQuery: (value: string) => void;
  suggestions: string[];
}) {
  return (
    <div className="relative">
      <SearchInput
        placeholder="Search product, shop, category, market"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {suggestions.length ? (
        <div className="absolute left-0 right-0 top-[3.2rem] z-10 rounded-2xl border border-border bg-background p-3 shadow-lg">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Live suggestions</p>
          <div className="mt-2 grid gap-2 text-sm">
            {suggestions.map((item) => (
              <Link key={item} href={`/search?q=${encodeURIComponent(item)}`} className="rounded-xl px-3 py-2 hover:bg-accent/30">
                {item}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LocationSelector(props: {
  districts: string[];
  thanas: string[];
  markets: string[];
  categories: string[];
  shopNames: string[];
  selectedDistrict: string;
  setSelectedDistrict: (value: string) => void;
  selectedThana: string;
  setSelectedThana: (value: string) => void;
  selectedMarket: string;
  setSelectedMarket: (value: string) => void;
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
  selectedShop: string;
  setSelectedShop: (value: string) => void;
}) {
  return (
    <div className="grid gap-3">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Location and discovery selector</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SelectDropdown label="District" value={props.selectedDistrict} onValueChange={props.setSelectedDistrict} options={withAll("All districts", props.districts)} />
        <SelectDropdown label="Thana" value={props.selectedThana} onValueChange={props.setSelectedThana} options={withAll("All thanas", props.thanas)} />
        <SelectDropdown label="Market" value={props.selectedMarket} onValueChange={props.setSelectedMarket} options={withAll("All markets", props.markets)} />
        <SelectDropdown label="Category" value={props.selectedCategory} onValueChange={props.setSelectedCategory} options={withAll("All categories", props.categories)} />
        <SelectDropdown label="Shop" value={props.selectedShop} onValueChange={props.setSelectedShop} options={withAll("All shops", props.shopNames)} />
      </div>
    </div>
  );
}

function GroupedCommerceCard({
  cartSummary,
}: {
  cartSummary: { itemCount: number; quantity: number; subtotal: number; shops: string[] };
}) {
  return (
    <Card>
      <CardTitle>Grouped delivery checkout</CardTitle>
      <CardDescription className="mt-2">Multi-shop cart and single-charge preview for the super app journey.</CardDescription>
      <div className="mt-4 grid gap-3 text-sm">
        <div className="rounded-2xl border border-border/60 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Cart grouping</p>
          <p className="mt-2 text-lg font-semibold">{cartSummary.shops.length} shops to 1 delivery</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {cartSummary.itemCount} lines | {cartSummary.quantity} items | {cartSummary.subtotal} BDT subtotal
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Route summary</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Current checkout is prepared for grouped fulfillment once multiple shops fall into one delivery radius.
          </p>
        </div>
        <Button asChild>
          <Link href="/cart">Open grouped cart</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/checkout">Checkout now</Link>
        </Button>
      </div>
    </Card>
  );
}

function MapDiscoveryPreview({ shops }: { shops: ShopDirectoryItem[] }) {
  const mapBounds = useMemo(() => {
    const lats = shops.map((shop) => shop.lat);
    const lngs = shops.map((shop) => shop.lng);
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    };
  }, [shops]);

  return (
    <Card className="relative overflow-hidden">
      <CardTitle>Map-first discovery</CardTitle>
      <CardDescription className="mt-2">Tap a live shop card and jump into its storefront.</CardDescription>
      <div className="relative mt-6 h-[280px] overflow-hidden rounded-3xl border border-border/60 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(14,116,144,0.18),transparent_55%),linear-gradient(135deg,rgba(15,23,42,0.08),rgba(15,23,42,0.18))]">
        <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(transparent_23px,rgba(148,163,184,0.12)_24px),linear-gradient(90deg,transparent_23px,rgba(148,163,184,0.12)_24px)] [background-size:24px_24px]" />
        {shops.map((shop, index) => {
          const latRange = mapBounds.maxLat - mapBounds.minLat;
          const lngRange = mapBounds.maxLng - mapBounds.minLng;
          const x = lngRange ? ((shop.lng - mapBounds.minLng) / lngRange) * 100 : 12 + index * 6;
          const y = latRange ? 100 - ((shop.lat - mapBounds.minLat) / latRange) * 100 : 18 + index * 8;
          return (
            <Link
              key={shop.slug}
              href={`/shop/${shop.slug}`}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${Math.min(92, Math.max(6, x))}%`, top: `${Math.min(92, Math.max(6, y))}%` }}
            >
              <span className="inline-flex h-4 w-4 rounded-full bg-primary shadow-[0_0_0_8px_rgba(59,130,246,0.16)]" />
            </Link>
          );
        })}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {shops.slice(0, 4).map((shop) => (
          <Link key={`${shop.slug}-card`} href={`/shop/${shop.slug}`} className="rounded-2xl border border-border/60 p-3 text-sm hover:bg-accent/20">
            <p className="font-medium">{shop.name}</p>
            <p className="text-xs text-muted-foreground">{shop.market}, {shop.thana}</p>
          </Link>
        ))}
      </div>
      <div className="mt-4">
        <Button asChild variant="secondary">
          <Link href="/map">Open full map</Link>
        </Button>
      </div>
    </Card>
  );
}

function uniqueValues(rows: ShopDirectoryItem[], key: keyof ShopDirectoryItem) {
  return Array.from(
    new Set(
      rows
        .map((row) => row[key])
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    )
  ).sort();
}

function withAll(label: string, items: string[]) {
  return [{ label, value: "all" }, ...items.map((value) => ({ label: value, value }))];
}

function resolveBrowserLocation(): Promise<string | null> {
  if (typeof window === "undefined" || typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(`${position.coords.latitude.toFixed(6)},${position.coords.longitude.toFixed(6)}`);
      },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 5 * 60 * 1000 }
    );
  });
}
