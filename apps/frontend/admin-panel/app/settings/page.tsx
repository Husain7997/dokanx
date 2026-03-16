"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, CardDescription, CardTitle, Input } from "@dokanx/ui";

import { getEtaSettings, updateEtaSettings } from "@/lib/admin-runtime-api";

type EtaBracket = { maxDistanceKm: number; minutes: number };

const defaultTraffic = [
  { maxDistanceKm: 2, minutes: 8 },
  { maxDistanceKm: 5, minutes: 12 },
  { maxDistanceKm: 10, minutes: 18 },
  { maxDistanceKm: 999, minutes: 24 },
];

const defaultDistance = [
  { maxDistanceKm: 2, minutes: 5 },
  { maxDistanceKm: 5, minutes: 8 },
  { maxDistanceKm: 10, minutes: 12 },
  { maxDistanceKm: 999, minutes: 18 },
];

export default function SettingsPage() {
  const [basePerKm, setBasePerKm] = useState(10);
  const [minEta, setMinEta] = useState(15);
  const [fallbackEta, setFallbackEta] = useState(45);
  const [trafficFactors, setTrafficFactors] = useState<EtaBracket[]>(defaultTraffic);
  const [distanceBrackets, setDistanceBrackets] = useState<EtaBracket[]>(defaultDistance);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await getEtaSettings();
        if (!active) return;
        const data = response.data || {};
        setBasePerKm(Number(data.basePerKm ?? 10));
        setMinEta(Number(data.minEta ?? 15));
        setFallbackEta(Number(data.fallbackEta ?? 45));
        setTrafficFactors(
          Array.isArray(data.trafficFactors) && data.trafficFactors.length
            ? (data.trafficFactors as EtaBracket[])
            : defaultTraffic
        );
        setDistanceBrackets(
          Array.isArray(data.distanceBrackets) && data.distanceBrackets.length
            ? (data.distanceBrackets as EtaBracket[])
            : defaultDistance
        );
      } catch (err) {
        if (!active) return;
        setStatus(err instanceof Error ? err.message : "Unable to load ETA settings.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const sortedTraffic = useMemo(() => normalizeBrackets(trafficFactors), [trafficFactors]);
  const sortedDistance = useMemo(() => normalizeBrackets(distanceBrackets), [distanceBrackets]);

  async function handleSave() {
    setSaving(true);
    setStatus(null);
    try {
      await updateEtaSettings({
        basePerKm,
        minEta,
        fallbackEta,
        trafficFactors: sortedTraffic,
        distanceBrackets: sortedDistance,
      });
      setStatus("ETA settings saved.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Unable to save ETA settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="dx-display text-3xl">ETA Settings</h1>
        <p className="text-sm text-muted-foreground">Tune delivery ETA thresholds used in search results.</p>
      </div>

      <Card>
        <CardTitle>Base timing</CardTitle>
        <CardDescription className="mt-2">Adjust the base ETA calculation values.</CardDescription>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="grid gap-2 text-xs text-muted-foreground">
            Base minutes per km
            <Input value={String(basePerKm)} onChange={(event) => setBasePerKm(Number(event.target.value))} />
          </label>
          <label className="grid gap-2 text-xs text-muted-foreground">
            Minimum ETA
            <Input value={String(minEta)} onChange={(event) => setMinEta(Number(event.target.value))} />
          </label>
          <label className="grid gap-2 text-xs text-muted-foreground">
            Fallback ETA
            <Input value={String(fallbackEta)} onChange={(event) => setFallbackEta(Number(event.target.value))} />
          </label>
        </div>
      </Card>

      <Card>
        <CardTitle>Traffic factors</CardTitle>
        <CardDescription className="mt-2">Extra minutes added based on distance brackets.</CardDescription>
        <EtaBracketEditor value={trafficFactors} onChange={setTrafficFactors} />
      </Card>

      <Card>
        <CardTitle>Distance brackets</CardTitle>
        <CardDescription className="mt-2">Fixed minutes added per distance range.</CardDescription>
        <EtaBracketEditor value={distanceBrackets} onChange={setDistanceBrackets} />
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save settings"}
        </Button>
        {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
      </div>
    </div>
  );
}

function EtaBracketEditor({
  value,
  onChange,
}: {
  value: EtaBracket[];
  onChange: (next: EtaBracket[]) => void;
}) {
  return (
    <div className="mt-4 grid gap-3">
      {value.map((row, index) => (
        <div key={`${row.maxDistanceKm}-${index}`} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
          <Input
            value={String(row.maxDistanceKm)}
            onChange={(event) => {
              const next = [...value];
              next[index] = { ...next[index], maxDistanceKm: Number(event.target.value) };
              onChange(next);
            }}
            placeholder="Max distance (km)"
          />
          <Input
            value={String(row.minutes)}
            onChange={(event) => {
              const next = [...value];
              next[index] = { ...next[index], minutes: Number(event.target.value) };
              onChange(next);
            }}
            placeholder="Minutes"
          />
          <Button variant="secondary" onClick={() => onChange(value.filter((_, idx) => idx !== index))}>
            Remove
          </Button>
        </div>
      ))}
      <Button
        variant="secondary"
        className="w-fit"
        onClick={() => onChange([...value, { maxDistanceKm: 999, minutes: 10 }])}
      >
        Add bracket
      </Button>
    </div>
  );
}

function normalizeBrackets(rows: EtaBracket[]) {
  return [...rows]
    .map((row) => ({
      maxDistanceKm: Number(row.maxDistanceKm),
      minutes: Number(row.minutes),
    }))
    .filter((row) => Number.isFinite(row.maxDistanceKm) && Number.isFinite(row.minutes))
    .sort((a, b) => a.maxDistanceKm - b.maxDistanceKm);
}
