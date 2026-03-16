"use client";

import { useEffect, useState } from "react";

import { listMarketplaceApps, publishMarketplaceApp } from "@/lib/developer-runtime-api";

type Listing = {
  _id?: string;
  name?: string;
  tagline?: string;
  description?: string;
  categories?: string[];
  appId?: string;
};

export default function MarketplacePage() {
  const [apps, setApps] = useState<Listing[]>([]);
  const [appId, setAppId] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState("");

  async function refresh() {
    const response = await listMarketplaceApps();
    setApps((response.data as Listing[]) || []);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handlePublish() {
    await publishMarketplaceApp({
      appId,
      tagline,
      description,
      categories: categories.split(",").map((item) => item.trim()).filter(Boolean),
    });
    setAppId("");
    setTagline("");
    setDescription("");
    setCategories("");
    await refresh();
  }

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Marketplace</p>
        <h1 className="dx-display text-3xl">App Marketplace</h1>
        <p className="text-sm text-muted-foreground">Publish and explore third-party apps.</p>
      </div>

      <div className="grid gap-4 rounded-3xl border border-white/40 bg-white/70 p-6">
        <p className="text-sm font-semibold text-foreground">Publish an app</p>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="rounded-xl border border-white/60 bg-white px-3 py-2 text-sm"
            placeholder="OAuth app id"
            value={appId}
            onChange={(event) => setAppId(event.target.value)}
          />
          <input
            className="rounded-xl border border-white/60 bg-white px-3 py-2 text-sm"
            placeholder="Tagline"
            value={tagline}
            onChange={(event) => setTagline(event.target.value)}
          />
          <input
            className="rounded-xl border border-white/60 bg-white px-3 py-2 text-sm md:col-span-2"
            placeholder="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <input
            className="rounded-xl border border-white/60 bg-white px-3 py-2 text-sm md:col-span-2"
            placeholder="Categories (comma separated)"
            value={categories}
            onChange={(event) => setCategories(event.target.value)}
          />
        </div>
        <button
          className="w-fit rounded-full border border-white/60 bg-black px-4 py-2 text-xs font-semibold text-white"
          onClick={handlePublish}
        >
          Publish app
        </button>
      </div>

      <div className="grid gap-3">
        {apps.map((app) => (
          <div key={app._id} className="rounded-3xl border border-white/40 bg-white/70 p-6">
            <p className="text-sm font-semibold text-foreground">{app.name}</p>
            <p className="text-xs text-muted-foreground">{app.tagline}</p>
            <p className="text-xs text-muted-foreground">{app.description}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Categories: {(app.categories || []).join(", ")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
