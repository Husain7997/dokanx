"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, AnalyticsCards, Badge, Button, SelectDropdown, TextInput } from "@dokanx/ui";

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
    storefrontDomain: "https://storefront.dokanx.test",
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

  const themeOptions = useMemo(
    () =>
      themes.map((theme) => ({
        label: `${theme.name || theme.slug || theme._id || theme.id || "Theme"}${theme.category ? ` (${theme.category})` : ""}`,
        value: String(theme._id || theme.id || "")
      })),
    [themes]
  );

  const teamRoleOptions = useMemo(
    () => [
      { label: "Staff", value: "STAFF" },
      { label: "Owner", value: "OWNER" }
    ],
    []
  );

  const stats = useMemo(() => {
    const acceptedInvites = teamMembers.filter((member) => Boolean(member.invitation?.acceptedAt)).length;
    const pendingInvites = teamMembers.filter((member) => !member.invitation?.acceptedAt && Boolean(member.invitation?.expiresAt)).length;
    return [
      { label: "Team members", value: String(teamMembers.length), meta: "Visible in this shop" },
      { label: "Pending invites", value: String(pendingInvites), meta: "Awaiting acceptance" },
      { label: "Accepted access", value: String(acceptedInvites), meta: "Already onboarded" },
      { label: "Themes", value: String(themes.length), meta: "Available to apply" },
      { label: "Brand primary", value: settings.brandPrimaryColor, meta: "Current main token" },
      { label: "Accent", value: settings.brandAccentColor, meta: "Current highlight token" },
      { label: "Payout cadence", value: settings.payoutSchedule, meta: "Current payout rhythm" },
      { label: "Storefront city", value: settings.city, meta: "Operational base" },
    ];
  }, [settings.brandAccentColor, settings.brandPrimaryColor, settings.city, settings.payoutSchedule, teamMembers, themes.length]);

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
        storefrontDomain: settings.storefrontDomain,
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

      <WorkspaceCard
        title="Store command settings"
        description="Brand, operations, payouts, themes, and access control are grouped here so owners can make fewer scattered decisions."
      >
        <div className="grid gap-4">
          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-border/60 bg-card/90 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Operational overview</p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">Keep the storefront, team, and brand aligned.</h2>
              <p className="mt-2 text-sm text-muted-foreground">Use this page to update merchant identity, sync theme tokens, and control who can operate inside the workspace.</p>
            </div>
            <div className="rounded-3xl border border-border/60 bg-muted/20 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Current storefront</p>
              <p className="mt-2 text-sm font-medium text-foreground">{settings.shopName}</p>
              <p className="mt-1 text-xs text-muted-foreground">{settings.storefrontDomain}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="neutral">{settings.city}</Badge>
                <Badge variant="neutral">{settings.payoutSchedule}</Badge>
                <Badge variant="neutral">{teamMembers.length} team members</Badge>
              </div>
            </div>
          </div>
          <AnalyticsCards items={stats} />
        </div>
      </WorkspaceCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <WorkspaceCard
          title="Tenant profile and branding"
          description="Profile, support details, legal fields, and brand tokens persist to the backend."
        >
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput label="Shop name" value={settings.shopName} onChange={(event) => setSettings((current) => ({ ...current, shopName: event.target.value }))} />
              <TextInput label="Support email" value={settings.supportEmail} onChange={(event) => setSettings((current) => ({ ...current, supportEmail: event.target.value }))} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput label="WhatsApp" value={settings.whatsapp} onChange={(event) => setSettings((current) => ({ ...current, whatsapp: event.target.value }))} />
              <TextInput label="Payout schedule" value={settings.payoutSchedule} onChange={(event) => setSettings((current) => ({ ...current, payoutSchedule: event.target.value }))} />
            </div>
            <TextInput label="Logo URL" value={settings.logoUrl} onChange={(event) => setSettings((current) => ({ ...current, logoUrl: event.target.value }))} />
            <TextInput label="Storefront domain" value={settings.storefrontDomain} onChange={(event) => setSettings((current) => ({ ...current, storefrontDomain: event.target.value }))} />
            <TextInput label="Address line 1" value={settings.addressLine1} onChange={(event) => setSettings((current) => ({ ...current, addressLine1: event.target.value }))} />
            <TextInput label="Address line 2" value={settings.addressLine2} onChange={(event) => setSettings((current) => ({ ...current, addressLine2: event.target.value }))} />
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput label="City" value={settings.city} onChange={(event) => setSettings((current) => ({ ...current, city: event.target.value }))} />
              <TextInput label="Country" value={settings.country} onChange={(event) => setSettings((current) => ({ ...current, country: event.target.value }))} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput label="VAT rate (%)" value={settings.vatRate} onChange={(event) => setSettings((current) => ({ ...current, vatRate: event.target.value }))} />
              <TextInput label="Default discount (%)" value={settings.defaultDiscountRate} onChange={(event) => setSettings((current) => ({ ...current, defaultDiscountRate: event.target.value }))} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput label="Primary color" value={settings.brandPrimaryColor} onChange={(event) => setSettings((current) => ({ ...current, brandPrimaryColor: event.target.value }))} />
              <TextInput label="Accent color" value={settings.brandAccentColor} onChange={(event) => setSettings((current) => ({ ...current, brandAccentColor: event.target.value }))} />
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <Button onClick={handleSaveSettings} loading={submittingSettings} loadingText="Saving settings">
              Save settings
            </Button>
          </div>
        </WorkspaceCard>

        <WorkspaceCard
          title="Theme sync"
          description="Theme application now carries live brand overrides so storefront identity stays coherent."
        >
          <div className="grid gap-4">
            <SelectDropdown
              label="Available themes"
              value={selectedThemeId}
              onValueChange={setSelectedThemeId}
              options={themeOptions}
              disabled={loadingThemes || themes.length === 0}
            />
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Theme preview inputs</p>
              <p className="mt-2">Primary token: {settings.brandPrimaryColor}</p>
              <p className="mt-1">Accent token: {settings.brandAccentColor}</p>
              <p className="mt-1">Logo source: {settings.logoUrl}</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleApplyTheme} loading={submittingTheme} loadingText="Applying theme" disabled={loadingThemes || !selectedThemeId}>
                Apply theme
              </Button>
              <Button variant="ghost" onClick={handleResetTheme} disabled={submittingTheme}>
                Reset theme
              </Button>
            </div>
          </div>
        </WorkspaceCard>

        <WorkspaceCard
          title="Team roles and permissions"
          description="Invite teammates, assign roles, and keep access scoped to the right operators."
        >
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput label="Name" value={teamDraft.name} onChange={(event) => setTeamDraft((current) => ({ ...current, name: event.target.value }))} />
              <TextInput label="Email" value={teamDraft.email} onChange={(event) => setTeamDraft((current) => ({ ...current, email: event.target.value }))} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput label="Phone" value={teamDraft.phone} onChange={(event) => setTeamDraft((current) => ({ ...current, phone: event.target.value }))} />
              <SelectDropdown label="Role" value={teamDraft.role} onValueChange={(value) => setTeamDraft((current) => ({ ...current, role: value }))} options={teamRoleOptions} />
            </div>
            <TextInput label="Permissions (comma separated)" value={teamDraft.permissions} onChange={(event) => setTeamDraft((current) => ({ ...current, permissions: event.target.value }))} />
            <Button onClick={handleAddTeamMember} loading={submittingTeam} loadingText="Saving team member">
              Add or update team member
            </Button>
          </div>
          <div className="mt-6 grid gap-3">
            {teamMembers.map((member) => (
              <div key={String(member._id || member.email)} className="rounded-3xl border border-border/60 p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{member.name || member.email}</p>
                      <Badge variant={String(member.role || "").toUpperCase() === "OWNER" ? "success" : "neutral"}>{member.role || "STAFF"}</Badge>
                    </div>
                    <p className="mt-1 text-muted-foreground">{member.email}</p>
                    <p className="mt-1 text-muted-foreground">{(member.permissionOverrides || []).join(", ") || "No overrides"}</p>
                    <p className="mt-1 text-muted-foreground">
                      Invite: {member.invitation?.acceptedAt ? "Accepted" : member.invitation?.expiresAt ? `Pending until ${member.invitation.expiresAt}` : "Not issued"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => void handlePromoteMember(String(member._id || ""))} disabled={submittingTeam}>
                      Promote
                    </Button>
                    <Button variant="ghost" onClick={() => void handleResendInvite(String(member._id || ""))} disabled={submittingTeam}>
                      Resend invite
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {!teamMembers.length ? (
              <div className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-center">
                <p className="font-medium text-foreground">No team members yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Create the first teammate above to start assigning roles.</p>
              </div>
            ) : null}
          </div>
          {latestInvite ? (
            <div className="mt-4 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs">
              <p className="font-medium text-foreground">Latest invite</p>
              <p className="mt-2 break-all text-muted-foreground">{latestInvite.url}</p>
              {latestInvite.expiresAt ? <p className="mt-1 text-muted-foreground">Expires: {latestInvite.expiresAt}</p> : null}
            </div>
          ) : null}
        </WorkspaceCard>

        {message ? (
          <WorkspaceCard title="Status" description="Latest settings mutation result">
            <Alert variant="info">{message}</Alert>
          </WorkspaceCard>
        ) : null}
      </div>
    </div>
  );
}
