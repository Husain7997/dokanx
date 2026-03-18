"use client";

import { useEffect, useState } from "react";
import { Badge, Card, CardDescription, CardTitle } from "@dokanx/ui";

import { listAdminApps } from "@/lib/admin-runtime-api";

type MarketplaceApp = {
  _id?: string;
  appId?: string;
  name?: string;
  tagline?: string;
  description?: string;
  categories?: string[];
  status?: string;
  appStatus?: string;
  installations?: number;
  sandboxMode?: boolean;
  installationStatus?: Array<{
    _id?: string;
    shopId?: string;
    status?: string;
    sandboxMode?: boolean;
  }>;
};

export const dynamic = "force-dynamic";

export default function Page() {
  const [apps, setApps] = useState<MarketplaceApp[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await listAdminApps();
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
        <p className="text-sm text-muted-foreground">Marketplace inventory, install state, and sandbox readiness.</p>
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
            <div className="flex items-start justify-between gap-3">
              <CardTitle>{app.name || "Marketplace app"}</CardTitle>
              <Badge variant={app.sandboxMode ? "warning" : "neutral"}>
                {app.sandboxMode ? "Sandbox" : "Live"}
              </Badge>
            </div>
            <CardDescription className="mt-2">
              {app.tagline || app.description || "No description available."}
            </CardDescription>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <Badge variant="neutral">{app.status || "PUBLISHED"}</Badge>
              <Badge variant="neutral">{app.appStatus || "ACTIVE"}</Badge>
              <Badge variant="success">{app.installations || 0} installs</Badge>
            </div>
            <p className="mt-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {(app.categories || []).length ? (app.categories || []).join(" • ") : "General"}
            </p>
            {!!app.installationStatus?.length ? (
              <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                {app.installationStatus.slice(0, 3).map((item) => (
                  <div key={String(item._id || item.shopId)} className="flex items-center justify-between gap-2">
                    <span>Shop {String(item.shopId || "unknown")}</span>
                    <span>
                      {item.status || "INSTALLED"}
                      {item.sandboxMode ? " • sandbox" : ""}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>
        ))}
        {!apps.length && !error ? (
          <Card>
            <CardTitle>No apps published</CardTitle>
            <CardDescription className="mt-2">
              Marketplace apps will appear here once developers publish and install them.
            </CardDescription>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
