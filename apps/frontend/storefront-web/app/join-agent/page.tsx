"use client";

import { useState } from "react";
import { Alert, Button, Card, CardDescription, CardTitle, TextInput } from "@dokanx/ui";

import { registerAgentFromLead } from "@/lib/runtime-api";

export default function JoinAgentPage() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    district: "",
    experience: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    email?: string;
    tempPassword?: string;
    referralLink?: string;
  } | null>(null);

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await registerAgentFromLead({
        ...form,
        source: "facebook",
      });
      setSuccess({
        email: response.data?.user?.email,
        tempPassword: response.data?.tempPassword,
        referralLink: response.data?.agent?.referralLink,
      });
      setForm({ name: "", phone: "", district: "", experience: "" });
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to create agent account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-160px)] max-w-4xl gap-8 px-6 py-12 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[32px] border border-border/50 bg-card/70 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">DokanX Growth Funnel</p>
        <h1 className="mt-4 text-4xl font-semibold">Join as an agent and start onboarding shops.</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Facebook leads go straight into account creation. Submit the form, receive login details over SMS, and start
          sharing your referral link.
        </p>
      </div>

      <Card className="rounded-[32px] border border-border/50 bg-card/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
        <CardTitle>Agent registration</CardTitle>
        <CardDescription className="mt-2">Create the agent account directly from the lead form.</CardDescription>
        <div className="mt-6 grid gap-4">
          <TextInput label="Name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          <TextInput label="Phone" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
          <TextInput label="District" value={form.district} onChange={(event) => setForm((current) => ({ ...current, district: event.target.value }))} />
          <TextInput
            label="Experience"
            value={form.experience}
            onChange={(event) => setForm((current) => ({ ...current, experience: event.target.value }))}
          />
          <Button onClick={handleSubmit} loading={busy} loadingText="Creating account">
            Submit lead
          </Button>
          {error ? <Alert variant="error">{error}</Alert> : null}
          {success ? (
            <Alert variant="success">
              Account created. Email: {success.email}. Temporary password: {success.tempPassword}. Referral link:{" "}
              {success.referralLink}
            </Alert>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
