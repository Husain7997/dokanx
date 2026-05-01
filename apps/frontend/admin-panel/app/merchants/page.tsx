"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert, AnalyticsCards, Badge, Button, Card, CardDescription, CardTitle, DataTable, Input } from "@dokanx/ui";

import { blockUser, listMerchants, unblockUser } from "@/lib/admin-runtime-api";

type MerchantRow = {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
  isBlocked?: boolean;
  kycStatus?: "PENDING" | "VERIFIED" | "REJECTED";
  shopId?: { name?: string; domain?: string; _id?: string };
  createdAt?: string;
  lastActivity?: string;
};

export const dynamic = "force-dynamic";

export default function Page() {
  const searchParams = useSearchParams();
  const [merchants, setMerchants] = useState<MerchantRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setSearchQuery(searchParams.get("q") || "");
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await listMerchants();
        if (!active) return;
        setMerchants(Array.isArray(response.data) ? (response.data as MerchantRow[]) : []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load merchants.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const loadMerchants = async () => {
    try {
      const response = await listMerchants();
      setMerchants(Array.isArray(response.data) ? (response.data as MerchantRow[]) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load merchants.");
    }
  };

  const handleToggleBlock = async (merchant: MerchantRow) => {
    if (!merchant._id) return;
    setBusyId(merchant._id);
    try {
      if (merchant.isBlocked) {
        await unblockUser(merchant._id);
      } else {
        await blockUser(merchant._id);
      }
      await loadMerchants();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update merchant.");
    } finally {
      setBusyId(null);
    }
  };

  const summary = useMemo(() => {
    const total = merchants.length;
    const blocked = merchants.filter((merchant) => merchant.isBlocked).length;
    const active = total - blocked;
    const assigned = merchants.filter((merchant) => merchant.shopId?.name || merchant.shopId?.domain).length;
    const verifiedKyc = merchants.filter((merchant) => merchant.kycStatus === "VERIFIED").length;
    const pendingKyc = merchants.filter((merchant) => merchant.kycStatus === "PENDING").length;
    return [
      { label: "Total merchants", value: String(total), meta: "Accounts under active review" },
      { label: "Active", value: String(active), meta: "Currently allowed to operate" },
      { label: "Blocked", value: String(blocked), meta: "Restricted by admin control" },
      { label: "With shop", value: String(assigned), meta: "Linked to a storefront" },
      { label: "KYC verified", value: String(verifiedKyc), meta: "Completed verification" },
      { label: "KYC pending", value: String(pendingKyc), meta: "Awaiting review" },
    ];
  }, [merchants]);

  const filteredMerchants = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return merchants;
    return merchants.filter((merchant) =>
      [merchant._id, merchant.name, merchant.email, merchant.role, merchant.shopId?.name, merchant.shopId?.domain].some((value) =>
        String(value || "").toLowerCase().includes(needle)
      )
    );
  }, [merchants, searchQuery]);

  return (
    <div className="grid gap-6">
      <div className="rounded-[28px] border border-white/10 bg-[#0B1E3C] px-6 py-6 text-white shadow-[0_24px_60px_rgba(11,30,60,0.24)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-[#FFD49F]">DokanX Admin</p>
            <h1 className="dx-display text-3xl">Merchant Lifecycle</h1>
            <p className="text-sm text-slate-200">
              Review merchant access, linked storefront coverage, and account restrictions from one moderation queue.
            </p>
          </div>
          <Badge variant="secondary" className="border-white/15 bg-white/10 text-white">
            {merchants.length} loaded
          </Badge>
        </div>
      </div>

      <AnalyticsCards items={summary} />

      {error ? <Alert variant="warning">{error}</Alert> : null}

      <Card>
        <CardTitle>Merchant review queue</CardTitle>
        <CardDescription className="mt-2">
          Use this table to open merchant detail, confirm storefront assignment, and block or unblock access.
        </CardDescription>
        <div className="mt-4 max-w-sm">
          <Input
            placeholder="Search merchants, shop, email..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
        <div className="mt-4">
          <DataTable
            columns={[
              { key: "merchant", header: "Merchant" },
              { key: "email", header: "Email" },
              { key: "role", header: "Role" },
              { key: "kyc", header: "KYC Status" },
              { key: "shop", header: "Shop" },
              {
                key: "status",
                header: "Status",
                render: (row) => (
                  <Badge variant={row.isBlocked ? "warning" : "success"}>{row.isBlocked ? "Blocked" : "Active"}</Badge>
                ),
              },
              {
                key: "actions",
                header: "Actions",
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" asChild>
                      <a href={`/merchants/${row._id}`}>View</a>
                    </Button>
                    <Button
                      size="sm"
                      variant={row.isBlocked ? "primary" : "danger"}
                      disabled={busyId === row._id}
                      onClick={() => handleToggleBlock(row)}
                    >
                      {row.isBlocked ? "Unblock" : "Block"}
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/merchants/${row._id}/scorecard`}>Scorecard</a>
                    </Button>
                  </div>
                ),
              },
            ]}
            rows={filteredMerchants.map((merchant) => ({
              _id: merchant._id,
              merchant: merchant.name || "Unknown",
              email: merchant.email || "N/A",
              role: merchant.role || "MERCHANT",
              kyc: (
                <Badge variant={merchant.kycStatus === "VERIFIED" ? "success" : merchant.kycStatus === "PENDING" ? "warning" : "neutral"}>
                  {merchant.kycStatus || "NOT_SUBMITTED"}
                </Badge>
              ),
              shop: merchant.shopId?.name || merchant.shopId?.domain || "No shop",
              isBlocked: Boolean(merchant.isBlocked),
            }))}
          />
        </div>
      </Card>
    </div>
  );
}

