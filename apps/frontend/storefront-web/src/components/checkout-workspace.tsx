"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@dokanx/auth";
import { Button, Card, CardDescription, CardTitle, CheckoutLayout, Input } from "@dokanx/ui";
import type { Cart } from "@dokanx/types";

import { createOrder, getProfile, initiatePayment, saveCart } from "@/lib/runtime-api";

type CheckoutWorkspaceProps = {
  cart: Cart;
  suggestedShopId?: string | null;
};

function isMongoId(value: string) {
  return /^[a-f0-9]{24}$/i.test(value);
}

export function CheckoutWorkspace({ cart, suggestedShopId = null }: CheckoutWorkspaceProps) {
  const auth = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const [customer, setCustomer] = useState({
    fullName: "Husain Ahmed",
    phone: "01700000000",
    address: "House 12, Road 4, Dhaka",
    notes: "",
    shopId: auth.user?.shopId || suggestedShopId || "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("bkash");
  const [handoff, setHandoff] = useState<{
    orderId: string;
    gateway?: string;
    provider?: string;
    paymentUrl?: string;
    handoffType?: string;
    transactionId?: string | null;
    sessionId?: string | null;
    successUrl?: string;
  } | null>(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const totals = useMemo(() => {
    const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = subtotal > 5000 ? 0 : 120;
    return {
      subtotal,
      shipping,
      total: subtotal + shipping,
    };
  }, [cart.items]);

  useEffect(() => {
    async function hydrateCustomer() {
      if (auth.status !== "authenticated") return;

      try {
        const response = await getProfile();
        const user = response.user || response.data || {};
        const addresses = Array.isArray(user.addresses) ? user.addresses : [];
        const defaultAddress = addresses.find((item: { isDefault?: boolean }) => item.isDefault) || addresses[0];
        const paymentMethods = Array.isArray(user.savedPaymentMethods) ? user.savedPaymentMethods : [];
        const defaultPayment = paymentMethods.find((item: { isDefault?: boolean }) => item.isDefault) || paymentMethods[0];

        setCustomer((current) => ({
          ...current,
          fullName: String(defaultAddress?.recipient || user.name || current.fullName),
          phone: String(defaultAddress?.phone || user.phone || current.phone),
          address: String(defaultAddress?.line1 || current.address),
        }));

        if (defaultPayment?.provider) {
          const provider = String(defaultPayment.provider || "").toLowerCase();
          if (provider.includes("stripe")) setPaymentMethod("stripe");
          if (provider.includes("bkash")) setPaymentMethod("bkash");
        }
      } catch {
        // Ignore hydration failures.
      }
    }

    void hydrateCustomer();
  }, [auth.status]);

  const invalidProductIds = useMemo(
    () => cart.items.filter((item) => !isMongoId(item.productId)).map((item) => item.productId),
    [cart.items],
  );

  async function handleSubmitOrder() {
    setSubmitting(true);
    setStatus(null);
    setHandoff(null);

    if (auth.status !== "authenticated" || auth.user?.roleName !== "customer") {
      setSubmitting(false);
      setStatus("Sign in with a CUSTOMER account before submitting checkout.");
      return;
    }

    if (invalidProductIds.length > 0) {
      setSubmitting(false);
      setStatus("Current cart uses demo product IDs. Replace them with live backend product IDs before creating an order.");
      return;
    }

    if (!customer.shopId.trim() && !auth.user?.shopId) {
      setSubmitting(false);
      setStatus("Shop ID is required for cart save when the session is not already linked to a shop.");
      return;
    }

    try {
      await saveCart({
        shopId: customer.shopId.trim() || String(auth.user?.shopId || ""),
        items: cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      });

      const order = await createOrder({
        shopId: customer.shopId.trim() || String(auth.user?.shopId || ""),
        items: cart.items.map((item) => ({
          product: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
        totalAmount: totals.total,
        shippingFee: totals.shipping,
      });

      const rawOrder = order.data || {};
      const orderId = String(rawOrder._id || rawOrder.orderId || "");

      if (!orderId) {
        throw new Error("Order created without an order id.");
      }

      const payment = await initiatePayment(orderId, {
        paymentMethod,
        hasOwnGateway: paymentMethod === "stripe",
      });

      setSubmitted(true);
      setHandoff({
        orderId,
        gateway: payment.gateway,
        provider: payment.provider,
        paymentUrl: payment.paymentUrl,
        handoffType: payment.handoffType,
        transactionId: payment.transactionId,
        sessionId: payment.sessionId,
        successUrl: payment.successUrl,
      });
      setStatus(payment.message || order.message || "Order submitted and payment handoff is ready.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to submit order.";
      setStatus(message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setSubmitted(false);
    setStatus(null);
    setHandoff(null);
  }

  return (
    <div data-testid="checkout-hydrated" data-ready={hydrated ? "true" : "false"}>
      <CheckoutLayout
        steps={["Address", "Delivery", "Payment", "Review"]}
        currentStep={submitted ? 4 : 2}
        aside={
          <Card>
            <CardTitle>Order Summary</CardTitle>
            <div className="mt-6 grid gap-3 text-sm">
              {cart.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4">
                  <span>{item.name} x {item.quantity}</span>
                  <span>{item.price * item.quantity} BDT</span>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-2 border-t border-border/60 pt-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{totals.subtotal} BDT</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{totals.shipping} BDT</span>
              </div>
              <div className="flex items-center justify-between text-base font-semibold">
                <span>Total</span>
                <span>{totals.total} BDT</span>
              </div>
            </div>
          </Card>
        }
      >
        <Card>
          <CardTitle>Customer and delivery details</CardTitle>
          <CardDescription className="mt-2">
            Checkout now saves the cart and submits a real order request when the session and product IDs are valid.
          </CardDescription>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span>Full name</span>
              <Input value={customer.fullName} onChange={(event) => setCustomer((current) => ({ ...current, fullName: event.target.value }))} />
            </label>
            <label className="grid gap-2 text-sm">
              <span>Phone</span>
              <Input value={customer.phone} onChange={(event) => setCustomer((current) => ({ ...current, phone: event.target.value }))} />
            </label>
            <label className="grid gap-2 text-sm md:col-span-2">
              <span>Address</span>
              <Input value={customer.address} onChange={(event) => setCustomer((current) => ({ ...current, address: event.target.value }))} />
            </label>
            <label className="grid gap-2 text-sm md:col-span-2">
              <span>Delivery note</span>
              <Input value={customer.notes} onChange={(event) => setCustomer((current) => ({ ...current, notes: event.target.value }))} placeholder="Gate code, landmark, preferred slot" />
            </label>
            <label className="grid gap-2 text-sm md:col-span-2">
              <span>Shop ID</span>
              <Input value={customer.shopId} onChange={(event) => setCustomer((current) => ({ ...current, shopId: event.target.value }))} placeholder="Required if your customer session is not linked to a shop" />
            </label>
            <label className="grid gap-2 text-sm md:col-span-2">
              <span>Payment method</span>
              <select
                className="h-11 rounded-full border border-border bg-background px-4 text-sm"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
              >
                <option value="bkash">bKash redirect</option>
                <option value="stripe">Stripe hosted checkout</option>
              </select>
            </label>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={handleSubmitOrder} disabled={submitting}>
              {submitting ? "Submitting..." : "Create Order And Prepare Payment"}
            </Button>
            <Button variant="secondary" onClick={handleReset}>
              Reset
            </Button>
          </div>
          {status ? (
            <div className="mt-6 rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm">
              {status}
            </div>
          ) : null}
          {invalidProductIds.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
              Demo cart detected. Backend order creation needs live Mongo product IDs, but found: {invalidProductIds.join(", ")}
            </div>
          ) : null}
          {!invalidProductIds.length && customer.shopId ? (
            <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
              Checkout is preloaded with live shop context: {customer.shopId}
            </div>
          ) : null}
          {handoff ? (
            <div className="mt-4 rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4 text-sm">
              <p className="font-medium">Payment handoff ready</p>
              <p className="mt-2">Order: {handoff.orderId}</p>
              <p>Gateway: {handoff.provider || handoff.gateway || "Unknown"}</p>
              <p>Mode: {handoff.handoffType || "N/A"}</p>
              {handoff.transactionId ? <p>Transaction: {handoff.transactionId}</p> : null}
              {handoff.sessionId ? <p>Session: {handoff.sessionId}</p> : null}
              {handoff.paymentUrl ? (
                <div className="mt-3">
                  <Button asChild>
                    <a href={handoff.paymentUrl}>
                      Launch {handoff.provider || "Payment"}
                    </a>
                  </Button>
                </div>
              ) : null}
              {handoff.successUrl ? <p className="mt-3 text-xs text-muted-foreground">Return URL: {handoff.successUrl}</p> : null}
            </div>
          ) : null}
        </Card>
      </CheckoutLayout>
    </div>
  );
}
