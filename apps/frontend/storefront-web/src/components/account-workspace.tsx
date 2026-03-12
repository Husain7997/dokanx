"use client";

import { useMemo, useState } from "react";
import { ProtectedRoute, useAuth } from "@dokanx/auth";
import { Button, Card, CardDescription, CardTitle, Input } from "@dokanx/ui";

import { api } from "@/lib/api";

type FormState = {
  email: string;
  password: string;
};

export function AccountWorkspace() {
  const auth = useAuth();
  const [form, setForm] = useState<FormState>({
    email: "merchant@dokanx.test",
    password: "Password123!",
  });
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sessionDetails = useMemo(
    () => [
      { label: "Status", value: auth.status },
      { label: "Email", value: auth.user?.email || "Not signed in" },
      { label: "Role", value: auth.user?.roleName || "Guest" },
      { label: "Shop", value: auth.user?.shopId || "Not linked" },
    ],
    [auth.status, auth.user],
  );

  async function handleLogin() {
    setSubmitting(true);
    setStatus(null);

    try {
      await auth.login(form);
      setStatus("Session restored and storefront auth is active.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign in.";
      setStatus(`${message} Demo credentials stay prefilled so you can retry quickly.`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRefreshProfile() {
    setSubmitting(true);
    setStatus(null);

    try {
      await api.auth.me();
      setStatus("Profile sync request completed.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to refresh profile.";
      setStatus(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    setSubmitting(true);
    setStatus(null);

    try {
      await auth.logout();
      setStatus("You are signed out.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_380px]">
      <Card>
        <CardTitle>Sign in and manage session</CardTitle>
        <CardDescription className="mt-2">
          This route now uses the shared auth provider instead of a placeholder. It is ready for login,
          logout, refresh, and protected account surfaces.
        </CardDescription>
        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm">
            <span>Email</span>
            <Input
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="name@shop.com"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Password</span>
            <Input
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="••••••••"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleLogin} disabled={submitting}>
              {submitting ? "Working..." : "Sign In"}
            </Button>
            <Button variant="secondary" onClick={handleRefreshProfile} disabled={submitting || auth.status !== "authenticated"}>
              Refresh Profile
            </Button>
            <Button variant="ghost" onClick={handleLogout} disabled={submitting || auth.status !== "authenticated"}>
              Sign Out
            </Button>
          </div>
          {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
        </div>
      </Card>

      <div className="grid gap-6">
        <Card>
          <CardTitle>Session Snapshot</CardTitle>
          <div className="mt-6 grid gap-3">
            {sessionDetails.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4 border-b border-border/60 pb-3 text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-medium">{row.value}</span>
              </div>
            ))}
          </div>
        </Card>
        <ProtectedRoute
          fallback={
            <Card>
              <CardTitle>Saved profile data</CardTitle>
              <CardDescription className="mt-2">
                Sign in to unlock addresses, order history, and default checkout profile.
              </CardDescription>
            </Card>
          }
        >
          <Card>
            <CardTitle>Profile actions unlocked</CardTitle>
            <CardDescription className="mt-2">
              Next step is wiring addresses, notification preferences, and saved payment methods to backend routes.
            </CardDescription>
          </Card>
        </ProtectedRoute>
      </div>
    </div>
  );
}
