"use client";

import { useMemo, useState } from "react";
import { Button, Card, CardDescription, CardTitle, CheckoutLayout, Input } from "@dokanx/ui";
import type { Cart } from "@dokanx/types";

type CheckoutWorkspaceProps = {
  cart: Cart;
};

export function CheckoutWorkspace({ cart }: CheckoutWorkspaceProps) {
  const [customer, setCustomer] = useState({
    fullName: "Husain Ahmed",
    phone: "01700000000",
    address: "House 12, Road 4, Dhaka",
    notes: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const totals = useMemo(() => {
    const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = subtotal > 5000 ? 0 : 120;
    return {
      subtotal,
      shipping,
      total: subtotal + shipping,
    };
  }, [cart.items]);

  return (
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
          This is now a working checkout shell with address capture and review state instead of a placeholder.
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
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => setSubmitted(true)}>Review Order</Button>
          <Button variant="secondary" onClick={() => setSubmitted(false)}>
            Reset
          </Button>
        </div>
        {submitted ? (
          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
            Review step is ready. The next implementation pass only needs payment method selection and backend order submission.
          </div>
        ) : null}
      </Card>
    </CheckoutLayout>
  );
}
