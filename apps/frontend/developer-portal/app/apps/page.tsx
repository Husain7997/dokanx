"use client";

import { useEffect, useState } from "react";

import { createApp, deleteApp, listApps } from "@/lib/developer-runtime-api";

type OAuthApp = {
  _id?: string;
  name?: string;
  description?: string;
  clientId?: string;
  redirectUris?: string[];
  scopes?: string[];
};

export default function AppsPage() {
  const [apps, setApps] = useState<OAuthApp[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [redirectUris, setRedirectUris] = useState("");
  const [scopes, setScopes] = useState("read_products read_orders");
  const [status, setStatus] = useState<string | null>(null);

  async function refresh() {
    const response = await listApps();
    setApps((response.data as OAuthApp[]) || []);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleCreate() {
    setStatus(null);
    const response = await createApp({
      name,
      description,
      redirectUris: redirectUris.split(",").map((item) => item.trim()).filter(Boolean),
      scopes: scopes.split(" ").map((item) => item.trim()).filter(Boolean),
    });
    setStatus(`App created. Save secret now: ${response.clientSecret || ""}`);
    setName("");
    setDescription("");
    setRedirectUris("");
    setScopes("read_products read_orders");
    await refresh();
  }

  async function handleDelete(appId?: string) {
    if (!appId) return;
    await deleteApp(appId);
    await refresh();
  }

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Developer</p>
        <h1 className="dx-display text-3xl">Apps</h1>
        <p className="text-sm text-muted-foreground">Register OAuth apps and manage client credentials.</p>
      </div>

      <div className="grid gap-4 rounded-3xl border border-white/40 bg-white/70 p-6">
        <p className="text-sm font-semibold text-foreground">Create new app</p>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="rounded-xl border border-white/60 bg-white px-3 py-2 text-sm"
            placeholder="App name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <input
            className="rounded-xl border border-white/60 bg-white px-3 py-2 text-sm"
            placeholder="Short description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <input
            className="rounded-xl border border-white/60 bg-white px-3 py-2 text-sm md:col-span-2"
            placeholder="Redirect URIs (comma separated)"
            value={redirectUris}
            onChange={(event) => setRedirectUris(event.target.value)}
          />
          <input
            className="rounded-xl border border-white/60 bg-white px-3 py-2 text-sm md:col-span-2"
            placeholder="Scopes (space separated)"
            value={scopes}
            onChange={(event) => setScopes(event.target.value)}
          />
        </div>
        <button
          className="w-fit rounded-full border border-white/60 bg-black px-4 py-2 text-xs font-semibold text-white"
          onClick={handleCreate}
        >
          Create app
        </button>
        {status ? <p className="text-xs text-emerald-700">{status}</p> : null}
      </div>

      <div className="grid gap-3">
        {apps.map((app) => (
          <div key={app._id} className="rounded-3xl border border-white/40 bg-white/70 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">{app.name}</p>
                <p className="text-xs text-muted-foreground">{app.description}</p>
                <p className="text-xs text-muted-foreground">Client ID: {app.clientId}</p>
              </div>
              <button
                className="rounded-full border border-white/60 bg-white px-4 py-2 text-xs font-semibold text-foreground"
                onClick={() => handleDelete(app._id)}
              >
                Delete
              </button>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              Redirect URIs: {(app.redirectUris || []).join(", ") || "None"}
            </div>
            <div className="text-xs text-muted-foreground">Scopes: {(app.scopes || []).join(" ") || "None"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
