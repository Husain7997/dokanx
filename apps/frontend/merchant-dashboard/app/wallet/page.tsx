"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Card, CardDescription, CardTitle, FinanceLedgerView, TextInput } from "@dokanx/ui";

import { getWalletReport, getWalletSummary, listWalletLedger, listWalletLedgerFiltered, topupWallet, transferWallet } from "@/lib/runtime-api";

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
  const [filterType, setFilterType] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [report, setReport] = useState<{
    totalIncome?: number;
    totalExpense?: number;
    totalCheque?: number;
    totalDue?: number;
    profitLoss?: number;
  } | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [response, ledgerResponse, reportResponse] = await Promise.all([
          getWalletSummary(),
          listWalletLedger(50),
          getWalletReport(),
        ]);
        if (!active) return;
        setWallet(response.data || null);
        setLedger(Array.isArray(ledgerResponse.data) ? ledgerResponse.data : []);
        setReport(reportResponse.data || null);
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
      {error ? <Alert variant="error">{error}</Alert> : null}
      <Card>
        <CardTitle>Wallet actions</CardTitle>
        <CardDescription className="mt-2">
          Top up the shop wallet or transfer balance to another shop.
        </CardDescription>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="grid gap-3 rounded-2xl border border-border/60 p-4">
            <p className="text-sm font-semibold">Top up wallet</p>
            <TextInput value={topupAmount} onChange={(event) => setTopupAmount(event.target.value)} placeholder="Amount" />
            <Button
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await topupWallet(Number(topupAmount));
                  const [summary, ledgerResponse] = await Promise.all([
                    getWalletSummary(),
                    listWalletLedgerFiltered({
                      limit: 50,
                      type: filterType || undefined,
                      dateFrom: filterFrom || undefined,
                      dateTo: filterTo || undefined,
                    }),
                  ]);
                  setWallet(summary.data || null);
                  setLedger(Array.isArray(ledgerResponse.data) ? ledgerResponse.data : []);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Top up failed.");
                } finally {
                  setBusy(false);
                }
              }}
              loading={busy}
              loadingText="Processing top up"
            >
              Top up
            </Button>
          </div>
          <div className="grid gap-3 rounded-2xl border border-border/60 p-4">
            <p className="text-sm font-semibold">Transfer to shop</p>
            <TextInput value={targetShopId} onChange={(event) => setTargetShopId(event.target.value)} placeholder="Target shop ID" />
            <TextInput value={transferAmount} onChange={(event) => setTransferAmount(event.target.value)} placeholder="Amount" />
            <Button
              variant="secondary"
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await transferWallet({ toShopId: targetShopId, amount: Number(transferAmount) });
                  const [summary, ledgerResponse] = await Promise.all([
                    getWalletSummary(),
                    listWalletLedgerFiltered({
                      limit: 50,
                      type: filterType || undefined,
                      dateFrom: filterFrom || undefined,
                      dateTo: filterTo || undefined,
                    }),
                  ]);
                  setWallet(summary.data || null);
                  setLedger(Array.isArray(ledgerResponse.data) ? ledgerResponse.data : []);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Transfer failed.");
                } finally {
                  setBusy(false);
                }
              }}
              loading={busy}
              loadingText="Processing transfer"
              disabled={!targetShopId}
            >
              Transfer
            </Button>
          </div>
        </div>
      </Card>
      <Card>
        <CardTitle>Ledger filters</CardTitle>
        <CardDescription className="mt-2">
          Filter ledger entries by type and date range.
        </CardDescription>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <TextInput value={filterType} onChange={(event) => setFilterType(event.target.value)} placeholder="Type (e.g. WALLET_CREDIT)" />
          <TextInput type="date" value={filterFrom} onChange={(event) => setFilterFrom(event.target.value)} />
          <TextInput type="date" value={filterTo} onChange={(event) => setFilterTo(event.target.value)} />
          <Button
            onClick={async () => {
              setBusy(true);
              setError(null);
                try {
                  const [ledgerResponse, reportResponse] = await Promise.all([
                    listWalletLedgerFiltered({
                      limit: 50,
                      type: filterType || undefined,
                      dateFrom: filterFrom || undefined,
                      dateTo: filterTo || undefined,
                    }),
                    getWalletReport({
                      type: filterType || undefined,
                      dateFrom: filterFrom || undefined,
                      dateTo: filterTo || undefined,
                    }),
                  ]);
                setLedger(Array.isArray(ledgerResponse.data) ? ledgerResponse.data : []);
                setReport(reportResponse.data || null);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Unable to load ledger.");
              } finally {
                setBusy(false);
              }
            }}
            loading={busy}
            loadingText="Loading ledger"
          >
            Apply
          </Button>
        </div>
      </Card>
      <Card>
        <CardTitle>Accounting summary</CardTitle>
        <CardDescription className="mt-2">Income, expense, due settlement, and profit/loss from the normalized wallet ledger.</CardDescription>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-border/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Income</p>
            <p className="mt-2 text-xl font-semibold">{report?.totalIncome ?? 0} BDT</p>
          </div>
          <div className="rounded-2xl border border-border/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Expense</p>
            <p className="mt-2 text-xl font-semibold">{report?.totalExpense ?? 0} BDT</p>
          </div>
          <div className="rounded-2xl border border-border/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Due Settlements</p>
            <p className="mt-2 text-xl font-semibold">{report?.totalDue ?? 0} BDT</p>
          </div>
          <div className="rounded-2xl border border-border/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Profit/Loss</p>
            <p className="mt-2 text-xl font-semibold">{report?.profitLoss ?? 0} BDT</p>
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
