"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@dokanx/auth";
import { Button, Card, CardDescription, CardTitle, Input } from "@dokanx/ui";
import { storageKeys, toRole } from "@dokanx/utils";

import { acceptInvitation } from "@/lib/runtime-api";

export function AcceptInviteWorkspace() {
  const searchParams = useSearchParams();
  const store = useAuthStore();
  const token = searchParams.get("token") || "";
  const [form, setForm] = useState({
    name: "",
    password: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const hasToken = useMemo(() => token.trim().length > 0, [token]);

  async function handleAccept() {
    if (!hasToken) {
      setMessage("Invite token missing.");
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const response = await acceptInvitation({
        token,
        name: form.name || undefined,
        password: form.password,
      });

      const session = {
        accessToken: String(response.accessToken || response.token || ""),
        refreshToken: String(response.refreshToken || ""),
        refreshTokenExpiresAt: String(response.refreshTokenExpiresAt || ""),
        user: {
          id: String((response.user as { _id?: string; id?: string } | undefined)?._id || (response.user as { id?: string } | undefined)?.id || ""),
          name: String((response.user as { name?: string } | undefined)?.name || ""),
          email: String((response.user as { email?: string } | undefined)?.email || ""),
          role: String((response.user as { role?: string } | undefined)?.role || "STAFF"),
          roleName: toRole(String((response.user as { role?: string } | undefined)?.role || "STAFF")),
          phone: String((response.user as { phone?: string } | undefined)?.phone || ""),
          shopId: String((response.user as { shopId?: string } | undefined)?.shopId || ""),
        },
      };
      localStorage.setItem(storageKeys.session, JSON.stringify(session));
      store.setSession(session);
      setMessage(response.message || "Invite accepted. Your merchant session is ready.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to accept invite.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <Card>
        <CardTitle>Accept merchant invite</CardTitle>
        <CardDescription className="mt-2">
          Set your password once. The legacy shared temp password flow has been removed.
        </CardDescription>
        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm">
            <span>Invite token</span>
            <Input value={token} readOnly />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Name</span>
            <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Password</span>
            <Input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
          </label>
          <div className="flex gap-3">
            <Button onClick={handleAccept} disabled={submitting || !hasToken}>
              {submitting ? "Working..." : "Accept Invite"}
            </Button>
            <Button asChild variant="secondary">
              <a href="/dashboard">Open dashboard</a>
            </Button>
          </div>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </div>
      </Card>
    </div>
  );
}
