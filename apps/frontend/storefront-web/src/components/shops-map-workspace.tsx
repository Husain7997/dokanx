"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, CardDescription, CardTitle, Input } from "@dokanx/ui";

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

type ShopsMapWorkspaceProps = {
  initialShops: ShopDirectoryItem[];
};

function uniqueValues(rows: ShopDirectoryItem[], key: keyof ShopDirectoryItem) {
  const values = rows
    .map((row) => row[key])
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  return Array.from(new Set(values)).sort();
}

export function ShopsMapWorkspace({ initialShops }: ShopsMapWorkspaceProps) {
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("all");
  const [thana, setThana] = useState("all");
  const [market, setMarket] = useState("all");
  const [category, setCategory] = useState("all");

  const districts = useMemo(() => uniqueValues(initialShops, "district"), [initialShops]);
  const thanas = useMemo(() => uniqueValues(initialShops, "thana"), [initialShops]);
  const markets = useMemo(() => uniqueValues(initialShops, "market"), [initialShops]);
  const categories = useMemo(() => uniqueValues(initialShops, "category"), [initialShops]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return initialShops.filter((shop) => {
      if (district !== "all" && shop.district !== district) return false;
      if (thana !== "all" && shop.thana !== thana) return false;
      if (market !== "all" && shop.market !== market) return false;
      if (category !== "all" && shop.category !== category) return false;
      if (!needle) return true;
      return (
        shop.name.toLowerCase().includes(needle) ||
        shop.description.toLowerCase().includes(needle) ||
        shop.address.toLowerCase().includes(needle)
      );
    });
  }, [initialShops, query, district, thana, market, category]);

  const mapBounds = useMemo(() => {
    const lats = initialShops.map((shop) => shop.lat);
    const lngs = initialShops.map((shop) => shop.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return { minLat, maxLat, minLng, maxLng };
  }, [initialShops]);

  function getPinPosition(shop: ShopDirectoryItem, index: number) {
    const { minLat, maxLat, minLng, maxLng } = mapBounds;
    const latRange = maxLat - minLat;
    const lngRange = maxLng - minLng;
    const x = lngRange ? ((shop.lng - minLng) / lngRange) * 100 : 10 + index * 12;
    const y = latRange ? 100 - ((shop.lat - minLat) / latRange) * 100 : 20 + index * 12;
    return { left: `${Math.min(92, Math.max(4, x))}%`, top: `${Math.min(92, Math.max(4, y))}%` };
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardTitle>Find shops near you</CardTitle>
        <CardDescription className="mt-2">
          Search by name, address, or browse by district, thana, market, and category.
        </CardDescription>
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,1fr))]">
          <Input
            placeholder="Search shops, addresses, or brands"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            className="h-11 rounded-full border border-border bg-background px-4 text-sm"
            value={district}
            onChange={(event) => setDistrict(event.target.value)}
          >
            <option value="all">All districts</option>
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
            <option value="all">All thanas</option>
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
            <option value="all">All markets</option>
            {markets.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            className="h-11 rounded-full border border-border bg-background px-4 text-sm"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_460px]">
        <div className="grid gap-4">
          {filtered.length ? (
            filtered.map((shop) => (
              <Card key={shop.slug} className="border-border/60 bg-card/70">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <CardTitle>{shop.name}</CardTitle>
                    <p className="mt-2 text-sm text-muted-foreground">{shop.description}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{shop.address}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={shop.verified ? "success" : "neutral"}>
                      {shop.verified ? "Verified" : "New"}
                    </Badge>
                    <span className="text-sm font-medium">{shop.rating} ★</span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="neutral">{shop.district}</Badge>
                  <Badge variant="neutral">{shop.thana}</Badge>
                  <Badge variant="neutral">{shop.market}</Badge>
                  <Badge variant="neutral">{shop.category}</Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button asChild>
                    <a href={`/shop/${shop.slug}`}>View shop</a>
                  </Button>
                  <Button variant="secondary">Show on map</Button>
                </div>
              </Card>
            ))
          ) : (
            <Card className="border-dashed border-border/70 bg-card/60">
              <CardTitle>No shops found</CardTitle>
              <CardDescription className="mt-2">
                Try removing a filter or searching with fewer keywords.
              </CardDescription>
            </Card>
          )}
        </div>

        <Card className="relative overflow-hidden border-border/60 bg-card/70">
          <CardTitle>Live map</CardTitle>
          <CardDescription className="mt-2">
            Map pins update as you filter shops.
          </CardDescription>
          <div className="relative mt-6 h-[520px] overflow-hidden rounded-3xl border border-border/60 bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.18),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.18),transparent_55%),linear-gradient(135deg,rgba(15,23,42,0.05),rgba(15,23,42,0.18))]">
            <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(transparent_23px,rgba(148,163,184,0.12)_24px),linear-gradient(90deg,transparent_23px,rgba(148,163,184,0.12)_24px)] [background-size:24px_24px]" />
            {filtered.map((shop, index) => {
              const pos = getPinPosition(shop, index);
              return (
                <div
                  key={`${shop.slug}-pin`}
                  className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2"
                  style={pos}
                >
                  <span className="h-3 w-3 rounded-full bg-primary shadow-[0_0_0_6px_rgba(59,130,246,0.15)]" />
                  <span className="rounded-full bg-background/90 px-3 py-1 text-xs shadow-sm">
                    {shop.name}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
