"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@dokanx/auth";
import { Alert, Button, Card, CardDescription, CardTitle, TextInput } from "@dokanx/ui";

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
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[32px] border border-border/60 bg-card/70 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Merchant workspace</p>
          <h1 className="mt-4 text-3xl font-semibold">
            Run your storefront like a real operation.
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Use an OWNER, STAFF, ADMIN, or AGENT account to access the correct workspace.
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
            Use an OWNER, STAFF, ADMIN, or AGENT account to access the workspace.
          </CardDescription>
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
            {message ? <Alert variant="info">{message}</Alert> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}