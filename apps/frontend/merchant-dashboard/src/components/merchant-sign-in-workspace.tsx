"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@dokanx/auth";
import { Button, Card, CardDescription, CardTitle, Input } from "@dokanx/ui";

export function MerchantSignInWorkspace() {
  const auth = useAuth();
  const router = useRouter();
  const [credentials, setCredentials] = useState({
    email: "owner@dokanx.test",
    password: "Password123!",
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
    <div className="mx-auto max-w-xl p-6">
      <Card>
        <CardTitle>Merchant sign in</CardTitle>
        <CardDescription className="mt-2">
          Use an OWNER, STAFF, or ADMIN account to access the merchant workspace.
        </CardDescription>
        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm">
            <span>Email</span>
            <Input value={credentials.email} onChange={(event) => setCredentials((current) => ({ ...current, email: event.target.value }))} />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Password</span>
            <Input type="password" value={credentials.password} onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))} />
          </label>
          <Button onClick={handleLogin} disabled={submitting}>
            {submitting ? "Working..." : "Sign In"}
          </Button>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </div>
      </Card>
    </div>
  );
}
