"use client";

import { useEffect, useState } from "react";
import { Button, Input } from "@dokanx/ui";

import { applyTheme, listThemes, resetTheme } from "@/lib/runtime-api";

import { OwnerSessionPanel } from "./owner-session-panel";
import { WorkspaceCard } from "./workspace-card";

type ThemeOption = {
  _id?: string;
  id?: string;
  name?: string;
  slug?: string;
  category?: string;
};

export function SettingsWorkspace() {
  const [settings, setSettings] = useState({
    shopName: "Merchant Workspace",
    supportEmail: "ops@merchant-dashboard.test",
    whatsapp: "+8801700000000",
    payoutSchedule: "Weekly",
  });
  const [message, setMessage] = useState<string | null>("Theme actions are live. Shop profile fields still need a dedicated backend update endpoint.");
  const [themes, setThemes] = useState<ThemeOption[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState("");
  const [loadingThemes, setLoadingThemes] = useState(false);
  const [submittingTheme, setSubmittingTheme] = useState(false);

  useEffect(() => {
    async function loadThemes() {
      setLoadingThemes(true);
      try {
        const response = await listThemes();
        const rows = Array.isArray(response.data) ? (response.data as ThemeOption[]) : [];
        setThemes(rows);
        setSelectedThemeId((current) => current || String(rows[0]?._id || rows[0]?.id || ""));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unable to load themes.";
        setMessage(errorMessage);
      } finally {
        setLoadingThemes(false);
      }
    }

    void loadThemes();
  }, []);

  async function handleApplyTheme() {
    if (!selectedThemeId) {
      setMessage("Choose a theme before applying it.");
      return;
    }

    setSubmittingTheme(true);
    setMessage(null);

    try {
      await applyTheme(selectedThemeId);
      const activeTheme = themes.find((theme) => String(theme._id || theme.id || "") === selectedThemeId);
      setMessage(`Applied theme: ${activeTheme?.name || selectedThemeId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to apply theme.";
      setMessage(errorMessage);
    } finally {
      setSubmittingTheme(false);
    }
  }

  async function handleResetTheme() {
    setSubmittingTheme(true);
    setMessage(null);

    try {
      await resetTheme();
      setMessage("Theme reset request completed.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to reset theme.";
      setMessage(errorMessage);
    } finally {
      setSubmittingTheme(false);
    }
  }

  return (
    <div className="grid gap-6">
      <OwnerSessionPanel title="Owner session for settings mutations" />
      <div className="grid gap-6 lg:grid-cols-2">
        <WorkspaceCard
          title="Tenant profile"
          description="Profile fields remain editable locally while live settings mutations are routed through backend theme endpoints."
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
            <Button variant="secondary" onClick={() => setMessage("Profile fields are staged locally until a shop settings endpoint is added.")}>
              Save Draft
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{message}</p>
        </WorkspaceCard>

        <WorkspaceCard
          title="Theme sync"
          description="Theme list, apply, and reset are connected to live backend mutations."
        >
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm">
              <span>Available themes</span>
              <select
                className="h-11 rounded-full border border-border bg-background px-4 text-sm"
                value={selectedThemeId}
                onChange={(event) => setSelectedThemeId(event.target.value)}
                disabled={loadingThemes || themes.length === 0}
              >
                {themes.map((theme) => {
                  const value = String(theme._id || theme.id || "");
                  return (
                    <option key={value} value={value}>
                      {theme.name || value} {theme.category ? `(${theme.category})` : ""}
                    </option>
                  );
                })}
              </select>
            </label>
            <div className="flex gap-3">
              <Button onClick={handleApplyTheme} disabled={submittingTheme || loadingThemes || !selectedThemeId}>
                {submittingTheme ? "Working..." : "Apply Theme"}
              </Button>
              <Button variant="ghost" onClick={handleResetTheme} disabled={submittingTheme}>
                Reset Theme
              </Button>
            </div>
            <ul className="grid gap-3 text-sm text-muted-foreground">
              <li>Primary payout account verification</li>
              <li>Theme and storefront branding sync</li>
              <li>Courier default rules and SLA preferences</li>
              <li>Team roles and permission scopes</li>
              <li>Tax and invoice defaults by tenant</li>
            </ul>
          </div>
        </WorkspaceCard>
      </div>
    </div>
  );
}
