"use client";

import { useEffect, useState } from "react";
import { Card, CardDescription, CardTitle, OrderTimeline } from "@dokanx/ui";

import { getOrderDetail } from "@/lib/runtime-api";

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
        ]}
      />
      {message ? (
        <Card>
          <CardDescription>{message}</CardDescription>
        </Card>
      ) : null}
    </div>
  );
}
