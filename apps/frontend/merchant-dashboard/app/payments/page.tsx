"use client";

import { useEffect, useMemo, useState } from "react";
import { AnalyticsCards, Card, CardDescription, CardTitle } from "@dokanx/ui";

import { listShopPayments } from "@/lib/runtime-api";

type PaymentRow = {
  _id?: string;
  order?: string;
  gateway?: string;
  providerPaymentId?: string;
  amount?: number;
  status?: string;
  createdAt?: string;
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await listShopPayments(statusFilter, 100);
        if (!active) return;
        setPayments(Array.isArray(response.data) ? (response.data as PaymentRow[]) : []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load payment logs.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [statusFilter]);

  const cards = useMemo(() => {
    const total = payments.length;
    const success = payments.filter((row) => row.status === "SUCCESS").length;
    const failed = payments.filter((row) => row.status === "FAILED").length;
    const pending = payments.filter((row) => row.status === "PENDING").length;
    return [
      { label: "Total attempts", value: String(total), meta: "Recent payments" },
      { label: "Success", value: String(success), meta: "Completed" },
      { label: "Pending", value: String(pending), meta: "Awaiting confirmation" },
      { label: "Failed", value: String(failed), meta: "Needs retry" },
    ];
  }, [payments]);

  return (
    <div className="grid gap-6">
      <AnalyticsCards items={cards} />
      <Card>
        <CardTitle>Payment logs</CardTitle>
        <CardDescription className="mt-2">Monitor payment attempts and settlement signals.</CardDescription>
        <div className="mt-4 flex flex-wrap gap-2">
          {["ALL", "SUCCESS", "PENDING", "FAILED"].map((value) => (
            <button
              key={value}
              className={`rounded-full border px-3 py-1 text-xs ${statusFilter === value ? "border-black bg-black text-white" : "border-white/60 bg-white text-foreground"}`}
              onClick={() => setStatusFilter(value)}
            >
              {value}
            </button>
          ))}
        </div>
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
          {payments.map((row) => (
            <div key={String(row._id || row.providerPaymentId)} className="flex flex-wrap justify-between gap-2 rounded-2xl border border-border/60 px-4 py-3">
              <span>{row.order || row.providerPaymentId || "Payment"}</span>
              <span>{row.gateway || "Gateway"}</span>
              <span>{row.amount ?? 0} BDT</span>
              <span>{row.status || "PENDING"}</span>
              <span>{row.createdAt ? new Date(row.createdAt).toLocaleString() : "Pending"}</span>
            </div>
          ))}
          {!payments.length && !error ? (
            <p>No payment attempts yet.</p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
