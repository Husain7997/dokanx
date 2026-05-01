"use client";

import { useEffect, useState } from "react";
import { Button, Card, CardDescription, CardTitle } from "@dokanx/ui";

import { formatOpsLag } from "@/lib/admin-ops-health";
import { getOpsSettings } from "@/lib/admin-runtime-api";
import type { OpsThresholdSettings } from "@/config/ops-thresholds";

export function AdminOpsThresholds() {
  const [settings, setSettings] = useState<Partial<OpsThresholdSettings> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    setError(null);
    try {
      const response = await getOpsSettings();
      setSettings(response?.data || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load ops thresholds.");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <CardTitle>Active ops thresholds</CardTitle>
          <CardDescription className="mt-2">
            Current watch and critical boundaries used by admin runtime views.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => void load()} disabled={refreshing}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href="/security">Tune</a>
          </Button>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-border/60 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Watch lag</p>
          <p className="mt-2 font-semibold text-foreground">{formatOpsLag(settings?.lagWatchMs)}</p>
        </div>
        <div className="rounded-2xl border border-border/60 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Critical lag</p>
          <p className="mt-2 font-semibold text-foreground">{formatOpsLag(settings?.lagCriticalMs)}</p>
        </div>
        <div className="rounded-2xl border border-border/60 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Queue waiting</p>
          <p className="mt-2 font-semibold text-foreground">{settings?.queueWaitingWatch ?? 20}</p>
        </div>
        <div className="rounded-2xl border border-border/60 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Queue active</p>
          <p className="mt-2 font-semibold text-foreground">{settings?.queueActiveWatch ?? 10}</p>
        </div>
        <div className="rounded-2xl border border-border/60 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Outbox pending</p>
          <p className="mt-2 font-semibold text-foreground">{settings?.outboxPendingWatch ?? 50}</p>
        </div>
      </div>
    </Card>
  );
}
