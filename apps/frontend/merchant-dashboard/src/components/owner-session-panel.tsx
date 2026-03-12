"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@dokanx/auth";
import { Button, CardDescription, Input } from "@dokanx/ui";

import { WorkspaceCard } from "./workspace-card";

type OwnerSessionPanelProps = {
  title?: string;
};

export function OwnerSessionPanel({ title = "Owner session" }: OwnerSessionPanelProps) {
  const auth = useAuth();
  const [credentials, setCredentials] = useState({
    email: "owner@dokanx.test",
    password: "Password123!",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const statusRows = useMemo(
    () => [
      { label: "Status", value: auth.status },
      { label: "Email", value: auth.user?.email || "Not signed in" },
      { label: "Role", value: auth.user?.roleName || "Guest" },
      { label: "Shop", value: auth.user?.shopId || "Missing" },
    ],
    [auth.status, auth.user],
  );

  async function handleLogin() {
    setSubmitting(true);
    setMessage(null);

    try {
      await auth.login(credentials);
      setMessage("Owner session is ready for protected write actions.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    setSubmitting(true);
    setMessage(null);

    try {
      await auth.logout();
      setMessage("Session cleared.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <WorkspaceCard
      title={title}
      description="Protected product and settings mutations need an authenticated OWNER session with an attached shop."
    >
      <div className="grid gap-4">
        <label className="grid gap-2 text-sm">
          <span>Email</span>
          <Input value={credentials.email} onChange={(event) => setCredentials((current) => ({ ...current, email: event.target.value }))} />
        </label>
        <label className="grid gap-2 text-sm">
          <span>Password</span>
          <Input type="password" value={credentials.password} onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))} />
        </label>
        <div className="flex gap-3">
          <Button onClick={handleLogin} disabled={submitting}>
            {submitting ? "Working..." : "Sign In"}
          </Button>
          <Button variant="ghost" onClick={handleLogout} disabled={submitting || auth.status !== "authenticated"}>
            Sign Out
          </Button>
        </div>
        <div className="grid gap-2 border-t border-border/60 pt-4 text-sm">
          {statusRows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-medium">{row.value}</span>
            </div>
          ))}
        </div>
        {message ? <CardDescription>{message}</CardDescription> : null}
      </div>
    </WorkspaceCard>
  );
}
