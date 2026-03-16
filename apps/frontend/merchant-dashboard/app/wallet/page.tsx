"use client";

import { useEffect, useState } from "react";
import { Card, CardDescription, CardTitle, FinanceLedgerView } from "@dokanx/ui";

import { getWalletSummary } from "@/lib/runtime-api";

type WalletSummary = {
  balance?: number;
  updatedAt?: string;
};

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await getWalletSummary();
        if (!active) return;
        setWallet(response.data || null);
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
      <FinanceLedgerView
        rows={[
          {
            reference: "WALLET-SUMMARY",
            type: "Balance",
            amount: `${wallet?.balance ?? 0} BDT`,
            status: wallet?.updatedAt ? `Updated ${new Date(wallet.updatedAt).toLocaleDateString()}` : "Pending",
          },
        ]}
      />
    </div>
  );
}
