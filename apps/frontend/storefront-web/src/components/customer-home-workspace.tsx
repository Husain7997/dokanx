"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, CardDescription, CardTitle, Input } from "@dokanx/ui";

import { searchSuggestions } from "@/lib/runtime-api";
import { StorefrontProductGrid } from "@/components/storefront-product-grid";

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

type CustomerHomeWorkspaceProps = {
  shops: ShopDirectoryItem[];
  featuredProducts: ProductRow[];
  recommendedProducts: ProductRow[];
  flashDeals: ProductRow[];
};

const promoBanners = [
  {
    title: "Flash Sale",
    subtitle: "Up to 40% off this week",
    accent: "bg-gradient-to-r from-orange-500/90 via-amber-400/90 to-yellow-300/90",
  },
  {
    title: "New Stores",
    subtitle: "Discover fresh merchants near you",
    accent: "bg-gradient-to-r from-emerald-500/90 via-teal-400/90 to-cyan-300/90",
  },
  {
    title: "Electronics Fest",
    subtitle: "Exclusive bundles and freebies",
    accent: "bg-gradient-to-r from-blue-600/90 via-indigo-500/90 to-purple-500/90",
  },
];

export function CustomerHomeWorkspace({
  shops,
  featuredProducts,
  recommendedProducts,
  flashDeals,
}: CustomerHomeWorkspaceProps) {
  const categories = useMemo(() => {
    const values = new Set<string>();
    featuredProducts.forEach((product) => product.category && values.add(product.category));
    recommendedProducts.forEach((product) => product.category && values.add(product.category));
    return Array.from(values);
  }, [featuredProducts, recommendedProducts]);

  return (
    <div className="grid gap-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card className="relative overflow-hidden">
          <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
          <CardTitle className="text-2xl">Shop smarter around you</CardTitle>
          <CardDescription className="mt-2">
            Location-aware discovery across shops, products, and deals.
          </CardDescription>
          <div className="mt-6 grid gap-4">
            <LocationSelector shops={shops} />
            <SmartSearchBar />
          </div>
        </Card>
        <MapDiscoveryPreview shops={shops.slice(0, 8)} />
      </div>

      <CategorySlider categories={categories} />
      <PromoBannerRow />
      <FlashDealsSection products={flashDeals} />

      <SectionHeader
        title="Popular products"
        subtitle="Best sellers and trending picks"
        href="/products"
      />
      <StorefrontProductGrid products={featuredProducts} />

      <SectionHeader
        title="Nearby shops"
        subtitle="Location-aware storefronts ready to deliver"
        href="/shops"
      />
      <NearbyShops shops={shops.slice(0, 6)} />

      <SectionHeader
        title="Recommended for you"
        subtitle="Personalized picks from your favorite categories"
        href="/products"
      />
      <StorefrontProductGrid products={recommendedProducts} />

      <FooterNavigation />
    </div>
  );
}

function SectionHeader({ title, subtitle, href }: { title: string; subtitle: string; href: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <Button asChild variant="secondary">
        <Link href={href}>View all</Link>
      </Button>
    </div>
  );
}

