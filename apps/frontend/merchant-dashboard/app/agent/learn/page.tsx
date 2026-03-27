"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Card, CardDescription, CardTitle } from "@dokanx/ui";

import { getAgentMe } from "@/lib/runtime-api";

type AgentProfile = {
  agentCode?: string;
  referralLink?: string;
  clickCount?: number;
  shopConversionCount?: number;
  totalEarnings?: number;
  status?: string;
};

const modules = [
  {
    title: "Video walkthrough",
    body: "Explain the pitch, qualification flow, and how to move a Facebook lead into a live shop.",
  },
  {
    title: "Agent guide",
    body: "Share your referral link, help the merchant complete shop setup, then follow the first payment signal.",
  },
  {
    title: "Onboarding checklist",
    body: "Lead captured, account created, referral link shared, shop converted, first payment confirmed.",
  },
];

export default function AgentLearnPage() {
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    getAgentMe()
      .then((response) => {
        if (!active) return;
        setProfile((response.data || null) as AgentProfile | null);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load agent profile.");
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Agent</p>
        <h1 className="dx-display text-3xl">Learn</h1>
        <p className="text-sm text-muted-foreground">Use the training materials and referral link to onboard shops.</p>
      </div>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <Card>
        <CardTitle>Referral workspace</CardTitle>
        <CardDescription className="mt-2">Your code, performance, and shareable join link.</CardDescription>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-border/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Code</p>
            <p className="mt-2 text-lg font-semibold">{profile?.agentCode || "-"}</p>
          </div>
          <div className="rounded-2xl border border-border/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Clicks</p>
            <p className="mt-2 text-lg font-semibold">{profile?.clickCount ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-border/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Conversions</p>
            <p className="mt-2 text-lg font-semibold">{profile?.shopConversionCount ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-border/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Earnings</p>
            <p className="mt-2 text-lg font-semibold">{profile?.totalEarnings ?? 0} BDT</p>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-border/60 p-4">
          <p className="text-sm font-semibold">Referral link</p>
          <p className="mt-2 break-all text-sm text-muted-foreground">{profile?.referralLink || "Not available yet."}</p>
          <Button
            className="mt-4"
            variant="secondary"
            onClick={async () => {
              if (!profile?.referralLink) return;
              await navigator.clipboard.writeText(profile.referralLink);
              setCopied(true);
            }}
          >
            {copied ? "Copied" : "Copy referral link"}
          </Button>
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        {modules.map((item) => (
          <Card key={item.title}>
            <CardTitle>{item.title}</CardTitle>
            <CardDescription className="mt-2">{item.body}</CardDescription>
          </Card>
        ))}
      </div>
    </div>
  );
}
