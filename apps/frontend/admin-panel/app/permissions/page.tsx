"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert, AnalyticsCards, Badge, Button, Card, CardDescription, CardTitle, Checkbox, DataTable } from "@dokanx/ui";

import { listAdminUsers, listAuditLogs, updateAdminUser } from "@/lib/admin-runtime-api";

type UserRow = {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
  isBlocked?: boolean;
  permissionOverrides?: string[];
  shopId?: { name?: string; _id?: string } | string | null;
};

type AuditRow = {
  _id?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  createdAt?: string;
  meta?: Record<string, unknown>;
  performedBy?: { name?: string; email?: string };
};

type EditableRole = "CUSTOMER" | "STAFF" | "OWNER" | "SUPPORT_ADMIN" | "FINANCE_ADMIN" | "AUDIT_ADMIN" | "ADMIN";

const ROLE_OPTIONS: EditableRole[] = ["CUSTOMER", "STAFF", "OWNER", "SUPPORT_ADMIN", "FINANCE_ADMIN", "AUDIT_ADMIN", "ADMIN"];

const PERMISSION_GROUPS = [
  {
    id: "admin",
    label: "Admin governance",
    items: ["ADMIN_MANAGE_USERS", "ADMIN_VIEW_AUDIT", "ADMIN_VIEW_SHOPS", "ADMIN_VIEW_ORDERS"],
  },
  {
    id: "merchant_ai",
    label: "Merchant AI visibility",
    items: ["AI_VIEW_OVERVIEW", "AI_VIEW_INVENTORY", "AI_VIEW_CUSTOMERS", "AI_VIEW_CREDIT", "AI_VIEW_PAYMENTS", "AI_VIEW_MERCHANT_INSIGHTS"],
  },
  {
    id: "merchant_ops",
    label: "Merchant operations",
    items: ["SHOP_MANAGE_TEAM", "ORDER_READ_SHOP", "ORDER_UPDATE_STATUS", "PAYMENT_RETRY", "PRODUCT_READ_INVENTORY"],
  },
];

const PERMISSION_ACTIONS = new Set([
  "UPDATE_USER_PERMISSIONS",
  "TEAM_MEMBER_UPDATED",
  "TEAM_MEMBER_INVITED",
  "TEAM_MEMBER_ACCESS_UPDATED",
  "TEAM_MEMBER_INVITE_REFRESHED",
  "BLOCK_USER",
  "UNBLOCK_USER",
]);

export const dynamic = "force-dynamic";

