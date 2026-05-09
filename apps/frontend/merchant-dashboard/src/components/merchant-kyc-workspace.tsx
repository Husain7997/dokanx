"use client";

import { useState } from "react";
import { useAuthStore } from "@dokanx/auth";
import { Alert, Button, Card, CardDescription, CardTitle, TextInput } from "@dokanx/ui";
import { getApiBaseUrl } from "@dokanx/utils";

export function MerchantKycWorkspace() {
  const token = useAuthStore((state) => state.accessToken);
  const [form, setForm] = useState({
    nationalIdNumber: "",
    tradeLicenseNumber: "",
    nationalIdFrontUrl: "",
    nationalIdBackUrl: "",
    tradeLicenseUrl: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"info" | "success" | "error">("info");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch(`${getApiBaseUrl()}/merchants/kyc/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Unable to submit KYC.");
      setTone("success");
      setMessage(data.message || "KYC submitted. Payments and withdrawals remain locked until verification.");
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Unable to submit KYC.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-5xl content-center gap-6 px-4 py-8">
      <Card className="rounded-xl p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">KYC onboarding</p>
        <CardTitle className="mt-3 text-3xl">Draft -&gt; Submitted -&gt; Verified -&gt; Active shop</CardTitle>
        <CardDescription className="mt-2">
          Submit merchant identity and trade documents. Until verification is complete, payment and withdrawal actions are blocked.
        </CardDescription>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <TextInput label="National ID number" value={form.nationalIdNumber} onChange={(event) => setForm((current) => ({ ...current, nationalIdNumber: event.target.value }))} />
          <TextInput label="Trade license number" value={form.tradeLicenseNumber} onChange={(event) => setForm((current) => ({ ...current, tradeLicenseNumber: event.target.value }))} />
          <TextInput label="NID front URL" value={form.nationalIdFrontUrl} onChange={(event) => setForm((current) => ({ ...current, nationalIdFrontUrl: event.target.value }))} />
          <TextInput label="NID back URL" value={form.nationalIdBackUrl} onChange={(event) => setForm((current) => ({ ...current, nationalIdBackUrl: event.target.value }))} />
          <TextInput label="Trade license URL" value={form.tradeLicenseUrl} onChange={(event) => setForm((current) => ({ ...current, tradeLicenseUrl: event.target.value }))} />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={submit} loading={submitting} loadingText="Submitting KYC">Submit KYC</Button>
          <Button asChild variant="secondary"><a href="/dashboard">Go to dashboard</a></Button>
        </div>
        {message ? <Alert className="mt-5" variant={tone}>{message}</Alert> : null}
      </Card>
    </main>
  );
}