function LocationSelector({ shops }: { shops: ShopDirectoryItem[] }) {
  const [district, setDistrict] = useState("all");
  const [thana, setThana] = useState("all");
  const [market, setMarket] = useState("all");
  const [shop, setShop] = useState("all");

  const districts = useMemo(() => uniqueValues(shops, "district"), [shops]);
  const thanas = useMemo(() => uniqueValues(shops, "thana"), [shops]);
  const markets = useMemo(() => uniqueValues(shops, "market"), [shops]);
  const shopOptions = useMemo(() => uniqueValues(shops, "name"), [shops]);

  const selection = [district, thana, market, shop]
    .filter((value) => value !== "all")
    .join(" › ");

  return (
    <div className="grid gap-3">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Location selector</p>
      <div className="grid gap-3 md:grid-cols-4">
        <select
          className="h-11 rounded-full border border-border bg-background px-4 text-sm"
          value={district}
          onChange={(event) => setDistrict(event.target.value)}
        >
          <option value="all">District</option>
          {districts.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          className="h-11 rounded-full border border-border bg-background px-4 text-sm"
          value={thana}
          onChange={(event) => setThana(event.target.value)}
        >
          <option value="all">Thana</option>
          {thanas.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          className="h-11 rounded-full border border-border bg-background px-4 text-sm"
          value={market}
          onChange={(event) => setMarket(event.target.value)}
        >
          <option value="all">Market</option>
          {markets.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          className="h-11 rounded-full border border-border bg-background px-4 text-sm"
          value={shop}
          onChange={(event) => setShop(event.target.value)}
        >
          <option value="all">Shop</option>
          {shopOptions.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-muted-foreground">
        {selection ? `Selected: Bangladesh › ${selection}` : "Select a market to personalize discovery."}
      </p>
    </div>
  );
}

function SmartSearchBar() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await searchSuggestions(query.trim());
        const items = Array.isArray(response.data) ? response.data : [];
        setSuggestions(items.map((item) => String(item.name || item.title || item.id || "")).filter(Boolean).slice(0, 6));
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div className="relative">
      <Input
        placeholder="Search products, shops, categories, brands"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {loading ? <span className="absolute right-4 top-3 text-xs text-muted-foreground">Searching...</span> : null}
      {suggestions.length ? (
        <div className="absolute left-0 right-0 top-[3.2rem] z-10 rounded-2xl border border-border bg-background p-3 shadow-lg">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Suggestions</p>
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

function CategorySlider({ categories }: { categories: string[] }) {
  const items = categories.length
    ? categories
    : ["Groceries", "Electronics", "Fashion", "Medicine", "Restaurants", "Hardware", "Books"];

  return (
    <Card>
      <CardTitle>Browse categories</CardTitle>
      <div className="mt-4 flex flex-wrap gap-3">
        {items.map((category) => (
          <Badge key={category} variant="secondary">
            {category}
          </Badge>
        ))}
      </div>
    </Card>
  );
}

function PromoBannerRow() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {promoBanners.map((banner) => (
        <Card key={banner.title} className={`text-white ${banner.accent}`}>
          <CardTitle className="text-white">{banner.title}</CardTitle>
          <CardDescription className="mt-2 text-white/90">{banner.subtitle}</CardDescription>
        </Card>
      ))}
    </div>
  );
}

function FlashDealsSection({ products }: { products: ProductRow[] }) {
  const deals = products.slice(0, 4);
  return (
    <Card>
      <CardTitle>Flash deals</CardTitle>
      <CardDescription className="mt-2">Limited-time offers, updated hourly.</CardDescription>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {deals.map((product) => (
          <div key={String(product._id || product.id)} className="flex items-center gap-4 rounded-2xl border border-border/60 p-4">
            <div className="h-20 w-20 overflow-hidden rounded-2xl bg-accent">
              <img
                src={product.image || "https://placehold.co/200x200"}
                alt={product.name || "Deal"}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{product.name}</p>
              <p className="text-xs text-muted-foreground">{product.category || "Deal"}</p>
              <p className="mt-2 text-sm font-semibold">{product.price ?? 0} BDT</p>
            </div>
            <Badge variant="danger">Hot</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

function NearbyShops({ shops }: { shops: ShopDirectoryItem[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {shops.map((shop, index) => (
        <Card key={shop.slug} className="border-border/60 bg-card/70">
          <CardTitle>{shop.name}</CardTitle>
          <CardDescription className="mt-2">
            {shop.district}, {shop.thana}
          </CardDescription>
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>{(0.4 + index * 0.2).toFixed(1)} km away</span>
            <span>{shop.rating} ★</span>
          </div>
          <div className="mt-4">
            <Button asChild size="sm">
              <Link href={`/shop/${shop.slug}`}>Visit shop</Link>
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function MapDiscoveryPreview({ shops }: { shops: ShopDirectoryItem[] }) {
  const mapBounds = useMemo(() => {
    const lats = shops.map((shop) => shop.lat);
    const lngs = shops.map((shop) => shop.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return { minLat, maxLat, minLng, maxLng };
  }, [shops]);

  function getPinPosition(shop: ShopDirectoryItem, index: number) {
    const { minLat, maxLat, minLng, maxLng } = mapBounds;
    const latRange = maxLat - minLat;
    const lngRange = maxLng - minLng;
    const x = lngRange ? ((shop.lng - minLng) / lngRange) * 100 : 10 + index * 12;
    const y = latRange ? 100 - ((shop.lat - minLat) / latRange) * 100 : 20 + index * 12;
    return { left: `${Math.min(92, Math.max(4, x))}%`, top: `${Math.min(92, Math.max(4, y))}%` };
  }

  return (
    <Card className="relative overflow-hidden">
      <CardTitle>Map discovery</CardTitle>
      <CardDescription className="mt-2">Tap into nearby shops with delivery radius coverage.</CardDescription>
      <div className="relative mt-6 h-[260px] overflow-hidden rounded-3xl border border-border/60 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.16),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(2,132,199,0.2),transparent_55%),linear-gradient(135deg,rgba(15,23,42,0.06),rgba(15,23,42,0.18))]">
        <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(transparent_23px,rgba(148,163,184,0.15)_24px),linear-gradient(90deg,transparent_23px,rgba(148,163,184,0.15)_24px)] [background-size:24px_24px]" />
        {shops.map((shop, index) => {
          const pos = getPinPosition(shop, index);
          return (
            <div
              key={`${shop.slug}-pin`}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2"
              style={pos}
            >
              <span className="h-3 w-3 rounded-full bg-primary shadow-[0_0_0_6px_rgba(59,130,246,0.18)]" />
            </div>
          );
        })}
      </div>
      <div className="mt-4">
        <Button asChild variant="secondary">
          <Link href="/shops">Open live map</Link>
        </Button>
      </div>
    </Card>
  );
}

function FooterNavigation() {
  const links = [
    { label: "Home", href: "/" },
    { label: "Categories", href: "/categories" },
    { label: "Deals", href: "/products" },
    { label: "Shops", href: "/shops" },
    { label: "Orders", href: "/orders" },
    { label: "Account", href: "/account" },
  ];

  return (
    <Card className="grid gap-4">
      <CardTitle>Customer navigation</CardTitle>
      <div className="flex flex-wrap gap-3 text-sm">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="rounded-full border border-border px-4 py-2">
            {link.label}
          </Link>
        ))}
      </div>
    </Card>
  );
}

function uniqueValues(rows: ShopDirectoryItem[], key: keyof ShopDirectoryItem) {
  const values = rows
    .map((row) => row[key])
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  return Array.from(new Set(values)).sort();
}
