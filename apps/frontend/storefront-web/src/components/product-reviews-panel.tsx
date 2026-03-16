"use client";

import { useMemo, useState } from "react";
import { Button, Card, CardDescription, CardTitle, Input } from "@dokanx/ui";

type ReviewRow = {
  id: string;
  name: string;
  rating: number;
  message: string;
};

export function ProductReviewsPanel() {
  const [reviews, setReviews] = useState<ReviewRow[]>([
    { id: "r1", name: "Nadia", rating: 5, message: "Fast delivery and great quality." },
    { id: "r2", name: "Rafi", rating: 4, message: "Good value for money." },
    { id: "r3", name: "Tahsin", rating: 5, message: "Loved the packaging and support." },
  ]);
  const [name, setName] = useState("");
  const [rating, setRating] = useState("5");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const breakdown = useMemo(() => {
    const counts = [5, 4, 3, 2, 1].map((value) => ({
      rating: value,
      count: reviews.filter((review) => review.rating === value).length,
    }));
    const total = reviews.length || 1;
    const average = reviews.reduce((sum, review) => sum + review.rating, 0) / total;
    return { counts, average: average.toFixed(1), total: reviews.length };
  }, [reviews]);

  function handleSubmit() {
    if (!name.trim() || !message.trim()) {
      setStatus("Name and review message are required.");
      return;
    }
    const parsedRating = Math.max(1, Math.min(5, Number(rating) || 5));
    setReviews((current) => [
      {
        id: `r-${Date.now()}`,
        name: name.trim(),
        rating: parsedRating,
        message: message.trim(),
      },
      ...current,
    ]);
    setName("");
    setRating("5");
    setMessage("");
    setStatus("Thanks! Your review has been submitted.");
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardTitle>Ratings breakdown</CardTitle>
        <CardDescription className="mt-2">
          {breakdown.average} ★ average from {breakdown.total} reviews
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
          <Input placeholder="Your name" value={name} onChange={(event) => setName(event.target.value)} />
          <Input placeholder="Rating (1-5)" value={rating} onChange={(event) => setRating(event.target.value)} />
          <Input placeholder="Your review" value={message} onChange={(event) => setMessage(event.target.value)} />
          <Button onClick={handleSubmit}>Submit review</Button>
          {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
        </div>
      </Card>

      <div className="grid gap-4">
        {reviews.map((review) => (
          <Card key={review.id} className="border-border/60">
            <CardTitle>{review.name}</CardTitle>
            <CardDescription className="mt-1">{review.rating} ★</CardDescription>
            <p className="mt-3 text-sm text-muted-foreground">{review.message}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
