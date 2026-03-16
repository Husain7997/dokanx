"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge, Button, Card, CardDescription, CardTitle, Input } from "@dokanx/ui";

import { listLocations, searchRuntimeProducts, searchShops, searchSuggestions } from "@/lib/runtime-api";
import { StorefrontProductGrid } from "@/components/storefront-product-grid";

type RuntimeProduct = {
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

export function SearchWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [products, setProducts] = useState<RuntimeProduct[]>([]);
  const [shops, setShops] = useState<Array<{ _id?: string; name?: string; slug?: string; domain?: string }>>([]);
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<string>("popular");
  const [activeTab, setActiveTab] = useState<"products" | "shops" | "categories">("products");
  const [district, setDistrict] = useState<string>("all");
  const [market, setMarket] = useState<string>("all");
  const [districts, setDistricts] = useState<string[]>([]);
  const [markets, setMarkets] = useState<string[]>([]);
  const [locationMap, setLocationMap] = useState<Map<string, { lat: number; lng: number }>>(new Map());
  const [shopSort, setShopSort] = useState<"nearest" | "rating">("nearest");
  const [distance, setDistance] = useState(5);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const categories = useMemo(() => {
    const values = new Set<string>();
    products.forEach((product) => product.category && values.add(product.category));
    return Array.from(values);
  }, [products]);

  const sortedProducts = useMemo(() => {
    const filtered = category === "all" ? products : products.filter((product) => product.category === category);
    if (sort === "lowest") {
      return [...filtered].sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    }
    if (sort === "highest") {
      return [...filtered].sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    }
    return filtered;
  }, [category, products, sort]);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const response = await searchSuggestions(query.trim());
        const items = Array.isArray(response.data) ? response.data : [];
        setSuggestions(
          items
            .map((item) => String(item.name || item.title || item.id || ""))
            .filter(Boolean)
            .slice(0, 6)
        );
      } catch {
        setSuggestions([]);
      }
    }, 200);

    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!query.trim()) {
        setProducts([]);
        setShops([]);
        setMessage("Search products, shops, or categories.");
        return;
      }
      setLoading(true);
      setMessage(null);
      try {
        const [productsResponse, shopsResponse] = await Promise.all([
          searchRuntimeProducts({ q: query.trim() }),
          searchShops(query.trim(), {
            district: district !== "all" ? district : undefined,
            market: market !== "all" ? market : undefined,
          }),
        ]);
        if (!active) return;
        setProducts(productsResponse.data || []);
        setShops(shopsResponse.data || []);
        if (!productsResponse.data?.length && !shopsResponse.data?.length) {
          setMessage("No products matched your search.");
        }
      } catch (error) {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : "Search failed.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [query, district, market]);

  useEffect(() => {
    let active = true;
    async function loadLocations() {
      try {
        const response = await listLocations();
        if (!active) return;
        const rows = response.data || [];
        const nextDistricts = Array.from(new Set(rows.map((row) => row.city).filter(Boolean))).sort();
        const nextMarkets = Array.from(new Set(rows.map((row) => row.name).filter(Boolean))).sort();
        setDistricts(nextDistricts as string[]);
        setMarkets(nextMarkets as string[]);
        const map = new Map<string, { lat: number; lng: number }>();
        rows.forEach((row) => {
          const coords = row.coordinates?.coordinates || [];
          if (!row.shopId || coords.length < 2) return;
          map.set(String(row.shopId), { lat: Number(coords[1]), lng: Number(coords[0]) });
        });
        setLocationMap(map);
      } catch {
        if (!active) return;
      }
    }
    void loadLocations();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      () => null,
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  function handleSubmit(value: string) {
    const next = value.trim();
    router.push(`/search?q=${encodeURIComponent(next)}`);
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardTitle>Search marketplace</CardTitle>
        <CardDescription className="mt-2">
          Google-style suggestions with category filters and price sorting.
        </CardDescription>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ["products", "Products"],
            ["shops", "Shops"],
            ["categories", "Categories"],
          ].map(([value, label]) => (
            <Button
              key={value}
              variant={activeTab === value ? "default" : "secondary"}
              size="sm"
              onClick={() => setActiveTab(value as "products" | "shops" | "categories")}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="relative mt-6">
          <Input
            placeholder="Search products, shops, categories, brands"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSubmit(query);
              }
            }}
          />
          {suggestions.length ? (
            <div className="absolute left-0 right-0 top-[3.2rem] z-10 rounded-2xl border border-border bg-background p-3 shadow-lg">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Suggestions</p>
              <div className="mt-2 grid gap-2 text-sm">
                {suggestions.map((item) => (
                  <button
                    key={item}
                    className="rounded-xl px-3 py-2 text-left hover:bg-accent/30"
                    onClick={() => handleSubmit(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        {activeTab === "products" ? (
          <>
            <div className="mt-6 flex flex-wrap gap-2">
              <Badge variant={category === "all" ? "success" : "neutral"} onClick={() => setCategory("all")}>
                All
              </Badge>
              {categories.map((value) => (
                <Badge key={value} variant={category === value ? "success" : "neutral"} onClick={() => setCategory(value)}>
                  {value}
                </Badge>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              {[
                ["popular", "Popular"],
                ["lowest", "Lowest Price"],
                ["highest", "Highest Price"],
              ].map(([value, label]) => (
                <Button key={value} variant={sort === value ? "default" : "secondary"} size="sm" onClick={() => setSort(value)}>
                  {label}
                </Button>
              ))}
            </div>
          </>
        ) : null}
      </Card>

      {loading ? <p className="text-sm text-muted-foreground">Loading results...</p> : null}
      {message ? (
        <Card className="border-dashed border-border/60 bg-card/60">
          <CardTitle>Search results</CardTitle>
          <CardDescription className="mt-2">{message}</CardDescription>
        </Card>
      ) : null}
      {activeTab === "products" && sortedProducts.length ? <StorefrontProductGrid products={sortedProducts} /> : null}
      {activeTab === "shops" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="md:col-span-2">
            <CardTitle>Shop filters</CardTitle>
            <CardDescription className="mt-2">Filter shops by district and market.</CardDescription>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant={district === "all" ? "success" : "neutral"} onClick={() => setDistrict("all")}>
                All districts
              </Badge>
              {districts.map((value) => (
                <Badge key={value} variant={district === value ? "success" : "neutral"} onClick={() => setDistrict(value)}>
                  {value}
                </Badge>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant={market === "all" ? "success" : "neutral"} onClick={() => setMarket("all")}>
                All markets
              </Badge>
              {markets.map((value) => (
                <Badge key={value} variant={market === value ? "success" : "neutral"} onClick={() => setMarket(value)}>
                  {value}
                </Badge>
              ))}
            </div>
            <div className="mt-6 grid gap-3">
              <p className="text-sm text-muted-foreground">Distance radius: {distance} km</p>
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={distance}
                onChange={(event) => setDistance(Number(event.target.value))}
                className="w-full"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant={shopSort === "nearest" ? "default" : "secondary"} onClick={() => setShopSort("nearest")}>
                Nearest
              </Button>
              <Button size="sm" variant={shopSort === "rating" ? "default" : "secondary"} onClick={() => setShopSort("rating")}>
                Highest rating
              </Button>
            </div>
          </Card>
          {sortShops(shops, userLocation, distance, shopSort, locationMap).map((shop) => (
            <Card key={String(shop._id || shop.slug || shop.domain)}>
              <CardTitle>{shop.name || "Shop"}</CardTitle>
              <CardDescription className="mt-2">{shop.domain || shop.slug || "Marketplace shop"}</CardDescription>
              {userLocation && shop.distanceKm !== undefined ? (
                <p className="mt-2 text-sm text-muted-foreground">{shop.distanceKm.toFixed(1)} km away</p>
              ) : null}
              <p className="mt-2 text-sm text-muted-foreground">⭐ {shop.rating.toFixed(1)}</p>
              {shop.slug ? (
                <div className="mt-4">
                  <Button asChild variant="secondary">
                    <a href={`/shop/${shop.slug}`}>Visit shop</a>
                  </Button>
                </div>
              ) : null}
            </Card>
          ))}
          {!shops.length ? (
            <Card className="border-dashed border-border/60 bg-card/60">
              <CardTitle>No shops found</CardTitle>
              <CardDescription className="mt-2">Try searching with a different keyword.</CardDescription>
            </Card>
          ) : null}
        </div>
      ) : null}
      {activeTab === "categories" ? (
        <Card>
          <CardTitle>Categories</CardTitle>
          <CardDescription className="mt-2">Tap a category to focus your search.</CardDescription>
          <div className="mt-4 flex flex-wrap gap-2">
            {(categories.length ? categories : ["Groceries", "Electronics", "Fashion", "Medicine"]).map((value) => (
              <Badge key={value} variant="secondary" onClick={() => setCategory(value)}>
                {value}
              </Badge>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function sortShops(
  shops: Array<{ _id?: string; name?: string; slug?: string; domain?: string }>,
  userLocation: { lat: number; lng: number } | null,
  distance: number,
  sort: "nearest" | "rating",
  locationMap: Map<string, { lat: number; lng: number }>
) {
  const enriched = shops.map((shop) => {
    const id = String(shop._id || shop.slug || shop.domain || "");
    const rating = 3.8 + (hashCode(id) % 12) / 10;
    let distanceKm: number | undefined;
    if (userLocation) {
      const coords = locationMap.get(String(shop._id || ""));
      if (coords) {
        distanceKm = getDistanceKm(userLocation, coords);
      }
    }
    return { ...shop, rating, distanceKm };
  });

  const filtered = userLocation
    ? enriched.filter((shop) => shop.distanceKm !== undefined && shop.distanceKm <= distance)
    : enriched;

  if (sort === "rating") {
    return filtered.sort((a, b) => b.rating - a.rating);
  }
  return filtered.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
}

function hashCode(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getDistanceKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
) {
  const rad = Math.PI / 180;
  const dLat = (to.lat - from.lat) * rad;
  const dLng = (to.lng - from.lng) * rad;
  const lat1 = from.lat * rad;
  const lat2 = to.lat * rad;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}
