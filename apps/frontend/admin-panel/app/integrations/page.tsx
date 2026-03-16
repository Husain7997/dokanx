"use client";

import { useEffect, useState } from "react";

import { listIntegrations, saveIntegration, testIntegration } from "@/lib/admin-integrations-api";

type Integration = {
  provider: string;
  status?: string;
  publicData?: Record<string, unknown>;
  secretPreview?: string;
};

const providers = ["bkash", "nagad", "stripe", "pathao", "paperfly"];

export default function IntegrationsPage() {
  const [items, setItems] = useState<Integration[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  async function refresh() {
    const response = await listIntegrations();
    setItems((response.data as Integration[]) || []);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleSave(provider: string, secret: string, statusValue: string, publicKey: string) {
    await saveIntegration({
      provider,
      publicData: publicKey ? { key: publicKey } : undefined,
      secret: secret || undefined,
      status: statusValue,
    });
    setStatus(`Saved ${provider}`);
    await refresh();
  }

  async function handleTest(provider: string) {
    const response = await testIntegration(provider);
    const result = response.data as { message?: string } | undefined;
    setStatus(result?.message ? `${provider}: ${result.message}` : `${provider}: test ok`);
  }

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="dx-display text-3xl">Integrations</h1>
        <p className="text-sm text-muted-foreground">Configure payment gateways and shipping carriers.</p>
      </div>

      <div className="grid gap-4">
        {providers.map((provider) => {
          const current = items.find((item) => item.provider === provider);
          return (
            <IntegrationCard
              key={provider}
              provider={provider}
              current={current}
              onSave={handleSave}
              onTest={handleTest}
            />
          );
        })}
      </div>

      {status ? <p className="text-xs text-emerald-700">{status}</p> : null}
    </div>
  );
}

function IntegrationCard({
  provider,
  current,
  onSave,
  onTest,
}: {
  provider: string;
  current?: Integration;
  onSave: (provider: string, secret: string, status: string, publicKey: string) => void;
  onTest: (provider: string) => void;
}) {
  const [secret, setSecret] = useState("");
  const [publicKey, setPublicKey] = useState(String(current?.publicData?.key || current?.publicData?.appKey || current?.publicData?.merchantId || current?.publicData?.apiKey || ""));
  const [statusValue, setStatusValue] = useState(current?.status || "ACTIVE");

  return (
    <div className="grid gap-3 rounded-3xl border border-white/40 bg-white/70 p-6">
      <div>
        <p className="text-sm font-semibold text-foreground">{provider.toUpperCase()}</p>
        <p className="text-xs text-muted-foreground">Current secret: {current?.secretPreview || "Not set"}</p>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <input
          className="rounded-xl border border-white/60 bg-white px-3 py-2 text-sm"
          placeholder="Public key / Merchant ID"
          value={publicKey}
          onChange={(event) => setPublicKey(event.target.value)}
        />
        <input
          className="rounded-xl border border-white/60 bg-white px-3 py-2 text-sm"
          placeholder="New secret"
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
        />
        <select
          className="rounded-xl border border-white/60 bg-white px-3 py-2 text-sm"
          value={statusValue}
          onChange={(event) => setStatusValue(event.target.value)}
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="DISABLED">DISABLED</option>
        </select>
      </div>
      <button
        className="w-fit rounded-full border border-white/60 bg-black px-4 py-2 text-xs font-semibold text-white"
        onClick={() => onSave(provider, secret, statusValue, publicKey)}
      >
        Save
      </button>
      <button
        className="w-fit rounded-full border border-white/60 bg-white px-4 py-2 text-xs font-semibold text-foreground"
        onClick={() => onTest(provider)}
      >
        Test connection
      </button>
    </div>
  );
}
