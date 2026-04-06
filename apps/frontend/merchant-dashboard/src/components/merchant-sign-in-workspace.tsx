"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@dokanx/auth";
import { Alert, Badge, Button, Card, CardDescription, CardTitle, Logo, TextInput } from "@dokanx/ui";

export function MerchantSignInWorkspace() {
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [credentials, setCredentials] = useState({
    email: "owner@test.com",
    password: "Secret123!",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (auth.status === "authenticated") {
      const requestedReturnTo = searchParams.get("returnTo");
      const defaultReturnTo = auth.user?.roleName === "agent" ? "/agent/learn" : "/settings";
      const returnTo =
        requestedReturnTo && requestedReturnTo.startsWith("/") && !requestedReturnTo.startsWith("//")
          ? requestedReturnTo
          : defaultReturnTo;

      router.replace(returnTo);
      router.refresh();
    }
  }, [auth.status, auth.user?.roleName, router, searchParams]);

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
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[32px] border border-border/60 bg-card/82 p-8 shadow-[0_20px_60px_rgba(11,30,60,0.1)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Logo variant="full" size="lg" className="max-w-full" />
              <p className="mt-4 text-xs uppercase tracking-[0.35em] text-muted-foreground">Merchant workspace</p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-[linear-gradient(135deg,rgba(255,122,0,0.12),rgba(255,165,0,0.18))] p-2">
              <Logo variant="icon" size="md" />
            </div>
          </div>
          <h1 className="mt-6 text-3xl font-semibold text-foreground">A calmer control room for your store team.</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">Sign in once to manage catalog, inventory, storefront branding, team roles, POS operations, and daily order flow without jumping between separate tools.</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/50 bg-background/80 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
              <p className="mt-2 font-medium text-foreground">Orders, products, settings</p>
            </div>
            <div className="rounded-2xl border border-border/50 bg-background/80 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Permissions</p>
              <p className="mt-2 font-medium text-foreground">Owner, staff, admin, agent</p>
            </div>
            <div className="rounded-2xl border border-border/50 bg-background/80 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Outcome</p>
              <p className="mt-2 font-medium text-foreground">Faster team decisions</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 text-sm md:grid-cols-2">
            <div className="rounded-2xl border border-border/50 bg-background/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-foreground">After sign-in</p>
                <Badge variant="success">Ready</Badge>
              </div>
              <p className="mt-2 text-muted-foreground">Open the merchant dashboard, review pending orders, update catalog health, and manage live storefront settings from one branded workspace.</p>
            </div>
            <div className="rounded-2xl border border-border/50 bg-background/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-foreground">Need a demo account?</p>
                <Badge variant="neutral">Dev</Badge>
              </div>
              <p className="mt-2 text-muted-foreground">Run `scripts/dev-seed.ps1` to create an owner, shop, and sample product set for local testing.</p>
            </div>
          </div>
        </div>

        <Card className="self-start rounded-[32px] border border-border/60 bg-card/88 p-6 shadow-[0_18px_45px_rgba(11,30,60,0.12)] backdrop-blur">
          <CardTitle>Merchant sign in</CardTitle>
          <CardDescription className="mt-2">Use a valid OWNER, STAFF, ADMIN, or AGENT account to enter the correct workspace.</CardDescription>
          <div className="mt-6 grid gap-4">
            <TextInput
              label="Email"
              type="email"
              autoComplete="email"
              value={credentials.email}
              onChange={(event) => setCredentials((current) => ({ ...current, email: event.target.value }))}
            />
            <TextInput
              label="Password"
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
            <Button onClick={handleLogin} loading={submitting} loadingText="Signing in">
              Sign In
            </Button>
            <div className="rounded-2xl border border-border/50 bg-background/80 p-4 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Expected redirect</p>
              <p className="mt-1">Owners and staff go to merchant settings or the requested route. Agents are redirected to the agent learning space.</p>
            </div>
            {message ? <Alert variant="info">{message}</Alert> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
