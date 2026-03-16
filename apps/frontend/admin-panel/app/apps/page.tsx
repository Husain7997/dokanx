"use client";

import { useEffect, useState } from "react";
import { Card, CardDescription, CardTitle } from "@dokanx/ui";

import { listMarketplaceApps } from "@/lib/admin-runtime-api";

type MarketplaceApp = {
  _id?: string;
  name?: string;
  tagline?: string;
  description?: string;
  category?: string;
};

export const dynamic = "force-dynamic";

export default function Page() {
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

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="dx-display text-3xl">Apps</h1>
        <p className="text-sm text-muted-foreground">Marketplace apps and integrations</p>
      </div>
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
              {app.tagline || app.description || "No description available."}
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
              Marketplace apps will appear here once developers publish.
            </CardDescription>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
