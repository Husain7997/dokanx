"use client";

import { useEffect, useMemo, useState } from "react";
import { AnalyticsCards, Card, CardDescription, CardTitle } from "@dokanx/ui";

import { listMarketplaceApps } from "@/lib/runtime-api";

type MarketplaceApp = {
  _id?: string;
  name?: string;
  tagline?: string;
  description?: string;
  category?: string;
};

export default function AppsPage() {
  const [apps, setApps] = useState<MarketplaceApp[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await listMarketplaceApps();
        if (!active) return;
        setApps(Array.isArray(response.data) ? (response.data as MarketplaceApp[]) : []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load marketplace apps.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const cards = useMemo(() => {
    return [
      { label: "Available apps", value: String(apps.length), meta: "Marketplace listings" },
      { label: "Installed", value: "0", meta: "Installation flow coming soon" },
      { label: "Categories", value: String(new Set(apps.map((app) => app.category || "General")).size), meta: "Active verticals" },
      { label: "Reviews", value: "0", meta: "Public feedback feed" },
    ];
  }, [apps]);

  return (
    <div className="grid gap-6">
      <AnalyticsCards items={cards} />
      {error ? (
        <Card>
          <CardTitle>Marketplace</CardTitle>
          <CardDescription className="mt-2">{error}</CardDescription>
        </Card>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {apps.map((app) => (
          <Card key={String(app._id || app.name)}>
            <CardTitle>{app.name || "Marketplace app"}</CardTitle>
            <CardDescription className="mt-2">
              {app.tagline || app.description || "No description provided yet."}
            </CardDescription>
            <p className="mt-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {app.category || "General"}
            </p>
          </Card>
        ))}
        {!apps.length && !error ? (
          <Card>
            <CardTitle>No apps published</CardTitle>
            <CardDescription className="mt-2">
              Ask your developers to publish apps in the DokanX marketplace.
            </CardDescription>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
