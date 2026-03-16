"use client";

import { useEffect, useState } from "react";
import { Button, Card, CardDescription, CardTitle, DataTable } from "@dokanx/ui";

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

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="dx-display text-3xl">Users</h1>
        <p className="text-sm text-muted-foreground">Platform users and access control</p>
      </div>
      {error ? (
        <Card>
          <CardTitle>Users</CardTitle>
          <CardDescription className="mt-2">{error}</CardDescription>
        </Card>
      ) : null}
      <DataTable
        columns={[
          { key: "name", header: "Name" },
          { key: "email", header: "Email" },
          { key: "role", header: "Role" },
          { key: "status", header: "Status" },
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
  );
}
