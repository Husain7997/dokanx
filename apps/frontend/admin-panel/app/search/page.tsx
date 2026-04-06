"use client";

import { useEffect, useState } from "react";

import { AdminEtaHealth } from "@/components/admin-eta-health";
import { getSearchConversion, getSearchNoResults, getSearchStatus, getSearchTrending, triggerDeltaReindex, triggerFullReindex } from "@/lib/admin-search-api";

export default function SearchAdminPage() {
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [totalDocs, setTotalDocs] = useState<number | null>(null);
  const [logs, setLogs] = useState<Array<{ _id?: string; level?: string; message?: string; createdAt?: string }>>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [trending, setTrending] = useState<Array<{ query?: string; count?: number }>>([]);
  const [noResults, setNoResults] = useState<Array<{ query?: string; count?: number }>>([]);
  const [conversion, setConversion] = useState<{
    totalSearches?: number;
    addToCart?: number;
    checkout?: number;
    addToCartRate?: number;
    checkoutRate?: number;
  } | null>(null);

  async function refresh() {
    const response = await getSearchStatus();
    setLastRunAt(response.data?.lastRunAt || null);
    setTotalDocs(typeof response.data?.totalDocs === "number" ? response.data?.totalDocs : null);
    setLogs((response.data?.logs as typeof logs) || []);
  }

  useEffect(() => {
    void refresh();
    void loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      const [trendingResponse, noResultsResponse, conversionResponse] = await Promise.all([
        getSearchTrending({ days: 7, limit: 8 }),
        getSearchNoResults({ days: 30, limit: 8 }),
        getSearchConversion({ days: 30 }),
      ]);
      setTrending(trendingResponse.data || []);
      setNoResults(noResultsResponse.data || []);
      setConversion(conversionResponse.data || null);
    } catch {
      setTrending([]);
      setNoResults([]);
      setConversion(null);
    }
  }

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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-4 rounded-3xl border border-white/40 bg-white/70 p-6">
          <p className="text-sm font-semibold text-foreground">Index status</p>
          <p className="text-xs text-muted-foreground">
            Last delta run: {lastRunAt ? new Date(lastRunAt).toLocaleString() : "Not yet"}
          </p>
          <p className="text-xs text-muted-foreground">Indexed documents: {totalDocs ?? "Unknown"}</p>
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
        <AdminEtaHealth />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-3 rounded-3xl border border-white/40 bg-white/70 p-6">
          <p className="text-sm font-semibold text-foreground">Trending searches (7 days)</p>
          <div className="grid gap-2 text-xs text-muted-foreground">
            {trending.length ? (
              trending.map((item) => (
                <div key={item.query} className="flex items-center justify-between gap-4">
                  <span className="font-medium text-foreground">{item.query}</span>
                  <span>{item.count ?? 0} searches</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Trending search demand will appear here once shoppers build enough query volume.</p>
            )}
          </div>
        </div>
        <div className="grid gap-3 rounded-3xl border border-white/40 bg-white/70 p-6">
          <p className="text-sm font-semibold text-foreground">No-results keywords (30 days)</p>
          <div className="grid gap-2 text-xs text-muted-foreground">
            {noResults.length ? (
              noResults.map((item) => (
                <div key={item.query} className="flex items-center justify-between gap-4">
                  <span className="font-medium text-foreground">{item.query}</span>
                  <span>{item.count ?? 0} misses</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No-result keywords will appear here once the search layer captures enough missed intent.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 rounded-3xl border border-white/40 bg-white/70 p-6">
        <p className="text-sm font-semibold text-foreground">Search conversion (30 days)</p>
        <div className="mt-2 grid gap-2 text-xs text-muted-foreground md:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em]">Searches</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{conversion?.totalSearches ?? 0}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em]">Add to cart</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{conversion?.addToCart ?? 0}</p>
            <p>{formatRate(conversion?.addToCartRate)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em]">Checkout</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{conversion?.checkout ?? 0}</p>
            <p>{formatRate(conversion?.checkoutRate)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em]">Drop-off</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {conversion?.totalSearches
                ? conversion.totalSearches - (conversion.checkout ?? 0)
                : 0}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 rounded-3xl border border-white/40 bg-white/70 p-6">
        <p className="text-sm font-semibold text-foreground">Recent logs</p>
        <div className="grid gap-2 text-xs text-muted-foreground">
          {logs.length ? (
            logs.map((log) => (
              <div key={log._id} className="flex flex-wrap justify-between gap-2">
                <span>{log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}</span>
                <span>{log.level}</span>
                <span>{log.message}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Index activity logs will appear here after the next sync or reindex run.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function formatRate(value?: number) {
  if (!value || Number.isNaN(value)) return "0%";
  return `${(value * 100).toFixed(1)}%`;
}

