"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, CardDescription, CardTitle, DataTable, Input } from "@dokanx/ui";

import { approveProductReview, listProductReviews, rejectProductReview } from "@/lib/admin-runtime-api";

type ReviewRow = {
  _id?: string;
  reviewerName?: string;
  rating?: number;
  message?: string;
  status?: string;
  createdAt?: string;
};

export const dynamic = "force-dynamic";

export default function Page() {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [status, setStatus] = useState("PENDING");
  const [query, setQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredReviews = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return reviews.filter((review) => {
      if (ratingFilter !== "all" && String(review.rating ?? 0) !== ratingFilter) return false;
      if (!needle) return true;
      return (
        String(review.reviewerName || "").toLowerCase().includes(needle) ||
        String(review.message || "").toLowerCase().includes(needle)
      );
    });
  }, [query, ratingFilter, reviews]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await listProductReviews(status);
        if (!active) return;
        setReviews(Array.isArray(response.data) ? (response.data as ReviewRow[]) : []);
        setSelectedIds(new Set());
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load reviews.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [status]);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="dx-display text-3xl">Reviews</h1>
        <p className="text-sm text-muted-foreground">Moderate product reviews before publishing.</p>
      </div>
      {error ? (
        <Card>
          <CardTitle>Reviews</CardTitle>
          <CardDescription className="mt-2">{error}</CardDescription>
        </Card>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {["PENDING", "APPROVED", "REJECTED", "ALL"].map((value) => (
          <Button
            key={value}
            size="sm"
            variant={status === value ? "default" : "secondary"}
            onClick={() => setStatus(value)}
          >
            {value}
          </Button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px_auto_auto]">
        <Input
          placeholder="Search reviewer or message"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className="h-11 rounded-full border border-border bg-background px-4 text-sm"
          value={ratingFilter}
          onChange={(event) => setRatingFilter(event.target.value)}
        >
          <option value="all">All ratings</option>
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={String(value)}>
              {value} ★
            </option>
          ))}
        </select>
        <Button
          variant="secondary"
          disabled={!selectedIds.size}
          onClick={async () => {
            const ids = Array.from(selectedIds);
            for (const id of ids) {
              await approveProductReview(id);
            }
            const response = await listProductReviews(status);
            setReviews(Array.isArray(response.data) ? (response.data as ReviewRow[]) : []);
            setSelectedIds(new Set());
          }}
        >
          Bulk approve
        </Button>
        <Button
          variant="secondary"
          disabled={!selectedIds.size}
          onClick={async () => {
            const ids = Array.from(selectedIds);
            for (const id of ids) {
              await rejectProductReview(id);
            }
            const response = await listProductReviews(status);
            setReviews(Array.isArray(response.data) ? (response.data as ReviewRow[]) : []);
            setSelectedIds(new Set());
          }}
        >
          Bulk reject
        </Button>
      </div>
      <DataTable
        columns={[
          {
            key: "select",
            header: "",
            render: (row) => (
              <input
                type="checkbox"
                checked={selectedIds.has(row.id)}
                onChange={(event) => {
                  setSelectedIds((current) => {
                    const next = new Set(current);
                    if (event.target.checked) {
                      next.add(row.id);
                    } else {
                      next.delete(row.id);
                    }
                    return next;
                  });
                }}
              />
            ),
          },
          { key: "reviewer", header: "Reviewer" },
          { key: "rating", header: "Rating" },
          { key: "message", header: "Message" },
          { key: "status", header: "Status" },
          {
            key: "actions",
            header: "Actions",
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!row.id) return;
                    setBusyId(row.id);
                    try {
                      await approveProductReview(row.id);
                      const response = await listProductReviews(status);
                      setReviews(Array.isArray(response.data) ? (response.data as ReviewRow[]) : []);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Unable to approve review.");
                    } finally {
                      setBusyId(null);
                    }
                  }}
                  disabled={busyId === row.id}
                >
                  {busyId === row.id ? "Working..." : "Approve"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    if (!row.id) return;
                    setBusyId(row.id);
                    try {
                      await rejectProductReview(row.id);
                      const response = await listProductReviews(status);
                      setReviews(Array.isArray(response.data) ? (response.data as ReviewRow[]) : []);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Unable to reject review.");
                    } finally {
                      setBusyId(null);
                    }
                  }}
                  disabled={busyId === row.id}
                >
                  {busyId === row.id ? "Working..." : "Reject"}
                </Button>
              </div>
            ),
          },
        ]}
        rows={filteredReviews.map((review) => ({
          id: String(review._id || ""),
          reviewer: review.reviewerName || "Guest",
          rating: `${review.rating ?? 0} ★`,
          message: review.message || "",
          status: review.status || "PENDING",
        }))}
      />
    </div>
  );
}
