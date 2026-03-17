"use client";

import { useState } from "react";
import { Button, Card, CardDescription, CardTitle, Input } from "@dokanx/ui";

import { adjustWallet, freezeWallet, refundWallet, unfreezeWallet } from "@/lib/admin-runtime-api";

export function FinanceControlPanel() {
  const [shopId, setShopId] = useState("");
  const [amount, setAmount] = useState("0");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleAdjust() {
    if (!shopId) return;
    setBusy(true);
    setStatus(null);
    try {
      const response = await adjustWallet({ shopId, amount: Number(amount), reason });
      setStatus(`Adjusted wallet. Balance ${response.balance ?? 0}.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Adjustment failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRefund() {
    if (!shopId) return;
    setBusy(true);
    setStatus(null);
    try {
      const response = await refundWallet({ shopId, amount: Number(amount), reason });
      setStatus(`Refund processed. Balance ${response.balance ?? 0}.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Refund failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleFreeze() {
    if (!shopId) return;
    setBusy(true);
    setStatus(null);
    try {
      const response = await freezeWallet(shopId);
      setStatus(response.message || "Wallet frozen.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Freeze failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUnfreeze() {
    if (!shopId) return;
    setBusy(true);
    setStatus(null);
    try {
      const response = await unfreezeWallet(shopId);
      setStatus(response.message || "Wallet unfrozen.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Unfreeze failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardTitle>Wallet controls</CardTitle>
      <CardDescription className="mt-2">Adjust balances, issue refunds, or freeze merchant wallets.</CardDescription>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Input value={shopId} onChange={(event) => setShopId(event.target.value)} placeholder="Shop ID" />
        <Input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Amount" />
        <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason" />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button onClick={handleAdjust} disabled={busy}>Adjust</Button>
        <Button variant="secondary" onClick={handleRefund} disabled={busy}>Refund</Button>
        <Button variant="secondary" onClick={handleFreeze} disabled={busy}>Freeze</Button>
        <Button variant="ghost" onClick={handleUnfreeze} disabled={busy}>Unfreeze</Button>
      </div>
      {status ? <p className="mt-3 text-xs text-muted-foreground">{status}</p> : null}
    </Card>
  );
}
