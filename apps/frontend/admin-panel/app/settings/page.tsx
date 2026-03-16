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

const BASE_PER_KM_RANGE = { min: 1, max: 30 };
const MIN_ETA_RANGE = { min: 5, max: 120 };
const FALLBACK_ETA_RANGE = { min: 10, max: 240 };
const BRACKET_DISTANCE_RANGE = { min: 0.5, max: 200 };
const BRACKET_MINUTES_RANGE = { min: 0, max: 180 };

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
  const validation = useMemo(
    () => validateSettings({ basePerKm, minEta, fallbackEta, trafficFactors, distanceBrackets }),
    [basePerKm, minEta, fallbackEta, trafficFactors, distanceBrackets]
  );

  async function handleSave() {
    if (validation.errors.length) {
      setStatus(validation.errors[0]);
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      await updateEtaSettings({
        basePerKm: clampNumber(basePerKm, BASE_PER_KM_RANGE),
        minEta: clampNumber(minEta, MIN_ETA_RANGE),
        fallbackEta: clampNumber(fallbackEta, FALLBACK_ETA_RANGE),
        trafficFactors: normalizeBrackets(sanitizeBrackets(trafficFactors)),
        distanceBrackets: normalizeBrackets(sanitizeBrackets(distanceBrackets)),
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
            <Input
              type="number"
              inputMode="numeric"
              min={BASE_PER_KM_RANGE.min}
              max={BASE_PER_KM_RANGE.max}
              step="1"
              value={String(basePerKm)}
              onChange={(event) => setBasePerKm(toNumber(event.target.value, basePerKm))}
            />
            {validation.basePerKmError ? <span className="text-[11px] text-red-600">{validation.basePerKmError}</span> : null}
          </label>
          <label className="grid gap-2 text-xs text-muted-foreground">
            Minimum ETA
            <Input
              type="number"
              inputMode="numeric"
              min={MIN_ETA_RANGE.min}
              max={MIN_ETA_RANGE.max}
              step="1"
              value={String(minEta)}
              onChange={(event) => setMinEta(toNumber(event.target.value, minEta))}
            />
            {validation.minEtaError ? <span className="text-[11px] text-red-600">{validation.minEtaError}</span> : null}
          </label>
          <label className="grid gap-2 text-xs text-muted-foreground">
            Fallback ETA
            <Input
              type="number"
              inputMode="numeric"
              min={FALLBACK_ETA_RANGE.min}
              max={FALLBACK_ETA_RANGE.max}
              step="1"
              value={String(fallbackEta)}
              onChange={(event) => setFallbackEta(toNumber(event.target.value, fallbackEta))}
            />
            {validation.fallbackEtaError ? <span className="text-[11px] text-red-600">{validation.fallbackEtaError}</span> : null}
          </label>
        </div>
      </Card>

      <Card>
        <CardTitle>Traffic factors</CardTitle>
        <CardDescription className="mt-2">Extra minutes added based on distance brackets.</CardDescription>
        <EtaBracketEditor
          value={trafficFactors}
          onChange={setTrafficFactors}
          distanceError={validation.distanceError}
          minutesError={validation.minutesError}
        />
      </Card>

      <Card>
        <CardTitle>Distance brackets</CardTitle>
        <CardDescription className="mt-2">Fixed minutes added per distance range.</CardDescription>
        <EtaBracketEditor
          value={distanceBrackets}
          onChange={setDistanceBrackets}
          distanceError={validation.distanceError}
          minutesError={validation.minutesError}
        />
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
  distanceError,
  minutesError,
}: {
  value: EtaBracket[];
  onChange: (next: EtaBracket[]) => void;
  distanceError?: string | null;
  minutesError?: string | null;
}) {
  return (
    <div className="mt-4 grid gap-3">
      {value.map((row, index) => (
        <div key={`${row.maxDistanceKm}-${index}`} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
          <Input
            type="number"
            inputMode="decimal"
            min={BRACKET_DISTANCE_RANGE.min}
            max={BRACKET_DISTANCE_RANGE.max}
            step="0.5"
            value={String(row.maxDistanceKm)}
            onChange={(event) => {
              const next = [...value];
              next[index] = { ...next[index], maxDistanceKm: toNumber(event.target.value, next[index].maxDistanceKm) };
              onChange(next);
            }}
            placeholder="Max distance (km)"
          />
          <Input
            type="number"
            inputMode="numeric"
            min={BRACKET_MINUTES_RANGE.min}
            max={BRACKET_MINUTES_RANGE.max}
            step="1"
            value={String(row.minutes)}
            onChange={(event) => {
              const next = [...value];
              next[index] = { ...next[index], minutes: toNumber(event.target.value, next[index].minutes) };
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
        onClick={() => onChange([...value, { maxDistanceKm: BRACKET_DISTANCE_RANGE.max, minutes: 10 }])}
      >
        Add bracket
      </Button>
      {distanceError ? <span className="text-[11px] text-red-600">{distanceError}</span> : null}
      {minutesError ? <span className="text-[11px] text-red-600">{minutesError}</span> : null}
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

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampNumber(value: number, range: { min: number; max: number }) {
  return Math.min(range.max, Math.max(range.min, value));
}

function sanitizeBrackets(rows: EtaBracket[]) {
  return rows.map((row) => ({
    maxDistanceKm: clampNumber(row.maxDistanceKm, BRACKET_DISTANCE_RANGE),
    minutes: clampNumber(row.minutes, BRACKET_MINUTES_RANGE),
  }));
}

function validateSettings(payload: {
  basePerKm: number;
  minEta: number;
  fallbackEta: number;
  trafficFactors: EtaBracket[];
  distanceBrackets: EtaBracket[];
}) {
  const errors: string[] = [];
  const basePerKmError = validateRange(payload.basePerKm, BASE_PER_KM_RANGE, "Base per km");
  const minEtaError = validateRange(payload.minEta, MIN_ETA_RANGE, "Minimum ETA");
  const fallbackEtaError = validateRange(payload.fallbackEta, FALLBACK_ETA_RANGE, "Fallback ETA");
  if (basePerKmError) errors.push(basePerKmError);
  if (minEtaError) errors.push(minEtaError);
  if (fallbackEtaError) errors.push(fallbackEtaError);

  const distanceError = validateBracketRange(payload.trafficFactors, "Traffic factor distance");
  const minutesError = validateBracketMinutes(payload.trafficFactors, "Traffic factor minutes");
  const distanceBracketError = validateBracketRange(payload.distanceBrackets, "Distance bracket distance");
  const minutesBracketError = validateBracketMinutes(payload.distanceBrackets, "Distance bracket minutes");

  if (distanceError) errors.push(distanceError);
  if (minutesError) errors.push(minutesError);
  if (distanceBracketError) errors.push(distanceBracketError);
  if (minutesBracketError) errors.push(minutesBracketError);

  return {
    errors,
    basePerKmError,
    minEtaError,
    fallbackEtaError,
    distanceError: distanceError || distanceBracketError,
    minutesError: minutesError || minutesBracketError,
  };
}

function validateRange(value: number, range: { min: number; max: number }, label: string) {
  if (!Number.isFinite(value)) return `${label} must be a number.`;
  if (value < range.min || value > range.max) {
    return `${label} must be between ${range.min} and ${range.max}.`;
  }
  return null;
}

function validateBracketRange(rows: EtaBracket[], label: string) {
  const invalid = rows.find(
    (row) =>
      !Number.isFinite(row.maxDistanceKm) ||
      row.maxDistanceKm < BRACKET_DISTANCE_RANGE.min ||
      row.maxDistanceKm > BRACKET_DISTANCE_RANGE.max
  );
  if (invalid) {
    return `${label} must be between ${BRACKET_DISTANCE_RANGE.min} and ${BRACKET_DISTANCE_RANGE.max} km.`;
  }
  return null;
}

function validateBracketMinutes(rows: EtaBracket[], label: string) {
  const invalid = rows.find(
    (row) =>
      !Number.isFinite(row.minutes) ||
      row.minutes < BRACKET_MINUTES_RANGE.min ||
      row.minutes > BRACKET_MINUTES_RANGE.max
  );
  if (invalid) {
    return `${label} must be between ${BRACKET_MINUTES_RANGE.min} and ${BRACKET_MINUTES_RANGE.max} minutes.`;
  }
  return null;
}
