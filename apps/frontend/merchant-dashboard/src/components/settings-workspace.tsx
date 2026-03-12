"use client";

import { useState } from "react";
import { Button, Input } from "@dokanx/ui";

import { WorkspaceCard } from "./workspace-card";

export function SettingsWorkspace() {
  const [settings, setSettings] = useState({
    shopName: "Merchant Workspace",
    supportEmail: "ops@merchant-dashboard.test",
    whatsapp: "+8801700000000",
    payoutSchedule: "Weekly",
  });
  const [message, setMessage] = useState("Tenant settings are editable locally. Next step is wiring these values to backend profile/config endpoints.");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <WorkspaceCard
        title="Tenant profile"
        description="Profile and communication settings now have a real editing surface."
      >
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm">
            <span>Shop name</span>
            <Input value={settings.shopName} onChange={(event) => setSettings((current) => ({ ...current, shopName: event.target.value }))} />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Support email</span>
            <Input value={settings.supportEmail} onChange={(event) => setSettings((current) => ({ ...current, supportEmail: event.target.value }))} />
          </label>
          <label className="grid gap-2 text-sm">
            <span>WhatsApp</span>
            <Input value={settings.whatsapp} onChange={(event) => setSettings((current) => ({ ...current, whatsapp: event.target.value }))} />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Payout schedule</span>
            <Input value={settings.payoutSchedule} onChange={(event) => setSettings((current) => ({ ...current, payoutSchedule: event.target.value }))} />
          </label>
        </div>
        <div className="mt-6 flex gap-3">
          <Button onClick={() => setMessage("Settings draft saved locally.")}>Save Changes</Button>
          <Button variant="secondary" onClick={() => setMessage("Notification and branding sync staged for backend integration.")}>
            Stage Sync
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      </WorkspaceCard>

      <WorkspaceCard
        title="Operations checklist"
        description="Pragmatic list of merchant settings work still needed for full production readiness."
      >
        <ul className="grid gap-3 text-sm text-muted-foreground">
          <li>Primary payout account verification</li>
          <li>Theme and storefront branding sync</li>
          <li>Courier default rules and SLA preferences</li>
          <li>Team roles and permission scopes</li>
          <li>Tax and invoice defaults by tenant</li>
        </ul>
      </WorkspaceCard>
    </div>
  );
}
