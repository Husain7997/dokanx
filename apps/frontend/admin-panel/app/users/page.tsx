"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert, AnalyticsCards, Badge, Button, Card, CardDescription, CardTitle, DataTable, Input } from "@dokanx/ui";

import { blockUser, listAdminUsers, unblockUser } from "@/lib/admin-runtime-api";

type UserRow = {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
  isBlocked?: boolean;
  createdAt?: string;
  lastLogin?: string;
  phone?: string;
};

export const dynamic = "force-dynamic";

export default function Page() {
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setSearchQuery(searchParams.get("q") || "");
  }, [searchParams]);

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

  const loadUsers = async () => {
    try {
      const response = await listAdminUsers();
      setUsers(Array.isArray(response.data) ? (response.data as UserRow[]) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load users.");
    }
  };

  const handleToggleBlock = async (user: UserRow) => {
    if (!user._id) return;
    setBusyId(user._id);
    try {
      if (user.isBlocked) {
        await unblockUser(user._id);
      } else {
        await blockUser(user._id);
      }
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update user.");
    } finally {
      setBusyId(null);
    }
  };

  const summary = useMemo(() => {
    const total = users.length;
    const blocked = users.filter((user) => user.isBlocked).length;
    const active = total - blocked;
    const admins = users.filter((user) => ["SUPER_ADMIN", "FINANCE_ADMIN", "SUPPORT_ADMIN", "AUDIT_ADMIN"].includes(String(user.role || ""))).length;
    const customers = users.filter((user) => user.role === "CUSTOMER").length;
    const merchants = users.filter((user) => user.role === "OWNER" || user.role === "MERCHANT").length;
    return [
      { label: "Total users", value: String(total), meta: "All platform accounts" },
      { label: "Active", value: String(active), meta: "Currently usable" },
      { label: "Blocked", value: String(blocked), meta: "Access restricted" },
      { label: "Admin roles", value: String(admins), meta: "Privileged accounts" },
      { label: "Customers", value: String(customers), meta: "End users" },
      { label: "Merchants", value: String(merchants), meta: "Business accounts" },
    ];
  }, [users]);

  const filteredUsers = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((user) =>
      [user._id, user.name, user.email, user.phone, user.role].some((value) =>
        String(value || "").toLowerCase().includes(needle)
      )
    );
  }, [searchQuery, users]);

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
        <div className="mt-4 max-w-sm">
          <Input
            placeholder="Search users, email, role, phone..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
        <div className="mt-4">
          <DataTable
            columns={[
              { key: "name", header: "Name" },
              { key: "email", header: "Email" },
              { key: "phone", header: "Phone" },
              { key: "role", header: "Role" },
              { key: "createdAt", header: "Joined" },
              { key: "lastLogin", header: "Last Login" },
              {
                key: "status",
                header: "Status",
                render: (row) => (
                  <Badge variant={row.isBlocked ? "warning" : "success"}>{row.isBlocked ? "Blocked" : "Active"}</Badge>
                ),
              },
              {
                key: "actions",
                header: "Actions",
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={row.isBlocked ? "primary" : "danger"}
                      disabled={busyId === row._id}
                      onClick={() => handleToggleBlock(row)}
                    >
                      {row.isBlocked ? "Unblock" : "Block"}
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/permissions?q=${encodeURIComponent(String(row._id || row.email || ""))}`}>Governance</a>
                    </Button>
                  </div>
                ),
              },
            ]}
            rows={filteredUsers.map((user) => ({
              _id: user._id,
              name: user.name || "Unknown",
              email: user.email || "N/A",
              phone: user.phone || "N/A",
              role: user.role || "CUSTOMER",
              createdAt: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A",
              lastLogin: user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Never",
              isBlocked: Boolean(user.isBlocked),
            }))}
          />
        </div>
      </Card>
    </div>
  );
}

