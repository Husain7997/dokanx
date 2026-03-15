"use client";

import { useEffect, useState } from "react";
import { Card, CardDescription, CardTitle, OrderTimeline } from "@dokanx/ui";

import { getMyOrders } from "@/lib/runtime-api";

type OrderRow = {
  _id?: string;
  id?: string;
  status?: string;
  createdAt?: string;
};

export function OrdersWorkspace() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [message, setMessage] = useState<string | null>("Sign in as a customer to load live order history.");

  useEffect(() => {
    async function loadOrders() {
      try {
        const response = await getMyOrders();
        const rows = Array.isArray(response.data) ? (response.data as OrderRow[]) : [];
        if (rows.length) {
          setOrders(rows);
          setMessage(null);
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to load orders.");
      }
    }

    void loadOrders();
  }, []);

  return (
    <div className="grid gap-6">
      <Card>
        <CardTitle>Customer order history</CardTitle>
        <CardDescription className="mt-2">
          Live order history is loaded from the authenticated customer account when available.
        </CardDescription>
      </Card>
      <OrderTimeline
        items={orders.map((order) => ({
          title: `Order ${order.id || order._id || ""}`,
          description: order.status || "Pending",
          time: order.createdAt || "Now",
        }))}
      />
      {message ? (
        <Card>
          <CardDescription>{message}</CardDescription>
        </Card>
      ) : null}
    </div>
  );
}
