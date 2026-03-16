"use client";

import { useEffect, useState } from "react";
import { Button, Card, CardDescription, CardTitle, FinanceLedgerView, Input } from "@dokanx/ui";

import { getWalletSummary, listWalletLedger, topupWallet, transferWallet } from "@/lib/runtime-api";

type WalletSummary = {
  balance?: number;
  updatedAt?: string;
};

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [ledger, setLedger] = useState<Array<{
    _id?: string;
    amount?: number;
    type?: string;
    referenceId?: string;
    createdAt?: string;
  }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [topupAmount, setTopupAmount] = useState("0");
  const [transferAmount, setTransferAmount] = useState("0");
  const [targetShopId, setTargetShopId] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [response, ledgerResponse] = await Promise.all([
          getWalletSummary(),
          listWalletLedger(50),
        ]);
        if (!active) return;
        setWallet(response.data || null);
        setLedger(Array.isArray(ledgerResponse.data) ? ledgerResponse.data : []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load wallet summary.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="grid gap-6">
      {error ? (
        <Card>
          <CardTitle>Wallet</CardTitle>
          <CardDescription className="mt-2">{error}</CardDescription>
        </Card>
      ) : null}
      <Card>
        <CardTitle>Wallet actions</CardTitle>
        <CardDescription className="mt-2">
          Top up the shop wallet or transfer balance to another shop.
        </CardDescription>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="grid gap-3 rounded-2xl border border-border/60 p-4">
            <p className="text-sm font-semibold">Top up wallet</p>
            <Input value={topupAmount} onChange={(event) => setTopupAmount(event.target.value)} placeholder="Amount" />
            <Button
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await topupWallet(Number(topupAmount));
                  const [summary, ledgerResponse] = await Promise.all([
                    getWalletSummary(),
                    listWalletLedger(50),
                  ]);
                  setWallet(summary.data || null);
                  setLedger(Array.isArray(ledgerResponse.data) ? ledgerResponse.data : []);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Top up failed.");
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
            >
              {busy ? "Processing..." : "Top up"}
            </Button>
          </div>
          <div className="grid gap-3 rounded-2xl border border-border/60 p-4">
            <p className="text-sm font-semibold">Transfer to shop</p>
            <Input value={targetShopId} onChange={(event) => setTargetShopId(event.target.value)} placeholder="Target shop ID" />
            <Input value={transferAmount} onChange={(event) => setTransferAmount(event.target.value)} placeholder="Amount" />
            <Button
              variant="secondary"
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await transferWallet({ toShopId: targetShopId, amount: Number(transferAmount) });
                  const [summary, ledgerResponse] = await Promise.all([
                    getWalletSummary(),
                    listWalletLedger(50),
                  ]);
                  setWallet(summary.data || null);
                  setLedger(Array.isArray(ledgerResponse.data) ? ledgerResponse.data : []);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Transfer failed.");
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy || !targetShopId}
            >
              {busy ? "Processing..." : "Transfer"}
            </Button>
          </div>
        </div>
      </Card>
      <FinanceLedgerView
        rows={[
          {
            reference: "WALLET-SUMMARY",
            type: "Balance",
            amount: `${wallet?.balance ?? 0} BDT`,
            status: wallet?.updatedAt ? `Updated ${new Date(wallet.updatedAt).toLocaleDateString()}` : "Pending",
          },
          ...ledger.map((entry) => ({
            reference: entry.referenceId || String(entry._id || ""),
            type: entry.type || "LEDGER",
            amount: `${entry.amount ?? 0} BDT`,
            status: entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "Recorded",
          })),
        ]}
      />
    </div>
  );
}
