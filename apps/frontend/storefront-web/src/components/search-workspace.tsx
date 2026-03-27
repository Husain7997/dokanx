"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge, Button, Card, CardDescription, CardTitle, Input } from "@dokanx/ui";

import { getEtaSettings, getTrafficContext, listLocations, searchMarketplace, searchSuggestions } from "@/lib/runtime-api";
import { StorefrontProductGrid } from "@/components/storefront-product-grid";

type RuntimeProduct = {
  _id?: string;
  id?: string;
  name?: string;
  category?: string;
  brand?: string;
  price?: number;
  stock?: number;
  reserved?: number;
  discountRate?: number;
  ratingAverage?: number;
  ratingCount?: number;
  distanceKm?: number | null;
  shop?: { id?: string; name?: string; trustScore?: number | null } | null;
  shopId?: string;
  image?: string;
  slug?: string;
};

type EtaSettings = {
  basePerKm: number;
  minEta: number;
  fallbackEta: number;
  trafficFactors: Array<{ maxDistanceKm: number; minutes: number }>;
  distanceBrackets: Array<{ maxDistanceKm: number; minutes: number }>;
};

const defaultEtaSettings: EtaSettings = {
  basePerKm: 10,
  minEta: 15,
  fallbackEta: 45,
  trafficFactors: [
    { maxDistanceKm: 2, minutes: 8 },
    { maxDistanceKm: 5, minutes: 12 },
    { maxDistanceKm: 10, minutes: 18 },
    { maxDistanceKm: 999, minutes: 24 },
  ],
  distanceBrackets: [
    { maxDistanceKm: 2, minutes: 5 },
    { maxDistanceKm: 5, minutes: 8 },
    { maxDistanceKm: 10, minutes: 12 },
    { maxDistanceKm: 999, minutes: 18 },
  ],
};

