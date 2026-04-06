"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Card, CardDescription, CardTitle, OrderTimeline } from "@dokanx/ui";

import { getCustomerOverview, getProfile } from "@/lib/runtime-api";

type OrderRow = {
  _id?: string;
  id?: string;
  status?: string;
  createdAt?: string;
  deliveryGroupId?: string | null;
  warrantySnapshot?: Array<{ productId?: string; expiryDate?: string; type?: string }>;
  guaranteeSnapshot?: Array<{ productId?: string; expiryDate?: string; type?: string }>;
};

export function OrdersWorkspace() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [message, setMessage] = useState<string | null>("Sign in as a customer to load live order history.");

  useEffect(() => {
    async function loadOrders() {
      try {
        const profile = await getProfile();
        const globalCustomerId =
          typeof profile.user?.globalCustomerId === "string" ? profile.user.globalCustomerId : "";
        if (!globalCustomerId) {
          setMessage("Sign in as a customer to load live order history.");
          return;
        }
        const response = await getCustomerOverview(globalCustomerId);
        const rows = Array.isArray(response.data?.orders) ? (response.data.orders as OrderRow[]) : [];
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
        <CardTitle>Customer order timeline</CardTitle>
        <CardDescription className="mt-2">
          Live order history loads from the authenticated customer account when available.
        </CardDescription>
      </Card>
      <OrderTimeline
        items={orders.map((order) => ({
          title: `Order ${order.id || order._id || ""}`,
          description: `${order.status || "Pending"}${order.deliveryGroupId ? ` | Group ${order.deliveryGroupId}` : ""}`,
          time: order.createdAt || "Now",
        }))}
      />
      <div className="grid gap-4">
        {orders.map((order) => (
          <Card key={String(order._id || order.id || "")}>
            <CardTitle>Order {String(order._id || order.id || "").slice(-6)}</CardTitle>
            <CardDescription className="mt-2">
              {order.deliveryGroupId ? `Grouped delivery reference ${order.deliveryGroupId}` : "Single-shop fulfillment"}
            </CardDescription>
            <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
              <p>
                Warranty items: {order.warrantySnapshot?.length || 0} | Guarantee items: {order.guaranteeSnapshot?.length || 0}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="secondary">
                  <Link href="/account">Open claims</Link>
                </Button>
                {order.deliveryGroupId ? (
                  <Button asChild size="sm">
                    <Link href={`/order-tracking/${order._id || order.id || ""}`}>Track grouped delivery</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>
        ))}
      </div>
      {message ? (
        <Card>
          <CardDescription>{message}</CardDescription>
        </Card>
      ) : null}
    </div>
  );
}

