"use client";

import { useEffect, useMemo, useState } from "react";
import { AnalyticsCards, Card, CardDescription, CardTitle, CustomerTable } from "@dokanx/ui";

import { listCustomers } from "@/lib/runtime-api";

type CustomerRow = {
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  createdAt?: string;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await listCustomers();
        if (!active) return;
        setCustomers(Array.isArray(response.data) ? (response.data as CustomerRow[]) : []);
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
    return [
      { label: "Customers", value: String(customers.length), meta: "Live customer accounts" },
      { label: "Active", value: String(customers.length), meta: "Total linked to this shop" },
      { label: "New this week", value: "0", meta: "Awaiting analytics pipeline" },
      { label: "At Risk", value: "0", meta: "Churn model coming soon" },
    ];
  }, [customers.length]);

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
          orders: "0",
          value: "0 BDT",
        }))}
      />
    </div>
  );
}
