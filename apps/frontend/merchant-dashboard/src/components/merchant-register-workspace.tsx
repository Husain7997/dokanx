"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@dokanx/auth";
import { Alert, Button, Card, CardDescription, CardTitle, TextInput } from "@dokanx/ui";
import { getApiBaseUrl, storageKeys } from "@dokanx/utils";

type RegisterResponse = {
  accessToken?: string;
  token?: string;
  refreshToken?: string | null;
  user?: {
    id?: string;
    _id?: string;
    name?: string;
    email?: string;
    phone?: string | null;
    role?: string;
    shopId?: string | null;
  };
  message?: string;
};

export function MerchantRegisterWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((state) => state.setSession);
  const [form, setForm] = useState({
    shopName: "",
    phone: "",
    password: "",
    agentId: searchParams.get("agentId") || searchParams.get("ref") || "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch(`${getApiBaseUrl()}/merchants/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json().catch(() => ({}))) as RegisterResponse;
      if (!response.ok) throw new Error(data.message || "Registration failed.");

      const session = {
        accessToken: String(data.accessToken || data.token || ""),
        refreshToken: data.refreshToken ? String(data.refreshToken) : null,
        user: {
          id: String(data.user?.id || data.user?._id || ""),
          _id: data.user?._id ? String(data.user._id) : undefined,
          name: String(data.user?.name || ""),
          email: String(data.user?.email || ""),
          phone: data.user?.phone ? String(data.user.phone) : null,
          role: String(data.user?.role || "MERCHANT"),
          shopId: data.user?.shopId ? String(data.user.shopId) : null,
        },
      };
      if (session.accessToken) {
        localStorage.setItem(storageKeys.session, JSON.stringify(session));
        localStorage.setItem(storageKeys.accessToken, session.accessToken);
        if (session.refreshToken) localStorage.setItem(storageKeys.refreshToken, session.refreshToken);
        setSession(session);
      }
      router.replace("/onboarding");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to register merchant.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-6xl content-center gap-8 px-4 py-8 lg:grid-cols-[1fr_420px]">
      <div className="flex flex-col justify-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Merchant registration</p>
        <h1 className="dx-display mt-4 text-4xl font-semibold">Create draft shop, then complete KYC.</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Payment and withdrawal stay locked until KYC is submitted and verified. This keeps the money flow safe before the shop goes active.
        </p>
        <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
          {["Phone + password", "Agent optional", "KYC required"].map((item) => (
            <div key={item} className="rounded-xl border border-border bg-card p-4">{item}</div>
          ))}
        </div>
      </div>
      <Card className="self-center rounded-xl p-6">
        <CardTitle>Register shop</CardTitle>
        <CardDescription className="mt-2">Use phone-first registration. Agent ID is optional.</CardDescription>
        <div className="mt-6 grid gap-4">
          <TextInput label="Shop name" value={form.shopName} onChange={(event) => setForm((current) => ({ ...current, shopName: event.target.value }))} />
          <TextInput label="Phone" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
          <TextInput label="Password" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
          <TextInput label="Agent ID (optional)" value={form.agentId} onChange={(event) => setForm((current) => ({ ...current, agentId: event.target.value }))} />
          <Button onClick={submit} loading={submitting} loadingText="Registering">Create draft shop</Button>
          <Button asChild variant="secondary"><Link href="/login">Already registered? Login</Link></Button>
          {message ? <Alert variant="error">{message}</Alert> : null}
        </div>
      </Card>
    </main>
  );
}
