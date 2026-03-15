"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, CardDescription, CardTitle, OrderTimeline } from "@dokanx/ui";

import { getOrderDetail, initiatePayment } from "@/lib/runtime-api";

type OrderTrackingWorkspaceProps = {
  orderId: string;
};

type OrderRow = {
  _id?: string;
  status?: string;
  paymentStatus?: string;
  createdAt?: string;
};

export function OrderTrackingWorkspace({ orderId }: OrderTrackingWorkspaceProps) {
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [message, setMessage] = useState<string | null>("Authenticated order tracking will replace this fallback when the order is accessible.");
  const [retrying, setRetrying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("bkash");
  const [handoffUrl, setHandoffUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      try {
        const response = await getOrderDetail(orderId);
        if (response.data) {
          setOrder(response.data as OrderRow);
          setMessage(null);
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to load order tracking.");
      }
    }

    void loadOrder();
  }, [orderId]);

  const timeline = useMemo(() => {
    const status = String(order?.status || "PLACED").toUpperCase();
    const steps = ["PLACED", "PAYMENT_PENDING", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"];
    const currentIndex = Math.max(0, steps.indexOf(status));
    return steps.map((step, index) => ({
      title: step.replace(/_/g, " "),
      description: index === currentIndex ? `Current: ${step}` : "Pending",
      time: order?.createdAt || "Now",
    }));
  }, [order?.createdAt, order?.status]);

  async function handleRetry() {
    if (!orderId) return;
    setRetrying(true);
    setMessage(null);
    setHandoffUrl(null);

    try {
      const payment = await initiatePayment(orderId, {
        paymentMethod,
        hasOwnGateway: paymentMethod === "stripe",
      });
      setHandoffUrl(payment.paymentUrl || null);
      setMessage(payment.message || "Payment retry initiated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to retry payment.");
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardTitle>Order tracking</CardTitle>
        <CardDescription className="mt-2">
          Live order detail is fetched for the current customer, owner, or admin session.
        </CardDescription>
      </Card>
      <OrderTimeline
        items={[
          {
            title: `Order ${order?._id || orderId}`,
            description: order ? `${order.status || "PLACED"} / ${order.paymentStatus || "PENDING"}` : "Tracking pending",
            time: order?.createdAt || "Now",
          },
          ...timeline,
        ]}
      />
      {order?.paymentStatus === "FAILED" ? (
        <Card>
          <CardTitle>Retry payment</CardTitle>
          <CardDescription className="mt-2">Payment failed. You can retry with a supported gateway.</CardDescription>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <select
              className="h-11 rounded-full border border-border bg-background px-4 text-sm"
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
            >
              <option value="bkash">bKash</option>
              <option value="stripe">Stripe</option>
            </select>
            <Button onClick={() => void handleRetry()} disabled={retrying}>
              {retrying ? "Retrying..." : "Retry Payment"}
            </Button>
            {handoffUrl ? (
              <Button asChild variant="secondary">
                <a href={handoffUrl}>Open Payment Link</a>
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}
      {message ? (
        <Card>
          <CardDescription>{message}</CardDescription>
        </Card>
      ) : null}
    </div>
  );
}
