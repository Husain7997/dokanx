"use client";

import { useEffect, useState } from "react";

import { getUsageAnalytics } from "@/lib/developer-runtime-api";

type UsageRow = {
  _id?: { date?: string; path?: string; method?: string };
  count?: number;
};

export default function AnalyticsPage() {
  const [rows, setRows] = useState<UsageRow[]>([]);

  useEffect(() => {
    async function load() {
      const response = await getUsageAnalytics();
      setRows((response.data as UsageRow[]) || []);
    }
    void load();
  }, []);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Developer</p>
        <h1 className="dx-display text-3xl">Analytics</h1>
        <p className="text-sm text-muted-foreground">Daily usage metrics for your public API keys.</p>
      </div>

      <div className="rounded-3xl border border-white/40 bg-white/70 p-6">
        <div className="grid gap-3 text-xs text-muted-foreground">
          {rows.length ? (
            rows.map((row, index) => (
              <div key={`${row._id?.date || ""}-${index}`} className="flex flex-wrap justify-between gap-2">
                <span>{row._id?.date || "N/A"}</span>
                <span>{row._id?.method} {row._id?.path}</span>
                <span>{row.count ?? 0} calls</span>
              </div>
            ))
          ) : (
            <p>No usage yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
