"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Card, CardDescription, CardTitle, Skeleton, TextInput } from "@dokanx/ui";

import { getProductReviews, submitProductReview } from "@/lib/runtime-api";

type ReviewRow = {
  id: string;
  name: string;
  rating: number;
  message: string;
};

export function ProductReviewsPanel({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [name, setName] = useState("");
  const [rating, setRating] = useState("5");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [jumpTo, setJumpTo] = useState("1");
  const [loadingAll, setLoadingAll] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [loadAllCancelling, setLoadAllCancelling] = useState(false);
  const [loadAllStatus, setLoadAllStatus] = useState<string | null>(null);
  const loadAllAbortRef = useRef(false);
  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil((totalCount || reviews.length) / pageSize));

  useEffect(() => {
    let active = true;
    async function load() {
      if (!productId) return;
      setLoading(true);
      try {
        const response = await getProductReviews(productId, { page: String(page), limit: String(pageSize) });
        if (!active) return;
        const rows =
          response.data?.map((review) => ({
            id: String(review._id || ""),
            name: review.reviewerName || "Guest",
            rating: Number(review.rating || 0),
            message: String(review.message || ""),
          })) || [];
        const cleaned = rows.filter((row) => row.id);
        setReviews((current) => (page === 1 ? cleaned : [...current, ...cleaned]));
        setLoadedCount((current) => (page === 1 ? cleaned.length : current + cleaned.length));
        const countFromApi = typeof response.count === "number" ? response.count : 0;
        setTotalCount((prev) => {
          if (countFromApi) return countFromApi;
          if (page === 1) return cleaned.length;
          return Math.max(prev, prev + cleaned.length);
        });
        setHasMore(cleaned.length >= pageSize);
      } catch {
        if (!active) return;
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [page, productId]);

  useEffect(() => {
    setPage(1);
    setReviews([]);
    setHasMore(false);
    setTotalCount(0);
    setJumpTo("1");
    setLoadedCount(0);
    setLoadingAll(false);
    setLoadAllCancelling(false);
    setLoadAllStatus(null);
    loadAllAbortRef.current = false;
  }, [productId]);

  const breakdown = useMemo(() => {
    const counts = [5, 4, 3, 2, 1].map((value) => ({
      rating: value,
      count: reviews.filter((review) => review.rating === value).length,
    }));
    const total = reviews.length || 1;
    const average = reviews.reduce((sum, review) => sum + review.rating, 0) / total;
    return { counts, average: average.toFixed(1), total: reviews.length };
  }, [reviews]);

  async function handleSubmit() {
    if (!name.trim() || !message.trim()) {
      setStatus("Name and review message are required.");
      return;
    }
    const parsedRating = Math.max(1, Math.min(5, Number(rating) || 5));
    setStatus(null);
    try {
      const response = await submitProductReview(productId, {
        reviewerName: name.trim(),
        rating: parsedRating,
        message: message.trim(),
      });
      const created = response.data || {};
      setReviews((current) => [
        {
          id: String(created._id || `r-${Date.now()}`),
          name: String(created.reviewerName || name.trim()),
          rating: Number(created.rating || parsedRating),
          message: String(created.message || message.trim()),
        },
        ...current,
      ]);
      setName("");
      setRating("5");
      setMessage("");
      setStatus("Thanks! Your review has been submitted.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to submit review.");
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardTitle>Ratings breakdown</CardTitle>
        <CardDescription className="mt-2">
          {breakdown.average} ★ average from {totalCount || breakdown.total} reviews
        </CardDescription>
        <div className="mt-6 grid gap-3">
          {breakdown.counts.map((row) => (
            <div key={row.rating} className="flex items-center gap-3 text-sm">
              <span className="w-12">{row.rating}★</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(row.count / Math.max(1, breakdown.total)) * 100}%` }}
                />
              </div>
              <span className="w-10 text-right text-muted-foreground">{row.count}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle>Write a review</CardTitle>
        <CardDescription className="mt-2">Share your experience with this product.</CardDescription>
        <div className="mt-6 grid gap-4">
          <TextInput placeholder="Your name" value={name} onChange={(event) => setName(event.target.value)} />
          <TextInput placeholder="Rating (1-5)" value={rating} onChange={(event) => setRating(event.target.value)} />
          <TextInput placeholder="Your review" value={message} onChange={(event) => setMessage(event.target.value)} />
          <Button onClick={handleSubmit}>Submit review</Button>
          {status ? <Alert variant="info">{status}</Alert> : null}
        </div>
      </Card>

      <div className="grid gap-4">
        {loading && !reviews.length ? (
          <div className="grid gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={`skeleton-${index}`} className="border-border/60">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-3 h-3 w-20" />
                <Skeleton className="mt-4 h-3 w-full" />
                <Skeleton className="mt-2 h-3 w-5/6" />
              </Card>
            ))}
          </div>
        ) : null}
        {reviews.map((review) => (
          <Card key={review.id} className="border-border/60">
            <CardTitle>{review.name}</CardTitle>
            <CardDescription className="mt-1">{review.rating} ★</CardDescription>
            <p className="mt-3 text-sm text-muted-foreground">{review.message}</p>
          </Card>
        ))}
        {!loading && !reviews.length ? (
          <Card className="border-border/60">
            <CardTitle>No reviews yet</CardTitle>
            <CardDescription className="mt-2">
              Be the first to share feedback for this product.
            </CardDescription>
          </Card>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Showing {reviews.length} of {totalCount || reviews.length} reviews
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Page {page} / {totalPages}</span>
            <TextInput
              value={jumpTo}
              onChange={(event) => setJumpTo(event.target.value)}
              placeholder="Go to"
              className="h-9 w-20"
            />
            <Button
              variant="outline"
              onClick={() => {
                const next = Math.min(totalPages, Math.max(1, Number(jumpTo) || 1));
                setReviews([]);
                setPage(next);
              }}
              disabled={loadingAll}
            >
              Jump
            </Button>
            {loadingAll ? (
              <Button
                variant="outline"
                onClick={() => {
                  loadAllAbortRef.current = true;
                  setLoadAllCancelling(true);
                }}
                disabled={loadAllCancelling}
              >
                {loadAllCancelling ? "Cancelling..." : "Cancel load all"}
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={async () => {
                  if (!productId || loadingAll) return;
                  setLoadingAll(true);
                  setLoadAllCancelling(false);
                  setLoadAllStatus(null);
                  loadAllAbortRef.current = false;
                  setReviews([]);
                  setLoadedCount(0);
                  const total = totalCount || totalPages * pageSize;
                  const pages = Math.max(1, Math.ceil(total / pageSize));
                  let lastPageLoaded = 0;
                  let loadedTotal = 0;
                  for (let nextPage = 1; nextPage <= pages; nextPage += 1) {
                    if (loadAllAbortRef.current) break;
                    const response = await getProductReviews(productId, { page: String(nextPage), limit: String(pageSize) });
                    if (loadAllAbortRef.current) break;
                    const rows =
                      response.data?.map((review) => ({
                        id: String(review._id || ""),
                        name: review.reviewerName || "Guest",
                        rating: Number(review.rating || 0),
                        message: String(review.message || ""),
                      })) || [];
                    const cleaned = rows.filter((row) => row.id);
                    setReviews((current) => [...current, ...cleaned]);
                    setLoadedCount((current) => current + cleaned.length);
                    loadedTotal += cleaned.length;
                    lastPageLoaded = nextPage;
                  }
                  if (loadAllAbortRef.current) {
                    const safePage = Math.max(1, lastPageLoaded);
                    setPage(safePage);
                    setHasMore(safePage < pages);
                    setLoadingAll(false);
                    setLoadAllCancelling(false);
                    setLoadAllStatus(`Load all cancelled at page ${safePage} (${loadedTotal} reviews loaded).`);
                    return;
                  }
                  setHasMore(false);
                  setPage(pages);
                  setLoadingAll(false);
                  setLoadAllCancelling(false);
                  setLoadAllStatus(`Loaded all ${loadedTotal} reviews.`);
                }}
              >
                Load all
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => setPage((current) => current + 1)}
              disabled={!hasMore || loading || loadingAll}
            >
            {loading ? "Loading..." : "Load more"}
          </Button>
          </div>
        </div>
        {loadingAll ? (
          <div className="mt-2 text-xs text-muted-foreground">
            Loading {loadedCount} / {totalCount || totalPages * pageSize} reviews...
          </div>
        ) : null}
        {loadAllStatus ? <Alert variant="info">{loadAllStatus}</Alert> : null}
      </div>
    </div>
  );
}
