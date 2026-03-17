"use client";

import { useEffect, useState } from "react";
import { Button, Input } from "@dokanx/ui";

import {
  addTeamMember,
  applyThemeWithOverrides,
  listTeamMembers,
  listThemes,
  resetTheme,
  updateShopSettings,
  updateTeamMember,
} from "@/lib/runtime-api";

import { OwnerSessionPanel } from "./owner-session-panel";
import { WorkspaceCard } from "./workspace-card";

type ThemeOption = {
  _id?: string;
  id?: string;
  name?: string;
  slug?: string;
  category?: string;
};

type TeamMember = {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
  permissionOverrides?: string[];
  invitation?: {
    expiresAt?: string;
    acceptedAt?: string | null;
  };
  passwordResetRequired?: boolean;
};

export function SettingsWorkspace() {
  const [settings, setSettings] = useState({
    shopName: "Merchant Workspace",
    supportEmail: "ops@merchant-dashboard.test",
    whatsapp: "+8801700000000",
    payoutSchedule: "Weekly",
    logoUrl: "https://placehold.co/180x180",
    brandPrimaryColor: "#0f766e",
    brandAccentColor: "#f97316",
    addressLine1: "House 12, Road 5",
    addressLine2: "Banani",
    city: "Dhaka",
    country: "Bangladesh",
    vatRate: "0",
    defaultDiscountRate: "0",
  });
  const [teamDraft, setTeamDraft] = useState({
    name: "Operations Lead",
    email: "staff@merchant-dashboard.test",
    phone: "01710000000",
    role: "STAFF",
    permissions: "READ_ORDERS,WRITE_PRODUCTS,WRITE_THEME",
  });
  const [message, setMessage] = useState<string | null>("Shop profile, branding, theme overrides, and team permissions are now managed from one workspace.");
  const [themes, setThemes] = useState<ThemeOption[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [latestInvite, setLatestInvite] = useState<{ url: string; expiresAt?: string } | null>(null);
  const [loadingThemes, setLoadingThemes] = useState(false);
  const [submittingTheme, setSubmittingTheme] = useState(false);
  const [submittingSettings, setSubmittingSettings] = useState(false);
  const [submittingTeam, setSubmittingTeam] = useState(false);

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

  async function loadTeamMembers() {
    try {
      const response = await listTeamMembers();
      setTeamMembers(Array.isArray(response.data) ? (response.data as TeamMember[]) : []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to load team members.";
      setMessage(errorMessage);
    }
  }

  useEffect(() => {
    void loadThemes();
    void loadTeamMembers();
  }, []);

  async function handleApplyTheme() {
    if (!selectedThemeId) {
      setMessage("Choose a theme before applying it.");
      return;
    }

    setSubmittingTheme(true);
    setMessage(null);

    try {
      await applyThemeWithOverrides({
        themeId: selectedThemeId,
        overrides: {
          tokens: {
            primaryColor: settings.brandPrimaryColor,
            accentColor: settings.brandAccentColor,
          },
          assets: {
            logoUrl: settings.logoUrl,
          },
        },
      });
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

  async function handleSaveSettings() {
    setSubmittingSettings(true);
    setMessage(null);

    try {
      const response = await updateShopSettings({
        name: settings.shopName,
        supportEmail: settings.supportEmail,
        whatsapp: settings.whatsapp,
        payoutSchedule: settings.payoutSchedule,
        logoUrl: settings.logoUrl,
        brandPrimaryColor: settings.brandPrimaryColor,
        brandAccentColor: settings.brandAccentColor,
        addressLine1: settings.addressLine1,
        addressLine2: settings.addressLine2,
        city: settings.city,
        country: settings.country,
        vatRate: Number(settings.vatRate || 0),
        defaultDiscountRate: Number(settings.defaultDiscountRate || 0),
      });
      setMessage(response.message || "Shop settings saved.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to save settings.";
      setMessage(errorMessage);
    } finally {
      setSubmittingSettings(false);
    }
  }

  async function handleAddTeamMember() {
    setSubmittingTeam(true);
    setMessage(null);

    try {
      const response = await addTeamMember({
        name: teamDraft.name,
        email: teamDraft.email,
        phone: teamDraft.phone,
        role: teamDraft.role,
        permissions: teamDraft.permissions.split(",").map((item) => item.trim()).filter(Boolean),
      });
      if (response.invite?.inviteUrl) {
        setLatestInvite({
          url: response.invite.inviteUrl,
          expiresAt: response.invite.expiresAt,
        });
      }
      await loadTeamMembers();
      setMessage(response.invite?.emailSent ? "Team member saved and invite emailed." : "Team member saved.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to save team member.";
      setMessage(errorMessage);
    } finally {
      setSubmittingTeam(false);
    }
  }

  async function handlePromoteMember(memberId: string) {
    setSubmittingTeam(true);
    setMessage(null);

    try {
      await updateTeamMember(memberId, { role: "OWNER" });
      await loadTeamMembers();
      setMessage("Team member role updated.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to update team member.";
      setMessage(errorMessage);
    } finally {
      setSubmittingTeam(false);
    }
  }

  async function handleResendInvite(memberId: string) {
    setSubmittingTeam(true);
    setMessage(null);

    try {
      const response = await updateTeamMember(memberId, { resendInvite: true });
      if (response.invite?.inviteUrl) {
        setLatestInvite({
          url: response.invite.inviteUrl,
          expiresAt: response.invite.expiresAt,
        });
      }
      await loadTeamMembers();
      setMessage(response.invite?.emailSent ? "Invite refreshed and emailed." : "Invite refreshed.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to resend invite.";
      setMessage(errorMessage);
    } finally {
      setSubmittingTeam(false);
    }
  }

  return (
    <div className="grid gap-6">
      <OwnerSessionPanel title="Owner session for settings mutations" />
      <div className="grid gap-6 lg:grid-cols-2">
        <WorkspaceCard
          title="Tenant profile and branding"
          description="Profile, logo, and brand color overrides persist to the backend."
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
            <label className="grid gap-2 text-sm">
              <span>Logo URL</span>
              <Input value={settings.logoUrl} onChange={(event) => setSettings((current) => ({ ...current, logoUrl: event.target.value }))} />
            </label>
            <label className="grid gap-2 text-sm">
              <span>Address line 1</span>
              <Input value={settings.addressLine1} onChange={(event) => setSettings((current) => ({ ...current, addressLine1: event.target.value }))} />
            </label>
            <label className="grid gap-2 text-sm">
              <span>Address line 2</span>
              <Input value={settings.addressLine2} onChange={(event) => setSettings((current) => ({ ...current, addressLine2: event.target.value }))} />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span>City</span>
                <Input value={settings.city} onChange={(event) => setSettings((current) => ({ ...current, city: event.target.value }))} />
              </label>
              <label className="grid gap-2 text-sm">
                <span>Country</span>
                <Input value={settings.country} onChange={(event) => setSettings((current) => ({ ...current, country: event.target.value }))} />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span>VAT rate (%)</span>
                <Input value={settings.vatRate} onChange={(event) => setSettings((current) => ({ ...current, vatRate: event.target.value }))} />
              </label>
              <label className="grid gap-2 text-sm">
                <span>Default discount (%)</span>
                <Input value={settings.defaultDiscountRate} onChange={(event) => setSettings((current) => ({ ...current, defaultDiscountRate: event.target.value }))} />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span>Primary color</span>
                <Input value={settings.brandPrimaryColor} onChange={(event) => setSettings((current) => ({ ...current, brandPrimaryColor: event.target.value }))} />
              </label>
              <label className="grid gap-2 text-sm">
                <span>Accent color</span>
                <Input value={settings.brandAccentColor} onChange={(event) => setSettings((current) => ({ ...current, brandAccentColor: event.target.value }))} />
              </label>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <Button onClick={handleSaveSettings} disabled={submittingSettings}>
              {submittingSettings ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </WorkspaceCard>

        <WorkspaceCard
          title="Theme sync"
          description="Theme application now carries brand overrides so storefront identity stays coherent."
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
          </div>
        </WorkspaceCard>

        <WorkspaceCard
          title="Team roles and permissions"
          description="Owner-managed team roles and permission overrides are now backed by live shop endpoints."
        >
          <div className="grid gap-4">
            <Input value={teamDraft.name} onChange={(event) => setTeamDraft((current) => ({ ...current, name: event.target.value }))} />
            <Input value={teamDraft.email} onChange={(event) => setTeamDraft((current) => ({ ...current, email: event.target.value }))} />
            <Input value={teamDraft.phone} onChange={(event) => setTeamDraft((current) => ({ ...current, phone: event.target.value }))} />
            <select
              className="h-11 rounded-full border border-border bg-background px-4 text-sm"
              value={teamDraft.role}
              onChange={(event) => setTeamDraft((current) => ({ ...current, role: event.target.value }))}
            >
              <option value="STAFF">Staff</option>
              <option value="OWNER">Owner</option>
            </select>
            <Input value={teamDraft.permissions} onChange={(event) => setTeamDraft((current) => ({ ...current, permissions: event.target.value }))} />
            <Button onClick={handleAddTeamMember} disabled={submittingTeam}>
              {submittingTeam ? "Saving..." : "Add Or Update Team Member"}
            </Button>
          </div>
          <div className="mt-6 grid gap-3">
            {teamMembers.map((member) => (
              <div key={String(member._id || member.email)} className="rounded-3xl border border-border/60 p-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{member.name || member.email}</p>
                    <p className="text-muted-foreground">{member.email} / {member.role}</p>
                    <p className="text-muted-foreground">{(member.permissionOverrides || []).join(", ") || "No overrides"}</p>
                    <p className="text-muted-foreground">
                      Invite: {member.invitation?.acceptedAt ? "Accepted" : member.invitation?.expiresAt ? `Pending until ${member.invitation.expiresAt}` : "Not issued"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => void handlePromoteMember(String(member._id || ""))} disabled={submittingTeam}>
                      Promote
                    </Button>
                    <Button variant="ghost" onClick={() => void handleResendInvite(String(member._id || ""))} disabled={submittingTeam}>
                      Resend Invite
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {latestInvite ? (
            <div className="mt-4 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs">
              <p className="font-medium">Latest invite</p>
              <p className="mt-2 break-all">{latestInvite.url}</p>
              {latestInvite.expiresAt ? <p className="mt-1">Expires: {latestInvite.expiresAt}</p> : null}
            </div>
          ) : null}
        </WorkspaceCard>

        {message ? (
          <WorkspaceCard title="Status" description="Latest settings mutation result">
            <p className="text-sm text-muted-foreground">{message}</p>
          </WorkspaceCard>
        ) : null}
      </div>
    </div>
  );
}
