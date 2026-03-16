"use client";

import { useEffect, useState } from "react";

import { createWebhook, deleteWebhook, listWebhooks } from "@/lib/developer-runtime-api";

type Webhook = {
  _id?: string;
  url?: string;
  events?: string[];
  status?: string;
};

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState("order.created product.updated");
  const [secret, setSecret] = useState<string | null>(null);

  async function refresh() {
    const response = await listWebhooks();
    setWebhooks((response.data as Webhook[]) || []);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleCreate() {
    const response = await createWebhook({
      url,
      events: events.split(" ").map((item) => item.trim()).filter(Boolean),
    });
    setSecret(response.secret || null);
    setUrl("");
    setEvents("order.created product.updated");
    await refresh();
  }

  async function handleDelete(webhookId?: string) {
    if (!webhookId) return;
    await deleteWebhook(webhookId);
    await refresh();
  }

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Developer</p>
        <h1 className="dx-display text-3xl">Webhooks</h1>
        <p className="text-sm text-muted-foreground">Subscribe to commerce events and receive callbacks.</p>
      </div>

      <div className="grid gap-4 rounded-3xl border border-white/40 bg-white/70 p-6">
        <p className="text-sm font-semibold text-foreground">Create webhook</p>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="rounded-xl border border-white/60 bg-white px-3 py-2 text-sm md:col-span-2"
            placeholder="Webhook URL"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
          <input
            className="rounded-xl border border-white/60 bg-white px-3 py-2 text-sm md:col-span-2"
            placeholder="Events (space separated)"
            value={events}
            onChange={(event) => setEvents(event.target.value)}
          />
        </div>
        <button
          className="w-fit rounded-full border border-white/60 bg-black px-4 py-2 text-xs font-semibold text-white"
          onClick={handleCreate}
        >
          Save webhook
        </button>
        {secret ? <p className="text-xs text-emerald-700">Save secret: {secret}</p> : null}
      </div>

      <div className="grid gap-3">
        {webhooks.map((hook) => (
          <div key={hook._id} className="rounded-3xl border border-white/40 bg-white/70 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">{hook.url}</p>
                <p className="text-xs text-muted-foreground">
                  Events: {(hook.events || []).join(" ")}
                </p>
              </div>
              <button
                className="rounded-full border border-white/60 bg-white px-4 py-2 text-xs font-semibold text-foreground"
                onClick={() => handleDelete(hook._id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
