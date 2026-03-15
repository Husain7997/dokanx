"use client";

import { useEffect, useState } from "react";
import { Button, Card, CardDescription, CardTitle } from "@dokanx/ui";

import { getOrderDetail } from "@/lib/runtime-api";

type PaymentCallbackWorkspaceProps = {
  status: string;
  orderId: string;
  attemptId: string;
  providerPaymentId: string;
  gateway: string;
};

export function PaymentCallbackWorkspace({
  status,
  orderId,
  attemptId,
  providerPaymentId,
  gateway,
}: PaymentCallbackWorkspaceProps) {
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      if (!orderId) return;

      try {
        const response = await getOrderDetail(orderId);
        const order = response.data as { status?: string; paymentStatus?: string; totalAmount?: number } | undefined;
        if (!order) return;

        setSummary(
          `Order ${orderId} is ${String(order.status || "UNKNOWN")} with payment ${String(order.paymentStatus || "UNKNOWN")} for ${String(order.totalAmount || 0)} BDT.`,
        );
      } catch {
        setSummary(null);
      }
    }

    void loadOrder();
  }, [orderId]);

  const isSuccess = status.toLowerCase() === "success";

  return (
    <Card>
      <CardTitle>{isSuccess ? "Payment confirmed" : "Payment not completed"}</CardTitle>
      <CardDescription className="mt-2">
        {isSuccess
          ? "The backend callback completed and redirected you back to storefront."
          : "The payment provider returned a non-success status. You can retry from checkout or inspect the order."}
      </CardDescription>
      <div className="mt-6 grid gap-3 text-sm">
        <p>Status: {status || "unknown"}</p>
        <p>Order: {orderId || "missing"}</p>
        <p>Attempt: {attemptId || "missing"}</p>
        <p>Gateway: {gateway || "unknown"}</p>
        <p>Provider payment: {providerPaymentId || "missing"}</p>
        {summary ? <p>{summary}</p> : null}
      </div>
      <div className="mt-6 flex gap-3">
        <Button asChild>
          <a href={orderId ? `/order-tracking/${orderId}` : "/orders"}>Track Order</a>
        </Button>
        <Button asChild variant="secondary">
          <a href="/orders">View Orders</a>
        </Button>
      </div>
    </Card>
  );
}
