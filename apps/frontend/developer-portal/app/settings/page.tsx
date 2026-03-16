"use client";

import { useEffect, useState } from "react";
import { updateDeveloperProfile, getDeveloperProfile } from "@/lib/developer-runtime-api";

export default function SettingsPage() {
  const [organizationName, setOrganizationName] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const response = await getDeveloperProfile();
      setOrganizationName(String(response.data?.organizationName || ""));
      setWebsite(String(response.data?.website || ""));
    }
    void load();
  }, []);

  async function handleSave() {
    const response = await updateDeveloperProfile({ organizationName, website });
    setStatus(response.message || "Profile saved");
  }

  return (
    <section className="grid gap-4 rounded-3xl border border-white/40 bg-white/70 p-8">
      <h2 className="dx-display text-2xl">Settings</h2>
      <p className="text-sm text-muted-foreground">
        Configure organization details for your developer profile.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <input
          className="rounded-xl border border-white/60 bg-white px-3 py-2 text-sm"
          placeholder="Organization name"
          value={organizationName}
          onChange={(event) => setOrganizationName(event.target.value)}
        />
        <input
          className="rounded-xl border border-white/60 bg-white px-3 py-2 text-sm"
          placeholder="Website"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>
      <button
        className="w-fit rounded-full border border-white/60 bg-black px-4 py-2 text-xs font-semibold text-white"
        onClick={handleSave}
      >
        Save profile
      </button>
      {status ? <p className="text-xs text-emerald-700">{status}</p> : null}
    </section>
  );
}
