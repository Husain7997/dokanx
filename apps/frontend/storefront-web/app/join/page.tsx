"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert, Button, Card, CardDescription, CardTitle } from "@dokanx/ui";

import { trackAgentReferralClick } from "@/lib/runtime-api";

const referralStorageKey = "dokanx.agent-ref";

export default function JoinWithReferralPage() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref") || "";
  const [message, setMessage] = useState<string>("Tracking referral...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ref) {
      setError("Referral code missing.");
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
      <Card className="w-full rounded-[32px] border border-border/50 bg-card/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
        <CardTitle>Join with agent referral</CardTitle>
        <CardDescription className="mt-2">
          This page records the referral click so the agent gets credit when the shop converts.
        </CardDescription>
        <div className="mt-6 grid gap-4">
          {error ? <Alert variant="error">{error}</Alert> : <Alert variant="success">{message}</Alert>}
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => window.location.assign("/join-agent")} variant="secondary">
              Become an agent instead
            </Button>
            <Button onClick={() => window.location.assign("http://localhost:3002/sign-in")}>
              Continue to merchant sign in
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
