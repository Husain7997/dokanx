"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnalyticsCards, Card, CardDescription, CardTitle, CustomerTable } from "@dokanx/ui";

import { listAnalyticsSnapshots, listCustomers } from "@/lib/runtime-api";

type CustomerRow = {
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  createdAt?: string;
  orderCount?: number;
  totalSpend?: number;
  totalDue?: number;
  creditSales?: number;
  globalCustomerId?: string;
  spendByChannel?: Record<string, { orderCount?: number; totalSpend?: number }>;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [repeatRate, setRepeatRate] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [response, analyticsResponse] = await Promise.all([
          listCustomers(),
          listAnalyticsSnapshots({ metricType: "CUSTOMER_REPEAT_RATE" }),
        ]);
        if (!active) return;
        setCustomers(Array.isArray(response.data) ? (response.data as CustomerRow[]) : []);
        const snapshots = Array.isArray(analyticsResponse.data) ? analyticsResponse.data : [];
        const repeatSnapshot = snapshots[0]?.payload as { repeatRate?: number } | undefined;
        setRepeatRate(Number(repeatSnapshot?.repeatRate || 0));
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load customers.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const cards = useMemo(() => {
    const newThisWeek = customers.filter((customer) => {
      if (!customer.createdAt) return false;
      const createdAt = new Date(customer.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return createdAt >= weekAgo;
    }).length;
    const atRisk = customers.filter((customer) => Number(customer.orderCount || 0) <= 1).length;
    const totalDue = customers.reduce((sum, customer) => sum + Number(customer.totalDue || 0), 0);

    return [
      { label: "Customers", value: String(customers.length), meta: "Live customer accounts" },
      { label: "Active", value: String(customers.length), meta: "Total linked to this shop" },
      { label: "New this week", value: String(newThisWeek), meta: "Created in the last 7 days" },
      { label: "Repeat rate", value: `${Math.round(repeatRate * 100)}%`, meta: "Returning customers" },
      { label: "Open due", value: `${totalDue} BDT`, meta: "Outstanding customer credit" },
      { label: "At Risk", value: String(atRisk), meta: "Single-order customers" },
    ];
  }, [customers, repeatRate]);

  return (
    <div className="grid gap-6">
      <AnalyticsCards items={cards} />
      {error ? (
        <Card>
          <CardTitle>Customers</CardTitle>
          <CardDescription className="mt-2">{error}</CardDescription>
        </Card>
      ) : null}
      <CustomerTable
        rows={customers.map((customer) => ({
          customer: customer.name || "Customer",
          email: customer.email || "Unknown",
          orders: String(customer.orderCount ?? 0),
          value: `${customer.totalSpend ?? 0} BDT | Due ${customer.totalDue ?? 0} BDT${customer.creditSales ? ` | Credit ${customer.creditSales}` : ""}${customer.spendByChannel ? ` (${["WEB", "MOBILE", "POS"].map((channel) => {
            const entry = customer.spendByChannel?.[channel];
            return `${channel}:${entry?.totalSpend ?? 0}`;
          }).join(" / ")})` : ""}`,
        }))}
      />
      <Card>
        <CardTitle>CRM deep view</CardTitle>
        <CardDescription className="mt-2">Open a customer drill-down for purchase, due, payments, and claims.</CardDescription>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {customers.slice(0, 6).map((customer) => (
            <Link
              key={String(customer.globalCustomerId || customer._id || customer.email || "")}
              href={`/customers/${encodeURIComponent(String(customer.globalCustomerId || ""))}`}
              className="rounded-2xl border border-border/60 p-4 text-sm hover:bg-accent/20"
            >
              <p className="font-medium">{customer.name || "Customer"}</p>
              <p className="text-xs text-muted-foreground">{customer.phone || customer.email || "No contact"}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Spend {customer.totalSpend ?? 0} BDT • Due {customer.totalDue ?? 0} BDT
              </p>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
