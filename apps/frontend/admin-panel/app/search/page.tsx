"use client";

import { useEffect, useState } from "react";

import { getSearchStatus, triggerDeltaReindex, triggerFullReindex } from "@/lib/admin-search-api";

export default function SearchAdminPage() {
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function refresh() {
    const response = await getSearchStatus();
    setLastRunAt(response.data?.lastRunAt || null);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleFullReindex() {
    const response = await triggerFullReindex();
    setStatus(response.message || "Full reindex started");
    await refresh();
  }

  async function handleDeltaReindex() {
    const response = await triggerDeltaReindex();
    setStatus(response.message || "Delta reindex done");
    await refresh();
  }

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="dx-display text-3xl">Search Index</h1>
        <p className="text-sm text-muted-foreground">Monitor and trigger search indexing jobs.</p>
      </div>

      <div className="grid gap-4 rounded-3xl border border-white/40 bg-white/70 p-6">
        <p className="text-sm font-semibold text-foreground">Index status</p>
        <p className="text-xs text-muted-foreground">
          Last delta run: {lastRunAt ? new Date(lastRunAt).toLocaleString() : "Not yet"}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-full border border-white/60 bg-black px-4 py-2 text-xs font-semibold text-white"
            onClick={handleFullReindex}
          >
            Force full reindex
          </button>
          <button
            className="rounded-full border border-white/60 bg-white px-4 py-2 text-xs font-semibold text-foreground"
            onClick={handleDeltaReindex}
          >
            Run delta reindex
          </button>
        </div>
        {status ? <p className="text-xs text-emerald-700">{status}</p> : null}
      </div>
    </div>
  );
}
