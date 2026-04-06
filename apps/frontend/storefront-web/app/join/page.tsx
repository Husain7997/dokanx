"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert, Button, Card, CardDescription, CardTitle, Logo } from "@dokanx/ui";

import { trackAgentReferralClick } from "@/lib/runtime-api";

const referralStorageKey = "dokanx.agent-ref";

export default function JoinWithReferralPage() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref") || "";
  const [message, setMessage] = useState<string>("Recording referral...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ref) {
      setError("Referral code is missing from this link.");
      return;
    }

    window.localStorage.setItem(referralStorageKey, ref);

    let active = true;
    trackAgentReferralClick(ref)
      .then((response) => {
        if (!active) return;
        setMessage(`Referral ${response.data?.agentCode || ref} tracked. Continue to create your shop account.`);
      })
      .catch((trackingError) => {
        if (!active) return;
        setError(trackingError instanceof Error ? trackingError.message : "Unable to track referral.");
      });

    return () => {
      active = false;
    };
  }, [ref]);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-160px)] max-w-3xl items-center px-6 py-12">
      <Card className="w-full rounded-[32px] border border-border/50 bg-card/85 p-8 shadow-[0_20px_60px_rgba(11,30,60,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Logo variant="full" size="md" className="max-w-full" />
            <CardTitle className="mt-4">Join with agent referral</CardTitle>
            <CardDescription className="mt-2 max-w-2xl">
              This page records the referral visit so the agent receives credit when the merchant account converts.
            </CardDescription>
          </div>
          <div className="rounded-3xl border border-border/70 bg-[linear-gradient(135deg,rgba(255,122,0,0.12),rgba(255,165,0,0.18))] p-2">
            <Logo variant="icon" size="md" />
          </div>
        </div>
        <div className="mt-6 grid gap-4">
          {error ? <Alert variant="error">{error}</Alert> : <Alert variant="success">{message}</Alert>}
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => window.location.assign("/join-agent")} type="secondary">
              Become an agent instead
            </Button>
            <Button onClick={() => window.location.assign("http://localhost:3002/sign-in")}>
              Continue to merchant workspace
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

