"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, AnalyticsCards, Badge, Button, Card, CardDescription, CardTitle, DataTable } from "@dokanx/ui";

import { blockUser, listAdminUsers, unblockUser } from "@/lib/admin-runtime-api";

type UserRow = {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
  isBlocked?: boolean;
};

export const dynamic = "force-dynamic";

export default function Page() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await listAdminUsers();
        if (!active) return;
        setUsers(Array.isArray(response.data) ? (response.data as UserRow[]) : []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load users.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    const total = users.length;
    const blocked = users.filter((user) => user.isBlocked).length;
    const active = total - blocked;
    const admins = users.filter((user) => String(user.role || "").toUpperCase().includes("ADMIN")).length;
    return [
      { label: "Total users", value: String(total), meta: "Accounts visible to admin controls" },
      { label: "Active", value: String(active), meta: "Currently usable accounts" },
      { label: "Blocked", value: String(blocked), meta: "Restricted by moderation" },
      { label: "Admin roles", value: String(admins), meta: "Internal privileged accounts" },
    ];
  }, [users]);

  return (
    <div className="grid gap-6">
      <div className="rounded-[28px] border border-white/10 bg-[#0B1E3C] px-6 py-6 text-white shadow-[0_24px_60px_rgba(11,30,60,0.24)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-[#FFD49F]">DokanX Admin</p>
            <h1 className="dx-display text-3xl">User Access</h1>
            <p className="text-sm text-slate-200">
              Review platform identities, role coverage, and block or unblock access from one moderation surface.
            </p>
          </div>
          <Badge variant="secondary" className="border-white/15 bg-white/10 text-white">
            {users.length} loaded
          </Badge>
        </div>
      </div>

      <AnalyticsCards items={summary} />

      {error ? <Alert variant="warning">{error}</Alert> : null}

      <Card>
        <CardTitle>User access queue</CardTitle>
        <CardDescription className="mt-2">
          Use this table to review account roles, verify access status, and quickly block or unblock users when needed.
        </CardDescription>
        <div className="mt-4">
          <DataTable
            columns={[
              { key: "name", header: "Name" },
              { key: "email", header: "Email" },
              { key: "role", header: "Role" },
              {
                key: "status",
                header: "Status",
                render: (row) => <Badge variant={row.isBlocked ? "warning" : "success"}>{row.status}</Badge>,
              },
              {
                key: "actions",
                header: "Actions",
                render: (row) => (
                  <Button
                    size="sm"
                    variant={row.isBlocked ? "secondary" : "default"}
                    onClick={async () => {
                      if (!row.id) return;
                      setBusyId(row.id);
                      try {
                        if (row.isBlocked) {
                          await unblockUser(row.id);
                        } else {
                          await blockUser(row.id);
                        }
                        const response = await listAdminUsers();
                        setUsers(Array.isArray(response.data) ? (response.data as UserRow[]) : []);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Unable to update user.");
                      } finally {
                        setBusyId(null);
                      }
                    }}
                    disabled={busyId === row.id}
                  >
                    {busyId === row.id ? "Updating..." : row.isBlocked ? "Unblock" : "Block"}
                  </Button>
                ),
              },
            ]}
            rows={users.map((user) => ({
              id: String(user._id || ""),
              isBlocked: Boolean(user.isBlocked),
              name: user.name || "User",
              email: user.email || "Unknown",
              role: user.role || "CUSTOMER",
              status: user.isBlocked ? "Blocked" : "Active",
            }))}
          />
        </div>
      </Card>
    </div>
  );
}

