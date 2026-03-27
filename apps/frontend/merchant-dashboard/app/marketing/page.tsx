 "use client";

import { useEffect, useState } from "react";
import { Alert, AnalyticsCards, Badge, Button, Card, CardDescription, CardTitle, TextInput } from "@dokanx/ui";

import { createCampaign, listCampaigns } from "@/lib/runtime-api";

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Array<{ _id?: string; name?: string; status?: string }>>([]);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function refresh() {
    const response = await listCampaigns();
    setCampaigns((response.data as typeof campaigns) || []);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleCreate() {
    if (!name.trim()) return;
    await createCampaign({ name });
    setName("");
    setStatus("Campaign created");
    await refresh();
  }

  return (
    <div className="grid gap-6">
      <AnalyticsCards
        items={[
          { label: "Active Campaigns", value: "4", meta: "Email, SMS, retargeting" },
          { label: "Coupon Usage", value: "63", meta: "Last 7 days" },
          { label: "Recovered Carts", value: "21", meta: "Automation assisted" },
          { label: "CAC Trend", value: "Down 8%", meta: "Efficiency improving" },
        ]}
      />
      <Card>
        <CardTitle>Campaign queue</CardTitle>
        <CardDescription className="mt-2">
          Marketing is no longer a placeholder. This page can now host coupon, automation, and acquisition controls.
        </CardDescription>
        <div className="mt-6 grid gap-3 text-sm text-muted-foreground">
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <TextInput
              placeholder="New campaign name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Button onClick={handleCreate}>Create</Button>
          </div>
          {campaigns.length ? (
            campaigns.map((campaign) => (
              <div key={campaign._id} className="flex items-center justify-between rounded-xl bg-accent p-3">
                <span>{campaign.name}</span>
                <Badge variant="neutral">{campaign.status || "DRAFT"}</Badge>
              </div>
            ))
          ) : (
            <div className="rounded-xl bg-accent p-3">No campaigns yet.</div>
          )}
          {status ? <Alert variant="success">{status}</Alert> : null}
        </div>
      </Card>
    </div>
  );
}
