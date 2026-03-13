"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@dokanx/auth";
import { Button, Card, CardDescription, CardTitle, Input } from "@dokanx/ui";

export function MerchantSignInWorkspace() {
  const auth = useAuth();
  const router = useRouter();
  const [credentials, setCredentials] = useState({
    email: "owner@test.com",
    password: "Secret123!",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (auth.status === "authenticated") {
      router.replace("/settings");
      router.refresh();
    }
  }, [auth.status, router]);

  async function handleLogin() {
    setSubmitting(true);
    setMessage(null);

    try {
      await auth.login(credentials);
      setMessage("Merchant session is active.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-120px)] px-6 py-12">
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[32px] border border-border/60 bg-card/70 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Merchant workspace</p>
          <h1 className="mt-4 text-3xl font-semibold">
            Run your storefront like a real operation.
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Use an OWNER, STAFF, or ADMIN account to access products, settings, analytics, and team workflows.
          </p>
          <div className="mt-6 grid gap-4 text-sm">
            <div className="rounded-2xl border border-border/50 bg-background/70 p-4">
              <p className="font-medium">What you can do after sign-in</p>
              <p className="mt-2 text-muted-foreground">
                Update catalog, adjust inventory, apply branding, manage team roles, and review live analytics.
              </p>
            </div>
            <div className="rounded-2xl border border-border/50 bg-background/70 p-4">
              <p className="font-medium">Need a demo account?</p>
              <p className="mt-2 text-muted-foreground">
                Run `scripts/dev-seed.ps1` to create an owner, shop, and sample product.
              </p>
            </div>
          </div>
        </div>

        <Card className="self-start rounded-[32px] border border-border/60 bg-card/80 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.12)] backdrop-blur">
          <CardTitle>Merchant sign in</CardTitle>
          <CardDescription className="mt-2">
            Use an OWNER, STAFF, or ADMIN account to access the merchant workspace.
          </CardDescription>
          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm">
              <span>Email</span>
              <Input
                type="email"
                autoComplete="email"
                value={credentials.email}
                onChange={(event) => setCredentials((current) => ({ ...current, email: event.target.value }))}
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span>Password</span>
              <Input
                type="password"
                autoComplete="current-password"
                value={credentials.password}
                onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleLogin();
                  }
                }}
              />
            </label>
            <Button onClick={handleLogin} disabled={submitting}>
              {submitting ? "Working..." : "Sign In"}
            </Button>
            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
