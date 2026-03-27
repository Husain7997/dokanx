"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, CardDescription, CardTitle } from "@dokanx/ui";

import { getCustomerDue, getCustomerProfile, payCustomerDue } from "@/lib/runtime-api";

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const customerId = String(params.id || "");
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [due, setDue] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [profileResponse, dueResponse] = await Promise.all([
          getCustomerProfile(customerId),
          getCustomerDue(customerId),
        ]);
        if (!active) return;
        setProfile((profileResponse.data || null) as Record<string, unknown> | null);
        setDue((dueResponse.data || null) as Record<string, unknown> | null);
      } catch (error) {
        if (!active) return;
        setStatus(error instanceof Error ? error.message : "Unable to load customer profile.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [customerId]);

  const customer = (profile?.customer || {}) as Record<string, unknown>;
  const orders = Array.isArray(profile?.orders) ? (profile?.orders as Array<Record<string, unknown>>) : [];
  const payments = Array.isArray(profile?.payments) ? (profile?.payments as Array<Record<string, unknown>>) : [];
  const claims = Array.isArray(profile?.claims) ? (profile?.claims as Array<Record<string, unknown>>) : [];
  const totalPurchase = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0),
    [orders]
  );

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Merchant CRM</p>
        <h1 className="dx-display text-3xl">{String(customer.name || "Customer")}</h1>
        <p className="text-sm text-muted-foreground">{String(customer.phone || customer.email || customerId)}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Total purchase" value={`${totalPurchase} BDT`} />
        <MetricCard title="Total due" value={`${Number(due?.totalDue || 0)} BDT`} />
        <MetricCard title="Payments" value={String(payments.length)} />
        <MetricCard title="Claims" value={String(claims.length)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Quick actions</CardTitle>
          <CardDescription className="mt-2">Call, remind, or collect from the customer profile.</CardDescription>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild>
              <a href={`tel:${String(customer.phone || "")}`}>Call customer</a>
            </Button>
            <Button asChild variant="secondary">
              <a href={`sms:${String(customer.phone || "")}?body=${encodeURIComponent("Payment reminder from your DokanX merchant.")}`}>Send reminder</a>
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  await payCustomerDue({
                    customerId,
                    amount: Number(due?.totalDue || 0),
                    referenceId: `merchant-collect-${Date.now()}`,
                    metadata: { source: "merchant-crm" },
                  });
                  const refreshed = await getCustomerDue(customerId);
                  setDue((refreshed.data || null) as Record<string, unknown> | null);
                  setStatus("Due collected.");
                } catch (error) {
                  setStatus(error instanceof Error ? error.message : "Unable to collect due.");
                }
              }}
              disabled={Number(due?.totalDue || 0) <= 0}
            >
              Collect due
            </Button>
          </div>
          {status ? <p className="mt-3 text-xs text-muted-foreground">{status}</p> : null}
        </Card>

        <Card>
          <CardTitle>Due by shop</CardTitle>
          <CardDescription className="mt-2">Current due ledger distribution.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {(Array.isArray(due?.shopWiseDue) ? (due?.shopWiseDue as Array<Record<string, unknown>>) : []).map((row, index) => (
              <div key={`${String(row.shopId || index)}`} className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
                <span>{String(row.shopId || "Shop")}</span>
                <span>{Number(row.amount || 0)} BDT</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>Order history</CardTitle>
        <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
          {orders.map((order, index) => (
            <div key={`${String(order._id || index)}`} className="rounded-2xl border border-border/60 px-4 py-3">
              <p className="font-medium text-foreground">Order {String(order._id || "")}</p>
              <p>Status {String(order.status || "PENDING")} • {Number(order.totalAmount || 0)} BDT</p>
            </div>
          ))}
          {!orders.length ? <p>No orders found.</p> : null}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Payment history</CardTitle>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            {payments.map((payment, index) => (
              <div key={`${String(payment._id || index)}`} className="rounded-2xl border border-border/60 px-4 py-3">
                <p className="font-medium text-foreground">{Number(payment.amount || 0)} BDT</p>
                <p>{String(payment.type || payment.status || "PAYMENT")}</p>
              </div>
            ))}
            {!payments.length ? <p>No payments found.</p> : null}
          </div>
        </Card>

        <Card>
          <CardTitle>Claims history</CardTitle>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            {claims.map((claim, index) => (
              <div key={`${String(claim._id || index)}`} className="rounded-2xl border border-border/60 px-4 py-3">
                <p className="font-medium text-foreground">
                  {String(claim.type || "CLAIM").toUpperCase()} • {String(claim.status || "pending").toUpperCase()}
                </p>
                <p>{String(claim.reason || "")}</p>
              </div>
            ))}
            {!claims.length ? <p>No claims found.</p> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </Card>
  );
}