export default function PermissionsPage() {
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [draftRole, setDraftRole] = useState<EditableRole>("STAFF");
  const [draftPermissions, setDraftPermissions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function loadData() {
    setError(null);
    try {
      const [userResponse, auditResponse] = await Promise.all([listAdminUsers(), listAuditLogs()]);
      setUsers(Array.isArray(userResponse.data) ? (userResponse.data as UserRow[]) : []);
      setAuditLogs(Array.isArray(auditResponse.data) ? (auditResponse.data as AuditRow[]) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load permission governance data.");
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const query = (searchParams.get("q") || "").trim().toLowerCase();
    if (!query || !users.length) return;
    const matched = users.find((user) =>
      [user._id, user.name, user.email, typeof user.shopId === "string" ? user.shopId : user.shopId?.name, typeof user.shopId === "object" ? user.shopId?._id : null]
        .some((value) => String(value || "").toLowerCase().includes(query))
    );
    if (matched?._id) {
      setSelectedUserId(String(matched._id));
    }
  }, [searchParams, users]);

  const selectedUser = useMemo(
    () => users.find((user) => String(user._id || "") === selectedUserId) || null,
    [selectedUserId, users]
  );

  useEffect(() => {
    if (!selectedUserId && users[0]?._id) {
      setSelectedUserId(String(users[0]._id));
      return;
    }
    if (selectedUser) {
      setDraftRole(normalizeRole(selectedUser.role));
      setDraftPermissions(normalizePermissions(selectedUser.permissionOverrides));
    }
  }, [selectedUser, selectedUserId, users]);

  const governanceLogs = useMemo(
    () => auditLogs.filter((log) => PERMISSION_ACTIONS.has(String(log.action || "").toUpperCase())),
    [auditLogs]
  );

  const summary = useMemo(() => {
    const managedUsers = users.filter((user) => ["OWNER", "STAFF", "SUPPORT_ADMIN", "FINANCE_ADMIN", "AUDIT_ADMIN", "ADMIN"].includes(String(user.role || "").toUpperCase())).length;
    const explicitOverrides = users.filter((user) => normalizePermissions(user.permissionOverrides).length > 0).length;
    const adminRoles = users.filter((user) => ["ADMIN", "SUPPORT_ADMIN", "FINANCE_ADMIN", "AUDIT_ADMIN"].includes(String(user.role || "").toUpperCase())).length;
    const teamInvites = governanceLogs.filter((log) => String(log.action || "") === "TEAM_MEMBER_INVITED").length;
    const permissionUpdates = governanceLogs.filter((log) => ["UPDATE_USER_PERMISSIONS", "TEAM_MEMBER_ACCESS_UPDATED", "TEAM_MEMBER_UPDATED"].includes(String(log.action || ""))).length;
    const recentActions = governanceLogs.filter((log) => isRecent(log.createdAt)).length;
    return [
      { label: "Managed identities", value: String(managedUsers), meta: "Merchant and admin operators" },
      { label: "Explicit overrides", value: String(explicitOverrides), meta: "Users with custom permissions" },
      { label: "Admin roles", value: String(adminRoles), meta: "Privileged platform staff" },
      { label: "Team invites", value: String(teamInvites), meta: "Invitations issued" },
      { label: "Permission updates", value: String(permissionUpdates), meta: "Role or override changes" },
      { label: "Recent governance", value: String(recentActions), meta: "Last 7 days" },
    ];
  }, [governanceLogs, users]);

  const userRows = useMemo(
    () => users.map((user) => ({
      _id: user._id,
      name: user.name || "Unknown",
      email: user.email || "N/A",
      role: user.role || "CUSTOMER",
      overrides: normalizePermissions(user.permissionOverrides),
      shop: resolveShopLabel(user.shopId),
      status: user.isBlocked ? "Blocked" : "Active",
    })),
    [users]
  );

  async function handleSave() {
    if (!selectedUserId) return;
    setBusy(true);
    setStatus(null);
    setError(null);
    try {
      await updateAdminUser(selectedUserId, {
        role: draftRole,
        permissionOverrides: draftPermissions,
      });
      setStatus("Role and permission overrides updated.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update user permissions.");
    } finally {
      setBusy(false);
    }
  }

  function togglePermission(permission: string) {
    setDraftPermissions((current) =>
      current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]
    );
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-[28px] border border-white/10 bg-[#0B1E3C] px-6 py-6 text-white shadow-[0_24px_60px_rgba(11,30,60,0.24)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-[#FFD49F]">DokanX Admin</p>
            <h1 className="dx-display text-3xl">Permission Governance</h1>
            <p className="text-sm text-slate-200">
              Review operator roles, apply explicit permission overrides, and inspect the audit trail behind access changes.
            </p>
          </div>
          <Badge variant="secondary" className="border-white/15 bg-white/10 text-white">
            {users.length} identities
          </Badge>
        </div>
      </div>

      <AnalyticsCards items={summary} />

      {error ? <Alert variant="warning">{error}</Alert> : null}
      {status ? <Alert variant="info">{status}</Alert> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card>
          <CardTitle>Identity access matrix</CardTitle>
          <CardDescription className="mt-2">Select an operator and update their effective role or explicit permission overrides.</CardDescription>
          <div className="mt-4 grid gap-4">
            <div className="grid gap-2">
              <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Identity</label>
              <select
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                className="h-11 rounded-[var(--radius-md)] border border-input bg-card px-3 text-sm"
              >
                {users.map((user) => (
                  <option key={String(user._id || user.email)} value={String(user._id || "")}>
                    {(user.name || user.email || "User")} - {String(user.role || "CUSTOMER")}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-3xl border border-border/60 bg-card/70 p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-foreground">{selectedUser?.name || selectedUser?.email || "No identity selected"}</p>
                <Badge variant="neutral">{selectedUser?.isBlocked ? "Blocked" : "Active"}</Badge>
                <Badge variant="neutral">{resolveShopLabel(selectedUser?.shopId)}</Badge>
              </div>
              <p className="mt-2 text-muted-foreground">{selectedUser?.email || "Choose a user from the list to edit access."}</p>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Role</label>
              <select
                value={draftRole}
                onChange={(event) => setDraftRole(event.target.value as EditableRole)}
                className="h-11 rounded-[var(--radius-md)] border border-input bg-card px-3 text-sm"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            <div className="grid gap-4">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.id} className="rounded-2xl border border-border/60 p-4">
                  <p className="text-sm font-medium text-foreground">{group.label}</p>
                  <div className="mt-4 grid gap-3">
                    {group.items.map((permission) => (
                      <label key={permission} className="flex items-start gap-3 rounded-2xl border border-border/50 px-3 py-3">
                        <Checkbox checked={draftPermissions.includes(permission)} onCheckedChange={() => togglePermission(permission)} />
                        <span>
                          <span className="block text-sm font-medium text-foreground">{permission}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">Explicitly grants this permission in addition to role defaults.</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleSave} loading={busy} loadingText="Saving access" disabled={!selectedUserId}>
                Save governance update
              </Button>
              <Button variant="secondary" onClick={() => {
                setDraftRole(normalizeRole(selectedUser?.role));
                setDraftPermissions(normalizePermissions(selectedUser?.permissionOverrides));
              }} disabled={busy || !selectedUser}>
                Reset draft
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>Governance audit trail</CardTitle>
          <CardDescription className="mt-2">Recent role updates, team invites, block actions, and explicit permission changes.</CardDescription>
          <div className="mt-4">
            <DataTable
              columns={[
                { key: "action", header: "Action" },
                { key: "actor", header: "Actor" },
                { key: "target", header: "Target" },
                { key: "change", header: "Change" },
                { key: "createdAt", header: "Time" },
                { key: "open", header: "Open" },
              ]}
              rows={governanceLogs.slice(0, 20).map((log) => ({
                action: <Badge variant="neutral">{String(log.action || "ACTION").replace(/_/g, " ")}</Badge>,
                actor: log.performedBy?.name || log.performedBy?.email || "System",
                target: `${log.targetType || "User"} ${String(log.targetId || "").slice(-6)}`.trim(),
                change: summarizeAuditChange(log.meta),
                createdAt: log.createdAt ? new Date(log.createdAt).toLocaleString() : "Unknown",
                open: (
                  <Button size="sm" variant="outline" asChild>
                    <a href={resolvePermissionAuditHref(log)}>Open</a>
                  </Button>
                ),
              }))}
            />
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>Managed identities</CardTitle>
        <CardDescription className="mt-2">Quick review of current roles and explicit override coverage across operators.</CardDescription>
        <div className="mt-4">
          <DataTable
            columns={[
              { key: "name", header: "Name" },
              { key: "email", header: "Email" },
              { key: "role", header: "Role" },
              { key: "shop", header: "Shop" },
              {
                key: "overrides",
                header: "Overrides",
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    {(row.overrides as string[]).length
                      ? (row.overrides as string[]).map((permission) => <Badge key={`${row._id}-${permission}`} variant="neutral">{permission}</Badge>)
                      : <span className="text-xs text-muted-foreground">Role defaults only</span>}
                  </div>
                ),
              },
              {
                key: "status",
                header: "Status",
                render: (row) => <Badge variant={row.status === "Blocked" ? "warning" : "success"}>{String(row.status)}</Badge>,
              },
              {
                key: "open",
                header: "Open",
                render: (row) => (
                  <Button size="sm" variant="outline" asChild>
                    <a href={resolveManagedIdentityHref(row)}>Open</a>
                  </Button>
                ),
              },
            ]}
            rows={userRows}
          />
        </div>
      </Card>
    </div>
  );
}

function normalizePermissions(values?: string[] | null) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value).trim().toUpperCase()).filter(Boolean))];
}

function normalizeRole(role?: string | null): EditableRole {
  const value = String(role || "STAFF").toUpperCase();
  return (ROLE_OPTIONS.includes(value as EditableRole) ? value : "STAFF") as EditableRole;
}

function resolveShopLabel(shop: UserRow["shopId"]) {
  if (!shop) return "No shop";
  if (typeof shop === "string") return shop;
  return shop.name || shop._id || "Assigned shop";
}

function summarizeAuditChange(meta?: Record<string, unknown>) {
  if (!meta) return "Governance event recorded";
  const before = meta.before && typeof meta.before === "object" ? (meta.before as Record<string, unknown>) : null;
  const after = meta.after && typeof meta.after === "object" ? (meta.after as Record<string, unknown>) : null;
  const mode = typeof meta.permissionsMode === "string" ? meta.permissionsMode : null;
  if (before || after) {
    const beforeRole = before?.role ? String(before.role) : "-";
    const afterRole = after?.role ? String(after.role) : "-";
    return `${beforeRole} -> ${afterRole}${mode ? ` (${mode})` : ""}`;
  }
  if (Array.isArray(meta.permissionOverrides) && meta.permissionOverrides.length) {
    return `${meta.permissionOverrides.length} override(s)${mode ? ` (${mode})` : ""}`;
  }
  if (meta.inviteIssued) return "Invite issued";
  return "Governance event recorded";
}

function isRecent(createdAt?: string) {
  if (!createdAt) return false;
  const value = new Date(createdAt).getTime();
  if (Number.isNaN(value)) return false;
  return Date.now() - value <= 7 * 24 * 60 * 60 * 1000;
}

function resolvePermissionAuditHref(log: AuditRow) {
  const action = String(log.action || "").toUpperCase();
  const targetId = encodeURIComponent(String(log.targetId || "").trim());
  if (action === "BLOCK_USER" || action === "UNBLOCK_USER") {
    return targetId ? `/users?q=${targetId}` : "/users";
  }
  if (action === "TEAM_MEMBER_UPDATED" || action === "TEAM_MEMBER_INVITED" || action === "TEAM_MEMBER_ACCESS_UPDATED" || action === "TEAM_MEMBER_INVITE_REFRESHED") {
    return targetId ? `/merchants?q=${targetId}` : "/merchants";
  }
  return targetId ? `/permissions?q=${targetId}` : "/permissions";
}

function resolveManagedIdentityHref(row: { _id?: string; shop?: string; role?: string }) {
  const query = encodeURIComponent(String(row._id || "").trim());
  const role = String(row.role || "").toUpperCase();
  if (role === "OWNER" || role === "STAFF" || String(row.shop || "").toLowerCase() !== "no shop") {
    return query ? `/merchants?q=${query}` : "/merchants";
  }
  return query ? `/users?q=${query}` : "/users";
}