export function SearchWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [products, setProducts] = useState<RuntimeProduct[]>([]);
  const [shops, setShops] = useState<Array<{ _id?: string; name?: string; slug?: string; domain?: string; ratingAverage?: number; distanceKm?: number | null; trustScore?: number | null }>>([]);
  const [category, setCategory] = useState<string>("all");
  const [brand, setBrand] = useState<string>("all");
  const [sort, setSort] = useState<string>("popular");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [minRating, setMinRating] = useState<string>("any");
  const [inStock, setInStock] = useState<boolean>(false);
  const [minDiscount, setMinDiscount] = useState<string>("any");
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
  const [etaSettings, setEtaSettings] = useState<EtaSettings>(defaultEtaSettings);
  const [trafficType, setTrafficType] = useState<"direct" | "marketplace">("marketplace");

  const categories = useMemo(() => {
    const values = new Set<string>();
    products.forEach((product) => product.category && values.add(product.category));
    return Array.from(values);
  }, [products]);

  const brands = useMemo(() => {
    const values = new Set<string>();
    products.forEach((product) => product.brand && values.add(product.brand));
    return Array.from(values);
  }, [products]);

  const sortedProducts = useMemo(() => {
    let filtered = category === "all" ? products : products.filter((product) => product.category === category);
    filtered = brand === "all" ? filtered : filtered.filter((product) => product.brand === brand);
    if (sort === "lowest") {
      return [...filtered].sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    }
    if (sort === "highest") {
      return [...filtered].sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    }
    return filtered;
  }, [brand, category, products, sort]);

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
      ensureSearchSession(query.trim());
      setLoading(true);
      setMessage(null);
      try {
        const response = await searchMarketplace({
          q: query.trim(),
          category: category !== "all" ? category : undefined,
          brand: brand !== "all" ? brand : undefined,
          minPrice: minPrice || undefined,
          maxPrice: maxPrice || undefined,
          minRating: minRating !== "any" ? minRating : undefined,
          inStock: inStock ? "true" : undefined,
          minDiscount: minDiscount !== "any" ? minDiscount : undefined,
          district: district !== "all" ? district : undefined,
          market: market !== "all" ? market : undefined,
          lat: userLocation ? String(userLocation.lat) : undefined,
          lng: userLocation ? String(userLocation.lng) : undefined,
          distance: userLocation ? String(distance) : undefined,
        });
        if (!active) return;
        setProducts(response.products || []);
        setShops(response.shops || []);
        if (!response.products?.length && !response.shops?.length) {
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
  }, [query, district, market, category, brand, minPrice, maxPrice, minRating, inStock, minDiscount, userLocation, distance]);

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
    let active = true;
    async function loadEtaSettings() {
      try {
        const response = await getEtaSettings();
        if (!active) return;
        const data = response.data || {};
        setEtaSettings({
          basePerKm: Number(data.basePerKm ?? defaultEtaSettings.basePerKm),
          minEta: Number(data.minEta ?? defaultEtaSettings.minEta),
          fallbackEta: Number(data.fallbackEta ?? defaultEtaSettings.fallbackEta),
          trafficFactors: normalizeBrackets(data.trafficFactors, defaultEtaSettings.trafficFactors),
          distanceBrackets: normalizeBrackets(data.distanceBrackets, defaultEtaSettings.distanceBrackets),
        });
      } catch {
        if (!active) return;
        setEtaSettings(defaultEtaSettings);
      }
    }
    void loadEtaSettings();
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

  useEffect(() => {
    let active = true;
    getTrafficContext()
      .then((response) => {
        if (active && response.data?.type) {
          setTrafficType(response.data.type);
          if (response.data.isMarketplaceEnabled === false) {
            setActiveTab("products");
          }
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  function handleSubmit(value: string) {
    const next = value.trim();
    ensureSearchSession(next);
    router.push(`/search?q=${encodeURIComponent(next)}`);
  }

  function ensureSearchSession(nextQuery: string) {
    if (typeof window === "undefined") return null;
    const normalized = nextQuery.trim();
    if (!normalized) return null;
    const storedQuery = window.sessionStorage.getItem("dokanx.search-query");
    if (storedQuery !== normalized) {
      const nextId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `search_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      window.sessionStorage.setItem("dokanx.search-id", nextId);
      window.sessionStorage.setItem("dokanx.search-query", normalized);
      return nextId;
    }
    return window.sessionStorage.getItem("dokanx.search-id");
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardTitle>Search marketplace</CardTitle>
        <CardDescription className="mt-2">
          {trafficType === "direct"
            ? "Direct traffic mode limits discovery to the current shop."
            : "Google-style suggestions with category filters and price sorting."}
        </CardDescription>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ["products", "Products"],
            ["shops", "Shops"],
            ["categories", "Categories"],
          ]
            .filter(([value]) => trafficType !== "direct" || value === "products")
            .map(([value, label]) => (
            <Button
              key={value}
              variant={activeTab === value ? "primary" : "secondary"}
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
            {brands.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant={brand === "all" ? "success" : "neutral"} onClick={() => setBrand("all")}>
                  All brands
                </Badge>
                {brands.map((value) => (
                  <Badge key={value} variant={brand === value ? "success" : "neutral"} onClick={() => setBrand(value)}>
                    {value}
                  </Badge>
                ))}
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              {[
                ["popular", "Ranking"],
                ["lowest", "Lowest Price"],
                ["highest", "Highest Price"],
              ].map(([value, label]) => (
                <Button key={value} variant={sort === value ? "primary" : "secondary"} size="sm" onClick={() => setSort(value)}>
                  {label}
                </Button>
              ))}
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Price range</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Min"
                    value={minPrice}
                    onChange={(event) => setMinPrice(event.target.value)}
                  />
                  <Input
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(event) => setMaxPrice(event.target.value)}
                  />
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Rating</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {["any", "3", "4", "4.5"].map((value) => (
                    <Badge
                      key={value}
                      variant={minRating === value ? "success" : "neutral"}
                      onClick={() => setMinRating(value)}
                    >
                      {value === "any" ? "Any" : `${value}+`}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Availability</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant={!inStock ? "success" : "neutral"} onClick={() => setInStock(false)}>
                    All
                  </Badge>
                  <Badge variant={inStock ? "success" : "neutral"} onClick={() => setInStock(true)}>
                    In stock
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["any", "5", "10", "20"].map((value) => (
                    <Badge
                      key={value}
                      variant={minDiscount === value ? "success" : "neutral"}
                      onClick={() => setMinDiscount(value)}
                    >
                      {value === "any" ? "Any discount" : `${value}%+ off`}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            {userLocation ? (
              <div className="mt-4 grid gap-3">
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
            ) : null}
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
              <Button size="sm" variant={shopSort === "nearest" ? "primary" : "secondary"} onClick={() => setShopSort("nearest")}>
                Nearest
              </Button>
              <Button size="sm" variant={shopSort === "rating" ? "primary" : "secondary"} onClick={() => setShopSort("rating")}>
                Highest rating
              </Button>
            </div>
          </Card>
          {sortShops(shops, userLocation, distance, shopSort, locationMap, etaSettings).map((shop) => (
            <Card key={String(shop._id || shop.slug || shop.domain)}>
              <CardTitle>{shop.name || "Shop"}</CardTitle>
              <CardDescription className="mt-2">{shop.domain || shop.slug || "Marketplace shop"}</CardDescription>
              {userLocation && shop.distanceKm !== undefined ? (
                <p className="mt-2 text-sm text-muted-foreground">{shop.distanceKm.toFixed(1)} km away</p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>⭐ {shop.rating.toFixed(1)}</span>
                <span>{shop.isOpen ? "Open" : "Closed"}</span>
                <span>ETA {shop.etaMinutes} min</span>
              </div>
              <div className="mt-1">
                <Badge variant="neutral">Trust {Math.round(shop.trustScore || 0)}</Badge>
              </div>
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
              <Badge key={value} variant="neutral" onClick={() => setCategory(value)}>
                {value}
              </Badge>
            ))}
          </div>
        </Card>
      ) : null}
      {userLocation ? (
        <GeoSearchSummary
          products={sortedProducts}
          shops={sortShops(shops, userLocation, distance, shopSort, locationMap, etaSettings)}
          userLocation={userLocation}
          locationMap={locationMap}
        />
      ) : null}
    </div>
  );
}

function GeoSearchSummary({
  products,
  shops,
  userLocation,
  locationMap,
}: {
  products: RuntimeProduct[];
  shops: Array<{ _id?: string; name?: string; slug?: string; domain?: string; distanceKm?: number | null }>;
  userLocation: { lat: number; lng: number };
  locationMap: Map<string, { lat: number; lng: number }>;
}) {
  const [focused, setFocused] = useState<{ id: string; label: string; coords: { lat: number; lng: number } } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const distanceBuckets = [
    { label: "Within 2 km", min: 0, max: 2 },
    { label: "2-5 km", min: 2, max: 5 },
    { label: "5-10 km", min: 5, max: 10 },
    { label: "10+ km", min: 10, max: Number.POSITIVE_INFINITY },
  ];

  const shopPins = shops
    .map((shop) => {
      const coords = locationMap.get(String(shop._id || ""));
      if (!coords) return null;
      return { id: String(shop._id || shop.slug || shop.domain || ""), name: shop.name || "Shop", coords };
    })
    .filter(Boolean) as Array<{ id: string; name: string; coords: { lat: number; lng: number } }>;

  const productPins = products
    .map((product) => {
      const shopId = String(product.shopId || "");
      if (!shopId) return null;
      const coords = locationMap.get(shopId);
      if (!coords) return null;
      return { id: String(product._id || product.id || product.name || ""), name: product.name || "Product", coords };
    })
    .filter(Boolean)
    .slice(0, 10) as Array<{ id: string; name: string; coords: { lat: number; lng: number } }>;

  const mapBounds = computeBounds([...shopPins, ...productPins]);

  const groupedProducts = groupByDistance(products, (product) => {
    if (typeof product.distanceKm === "number") return product.distanceKm;
    const shopId = String(product.shopId || "");
    const coords = locationMap.get(shopId);
    if (!coords) return null;
    return getDistanceKm(userLocation, coords);
  }, distanceBuckets);

  const groupedShops = groupByDistance(shops, (shop) => {
    if (typeof shop.distanceKm === "number") return shop.distanceKm;
    const coords = locationMap.get(String(shop._id || ""));
    if (!coords) return null;
    return getDistanceKm(userLocation, coords);
  }, distanceBuckets);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_480px]">
      <Card>
        <CardTitle>Nearby results by distance</CardTitle>
        <CardDescription className="mt-2">
          Products and shops grouped by proximity to your location.
        </CardDescription>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Products</p>
            <div className="mt-3 grid gap-4">
              {groupedProducts.map((group) => (
                <div key={group.label}>
                  <p className="text-sm font-semibold text-foreground">{group.label}</p>
                  <div className="mt-2 grid gap-2 text-xs text-muted-foreground">
                    {group.items.length ? (
                      group.items.slice(0, 5).map((item) => {
                        const coords = resolveProductCoords(item, locationMap);
                        return (
                          <div key={String(item._id || item.id)} className="flex items-center justify-between gap-3">
                            <span className="text-foreground">{item.name || "Product"}</span>
                            <div className="flex items-center gap-3">
                              <span>{formatKm(item._distanceKm)}</span>
                              {coords ? (
                                <button
                                  className="text-xs font-semibold text-primary"
                                  onClick={() =>
                                    setFocused({
                                      id: String(item._id || item.id || item.name || ""),
                                      label: item.name || "Product",
                                      coords,
                                    })
                                  }
                                >
                                  Focus
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p>No products</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Shops</p>
            <div className="mt-3 grid gap-4">
              {groupedShops.map((group) => (
                <div key={group.label}>
                  <p className="text-sm font-semibold text-foreground">{group.label}</p>
                  <div className="mt-2 grid gap-2 text-xs text-muted-foreground">
                    {group.items.length ? (
                      group.items.slice(0, 5).map((item) => {
                        const coords = resolveShopCoords(item, locationMap);
                        return (
                          <div key={String(item._id || item.slug || item.domain)} className="flex items-center justify-between gap-3">
                            <span className="text-foreground">{item.name || "Shop"}</span>
                            <div className="flex items-center gap-3">
                              <span>{formatKm(item._distanceKm)}</span>
                              {coords ? (
                                <button
                                  className="text-xs font-semibold text-primary"
                                  onClick={() =>
                                    setFocused({
                                      id: String(item._id || item.slug || item.domain || ""),
                                      label: item.name || "Shop",
                                      coords,
                                    })
                                  }
                                >
                                  Focus
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p>No shops</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className="relative overflow-hidden">
        <CardTitle>Geo search map</CardTitle>
        <CardDescription className="mt-2">
          Shop pins and product hotspots around you.
        </CardDescription>
        <div className="relative mt-6 h-[420px] overflow-hidden rounded-3xl border border-border/60 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.2),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.18),transparent_55%),linear-gradient(135deg,rgba(15,23,42,0.08),rgba(15,23,42,0.2))]">
          <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(transparent_23px,rgba(148,163,184,0.12)_24px),linear-gradient(90deg,transparent_23px,rgba(148,163,184,0.12)_24px)] [background-size:24px_24px]" />
          {focused ? (
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/60 bg-primary/10"
              style={{
                ...resolvePinPosition(focused.coords, mapBounds, 0),
                width: "120px",
                height: "120px",
              }}
            />
          ) : null}
          {shopPins.map((pin, index) => {
            const pos = resolvePinPosition(pin.coords, mapBounds, index);
            return (
              <div
                key={`shop-${pin.id}`}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2"
                style={pos}
                onMouseEnter={() => setHoveredId(pin.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <span className="h-3 w-3 rounded-full bg-primary shadow-[0_0_0_6px_rgba(59,130,246,0.15)]" />
                {hoveredId === pin.id || focused?.id === pin.id ? (
                  <span className="rounded-full bg-background/90 px-3 py-1 text-xs shadow-sm">
                    {pin.name}
                  </span>
                ) : null}
              </div>
            );
          })}
          {productPins.map((pin, index) => {
            const pos = resolvePinPosition(pin.coords, mapBounds, index + 4);
            return (
              <div
                key={`product-${pin.id}`}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2"
                style={pos}
                onMouseEnter={() => setHoveredId(pin.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.15)]" />
                {hoveredId === pin.id || focused?.id === pin.id ? (
                  <span className="rounded-full bg-background/90 px-3 py-1 text-xs shadow-sm">
                    {pin.name}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function groupByDistance<T>(
  items: T[],
  getDistance: (item: T) => number | null,
  buckets: Array<{ label: string; min: number; max: number }>
) {
  const groups = buckets.map((bucket) => ({ label: bucket.label, items: [] as Array<T & { _distanceKm: number }> }));
  items.forEach((item) => {
    const distance = getDistance(item);
    if (distance == null || !Number.isFinite(distance)) return;
    const target = buckets.findIndex((bucket) => distance >= bucket.min && distance < bucket.max);
    if (target >= 0) {
      groups[target].items.push(Object.assign({}, item, { _distanceKm: distance }));
    }
  });
  groups.forEach((group) => {
    group.items.sort((a, b) => a._distanceKm - b._distanceKm);
  });
  return groups;
}

function resolveShopCoords(
  item: { _id?: string; slug?: string; domain?: string },
  locationMap: Map<string, { lat: number; lng: number }>
) {
  const key = String(item._id || "");
  return key ? locationMap.get(key) || null : null;
}

function resolveProductCoords(
  item: { shopId?: string },
  locationMap: Map<string, { lat: number; lng: number }>
) {
  const key = String(item.shopId || "");
  return key ? locationMap.get(key) || null : null;
}

function formatKm(distance: number | undefined) {
  if (distance == null || !Number.isFinite(distance)) return "";
  return `${distance.toFixed(1)} km`;
}

function computeBounds(
  pins: Array<{ coords: { lat: number; lng: number } }>
) {
  if (!pins.length) {
    return { minLat: userFallbackLat(), maxLat: userFallbackLat(), minLng: userFallbackLng(), maxLng: userFallbackLng() };
  }
  const lats = pins.map((pin) => pin.coords.lat);
  const lngs = pins.map((pin) => pin.coords.lng);
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}

function resolvePinPosition(
  coords: { lat: number; lng: number },
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  index: number
) {
  const latRange = bounds.maxLat - bounds.minLat;
  const lngRange = bounds.maxLng - bounds.minLng;
  const x = lngRange ? ((coords.lng - bounds.minLng) / lngRange) * 100 : 10 + index * 6;
  const y = latRange ? 100 - ((coords.lat - bounds.minLat) / latRange) * 100 : 20 + index * 6;
  return { left: `${Math.min(92, Math.max(4, x))}%`, top: `${Math.min(92, Math.max(4, y))}%` };
}

function userFallbackLat() {
  return 0;
}

function userFallbackLng() {
  return 0;
}

function sortShops(
  shops: Array<{ _id?: string; name?: string; slug?: string; domain?: string; ratingAverage?: number; distanceKm?: number | null; trustScore?: number | null }>,
  userLocation: { lat: number; lng: number } | null,
  distance: number,
  sort: "nearest" | "rating",
  locationMap: Map<string, { lat: number; lng: number }>,
  etaSettings: EtaSettings
) {
  const enriched = shops.map((shop) => {
    const id = String(shop._id || shop.slug || shop.domain || "");
    const fallbackRating = 3.8 + (hashCode(id) % 12) / 10;
    const rating = Number(shop.ratingAverage ?? fallbackRating);
    const isOpen = hashCode(id) % 2 === 0;
    let distanceKm: number | undefined;
    if (userLocation) {
      const coords = locationMap.get(String(shop._id || ""));
      if (coords) {
        distanceKm = getDistanceKm(userLocation, coords);
      }
    }
    if (shop.distanceKm !== undefined && shop.distanceKm !== null) {
      distanceKm = Number(shop.distanceKm);
    }
    const etaMinutes = distanceKm !== undefined
      ? Math.max(
          etaSettings.minEta,
          Math.round(
            distanceKm * etaSettings.basePerKm +
              bracketMinutes(distanceKm, etaSettings.trafficFactors) +
              bracketMinutes(distanceKm, etaSettings.distanceBrackets)
          )
        )
      : etaSettings.fallbackEta;
    return { ...shop, rating, distanceKm, etaMinutes, isOpen };
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

function bracketMinutes(distanceKm: number, brackets: Array<{ maxDistanceKm: number; minutes: number }>) {
  const sorted = [...brackets].sort((a, b) => a.maxDistanceKm - b.maxDistanceKm);
  const match = sorted.find((row) => distanceKm <= row.maxDistanceKm);
  return match ? match.minutes : sorted[sorted.length - 1]?.minutes || 0;
}

function normalizeBrackets(
  brackets: Array<{ maxDistanceKm?: number; minutes?: number }> | undefined,
  fallback: Array<{ maxDistanceKm: number; minutes: number }>
) {
  if (!Array.isArray(brackets) || !brackets.length) return fallback;
  const normalized = brackets
    .map((row) => ({
      maxDistanceKm: Number(row.maxDistanceKm),
      minutes: Number(row.minutes),
    }))
    .filter((row) => Number.isFinite(row.maxDistanceKm) && Number.isFinite(row.minutes))
    .sort((a, b) => a.maxDistanceKm - b.maxDistanceKm);
  return normalized.length ? normalized : fallback;
}
