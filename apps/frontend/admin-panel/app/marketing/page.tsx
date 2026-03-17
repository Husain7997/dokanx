"use client";

import { Card, CardDescription, CardTitle } from "@dokanx/ui";

export default function MarketingPage() {
  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="dx-display text-3xl">Marketing</h1>
        <p className="text-sm text-muted-foreground">Global promotions, coupons, and campaigns.</p>
      </div>
      <Card>
        <CardTitle>Campaign control</CardTitle>
        <CardDescription className="mt-2">
          Use this space to manage platform-wide promotions, hero banners, and flash sales.
        </CardDescription>
      </Card>
      <Card>
        <CardTitle>Referral & loyalty</CardTitle>
        <CardDescription className="mt-2">
          Configure referral incentives, loyalty tiers, and seasonal rewards.
        </CardDescription>
      </Card>
    </div>
  );
}
