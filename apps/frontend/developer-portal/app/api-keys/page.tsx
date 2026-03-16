"use client";

import { useEffect, useState } from "react";

import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/developer-runtime-api";

type ApiKey = {
  _id?: string;
  name?: string;
  keyPreview?: string;
  permissions?: string[];
  usageLimit?: number | null;
  usageRemaining?: number | null;
  revokedAt?: string | null;
};

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState("Default key");
  const [permissions, setPermissions] = useState("read_products read_orders");
  const [usageLimit, setUsageLimit] = useState("");
  const [secret, setSecret] = useState<string | null>(null);

  async function refresh() {
    const response = await listApiKeys();
    setKeys((response.data as ApiKey[]) || []);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleCreate() {
    const limitValue = usageLimit ? Number(usageLimit) : null;
    const response = await createApiKey({
      name,
      permissions: permissions.split(" ").map((item) => item.trim()).filter(Boolean),
      usageLimit: Number.isFinite(limitValue) ? limitValue : null,
    });
    setSecret(response.secret || null);
    setName("Default key");
    setPermissions("read_products read_orders");
    setUsageLimit("");
    await refresh();
  }

  async function handleRevoke(keyId?: string) {
    if (!keyId) return;
    await revokeApiKey(keyId);
    await refresh();
  }

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Developer</p>
        <h1 className="dx-display text-3xl">API Keys</h1>
        <p className="text-sm text-muted-foreground">Generate keys and scope access to public APIs.</p>
      </div>

      <div className="grid gap-4 rounded-3xl border border-white/40 bg-white/70 p-6">
        <p className="text-sm font-semibold text-foreground">Create new API key</p>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="rounded-xl border border-white/60 bg-white px-3 py-2 text-sm"
            placeholder="Key name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <input
            className="rounded-xl border border-white/60 bg-white px-3 py-2 text-sm"
            placeholder="Scopes (space separated)"
            value={permissions}
            onChange={(event) => setPermissions(event.target.value)}
          />
          <input
            className="rounded-xl border border-white/60 bg-white px-3 py-2 text-sm"
            placeholder="Usage limit (optional)"
            value={usageLimit}
            onChange={(event) => setUsageLimit(event.target.value)}
          />
        </div>
        <button
          className="w-fit rounded-full border border-white/60 bg-black px-4 py-2 text-xs font-semibold text-white"
          onClick={handleCreate}
        >
          Generate key
        </button>
        {secret ? (
          <p className="text-xs text-emerald-700">Save this secret now: {secret}</p>
        ) : null}
      </div>

      <div className="grid gap-3">
        {keys.map((key) => (
          <div key={key._id} className="rounded-3xl border border-white/40 bg-white/70 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">{key.name}</p>
                <p className="text-xs text-muted-foreground">{key.keyPreview}</p>
                <p className="text-xs text-muted-foreground">
                  Scopes: {(key.permissions || []).join(" ")}
                </p>
              </div>
              <button
                className="rounded-full border border-white/60 bg-white px-4 py-2 text-xs font-semibold text-foreground"
                onClick={() => handleRevoke(key._id)}
              >
                Revoke
              </button>
            </div>
            {key.usageLimit !== null ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Usage remaining: {key.usageRemaining ?? 0} / {key.usageLimit}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
