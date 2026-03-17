"use client";

import { useEffect, useMemo, useState } from "react";
import { AnalyticsCards, Card, CardDescription, CardTitle } from "@dokanx/ui";

import { listShopReviews } from "@/lib/runtime-api";

type ReviewRow = {
  _id?: string;
  productId?: string;
  reviewerName?: string;
  rating?: number;
  message?: string;
  status?: string;
  createdAt?: string;
};

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await listShopReviews(statusFilter, 100);
        if (!active) return;
        setReviews(Array.isArray(response.data) ? (response.data as ReviewRow[]) : []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load reviews.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [statusFilter]);

  const cards = useMemo(() => {
    const total = reviews.length;
    const pending = reviews.filter((row) => row.status === "PENDING").length;
    const approved = reviews.filter((row) => row.status === "APPROVED").length;
    const rejected = reviews.filter((row) => row.status === "REJECTED").length;
    return [
      { label: "Total reviews", value: String(total), meta: "Customer feedback" },
      { label: "Pending", value: String(pending), meta: "Awaiting moderation" },
      { label: "Approved", value: String(approved), meta: "Visible on storefront" },
      { label: "Rejected", value: String(rejected), meta: "Hidden from storefront" },
    ];
  }, [reviews]);

  return (
    <div className="grid gap-6">
      <AnalyticsCards items={cards} />
      <Card>
        <CardTitle>Review moderation</CardTitle>
        <CardDescription className="mt-2">Monitor customer feedback tied to your products.</CardDescription>
        <div className="mt-4 flex flex-wrap gap-2">
          {["ALL", "PENDING", "APPROVED", "REJECTED"].map((value) => (
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
          {reviews.map((row) => (
            <div key={String(row._id || row.productId)} className="grid gap-2 rounded-2xl border border-border/60 px-4 py-3">
              <div className="flex flex-wrap justify-between gap-2">
                <span>{row.reviewerName || "Customer"}</span>
                <span>{row.rating ?? 0} â˜…</span>
                <span>{row.status || "PENDING"}</span>
                <span>{row.createdAt ? new Date(row.createdAt).toLocaleString() : "Pending"}</span>
              </div>
              <p>{row.message || "No review message provided."}</p>
            </div>
          ))}
          {!reviews.length && !error ? (
            <p>No reviews yet.</p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
