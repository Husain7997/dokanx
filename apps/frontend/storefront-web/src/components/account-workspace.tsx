"use client";

import { useMemo, useState } from "react";
import { ProtectedRoute, useAuth } from "@dokanx/auth";
import { Button, Card, CardDescription, CardTitle, Input } from "@dokanx/ui";

import { getProfile, registerCustomer } from "@/lib/runtime-api";

type FormState = {
  name: string;
  email: string;
  phone: string;
  password: string;
};

export function AccountWorkspace() {
  const auth = useAuth();
  const [form, setForm] = useState<FormState>({
    name: "Customer Demo",
    email: "customer@dokanx.test",
    phone: "01700000000",
    password: "Password123!",
  });
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [profileSnapshot, setProfileSnapshot] = useState<string | null>(null);

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
      await auth.login({ email: form.email, password: form.password });
      setStatus("Customer session is active.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign in.";
      setStatus(`${message} Demo credentials stay prefilled so you can retry quickly.`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister() {
    setSubmitting(true);
    setStatus(null);

    try {
      await registerCustomer({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
      });
      setStatus("Customer account created. Sign in now to attach a live session.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to register customer.";
      setStatus(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRefreshProfile() {
    setSubmitting(true);
    setStatus(null);

    try {
      const response = await getProfile();
      const profile = response.user || response.data || null;
      setProfileSnapshot(profile ? JSON.stringify(profile, null, 2) : null);
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
      setProfileSnapshot(null);
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
          Storefront auth is wired to real customer registration, login, logout, and profile sync endpoints.
        </CardDescription>
        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm">
            <span>Full name</span>
            <Input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Customer name"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Email</span>
            <Input
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="name@shop.com"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Phone</span>
            <Input
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              placeholder="01700000000"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Password</span>
            <Input
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="********"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={handleRegister} disabled={submitting}>
              {submitting ? "Working..." : "Register Customer"}
            </Button>
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
          {profileSnapshot ? (
            <pre className="overflow-x-auto rounded-2xl border border-border/60 bg-muted/30 p-4 text-xs">
              {profileSnapshot}
            </pre>
          ) : null}
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
              Profile sync is live. Address book and payment methods still need dedicated backend endpoints.
            </CardDescription>
          </Card>
        </ProtectedRoute>
      </div>
    </div>
  );
}
