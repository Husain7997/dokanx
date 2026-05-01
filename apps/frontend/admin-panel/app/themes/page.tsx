"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, AnalyticsCards, Badge, Button, Card, CardDescription, CardTitle, DataTable } from "@dokanx/ui";

import { listMarketplaceThemes, reviewMarketplaceTheme } from "@/lib/admin-runtime-api";

type ThemeRow = {
  id?: string;
  name?: string;
  category?: string;
  plan?: string;
  version?: string;
  versionNotes?: string;
  approvalStatus?: string;
  marketplaceStatus?: string;
  marketplaceFeatured?: boolean;
  sourceShopId?: string;
  sourceShopName?: string;
  reviewedByName?: string;
  rejectionReason?: string;
};

export const dynamic = "force-dynamic";

export default function Page() {
  const [themes, setThemes] = useState<ThemeRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function loadThemes() {
    const response = await listMarketplaceThemes();
    setThemes(Array.isArray(response.data) ? (response.data as ThemeRow[]) : []);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await listMarketplaceThemes();
        if (!active) return;
        setThemes(Array.isArray(response.data) ? (response.data as ThemeRow[]) : []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load theme review queue.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    const total = themes.length;
    const pending = themes.filter((theme) => String(theme.approvalStatus || "PENDING") === "PENDING").length;
    const approved = themes.filter((theme) => String(theme.approvalStatus || "") === "APPROVED").length;
    const listed = themes.filter((theme) => String(theme.marketplaceStatus || "") === "LISTED").length;
    return [
      { label: "Submitted", value: String(total), meta: "Merchant themes available for admin review" },
      { label: "Pending", value: String(pending), meta: "Waiting for curation decision" },
      { label: "Approved", value: String(approved), meta: "Passed theme quality review" },
      { label: "Marketplace listed", value: String(listed), meta: "Live in the install catalog" },
    ];
  }, [themes]);

  async function handleReview(
    row: { sourceShopId: string; themeId: string },
    payload: {
      approvalStatus: "APPROVED" | "REJECTED";
      marketplaceStatus?: "LISTED" | "PRIVATE";
      marketplaceFeatured?: boolean;
      rejectionReason?: string;
    }
  ) {
    const key = `${row.sourceShopId}:${row.themeId}:${payload.approvalStatus}:${payload.marketplaceStatus || "none"}`;
    setBusyKey(key);
    setError(null);
    try {
      await reviewMarketplaceTheme(row.sourceShopId, row.themeId, payload);
      await loadThemes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update theme review state.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-[28px] border border-white/10 bg-[#10233D] px-6 py-6 text-white shadow-[0_24px_60px_rgba(16,35,61,0.22)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-[#9FE7D7]">DokanX Admin</p>
            <h1 className="dx-display text-3xl">Theme Marketplace Curation</h1>
            <p className="text-sm text-slate-200">
              Review merchant-made themes, decide what becomes marketplace-ready, and keep the catalog polished.
            </p>
          </div>
          <Badge variant="secondary" className="border-white/15 bg-white/10 text-white">
            {themes.length} submissions
          </Badge>
        </div>
      </div>

      <AnalyticsCards items={summary} />

      {error ? <Alert variant="warning">{error}</Alert> : null}

      <Card>
        <CardTitle>Theme review queue</CardTitle>
        <CardDescription className="mt-2">
          Approve private themes, list standout ones to the marketplace, or reject submissions with a cleaner review pass.
        </CardDescription>
        <div className="mt-4">
          <DataTable
            columns={[
              { key: "theme", header: "Theme" },
              { key: "merchant", header: "Merchant" },
              { key: "plan", header: "Plan" },
              {
                key: "approval",
                header: "Review",
                render: (row) => (
                  <Badge variant={row.approvalStatus === "APPROVED" ? "success" : row.approvalStatus === "REJECTED" ? "danger" : "warning"}>
                    {row.approvalStatus}
                  </Badge>
                ),
              },
              {
                key: "listing",
                header: "Marketplace",
                render: (row) => (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={row.marketplaceStatus === "LISTED" ? "success" : "secondary"}>
                      {row.marketplaceStatus}
                    </Badge>
                    {row.marketplaceFeatured ? <Badge variant="secondary">Featured</Badge> : null}
                  </div>
                ),
              },
              {
                key: "actions",
                header: "Actions",
                render: (row) => {
                  const approveKey = `${row.sourceShopId}:${row.themeId}:APPROVED:PRIVATE`;
                  const listKey = `${row.sourceShopId}:${row.themeId}:APPROVED:LISTED`;
                  const rejectKey = `${row.sourceShopId}:${row.themeId}:REJECTED:none`;
                  return (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busyKey === approveKey || busyKey === listKey || busyKey === rejectKey}
                        onClick={() =>
                          void handleReview(
                            { sourceShopId: row.sourceShopId, themeId: row.themeId },
                            { approvalStatus: "APPROVED", marketplaceStatus: "PRIVATE", marketplaceFeatured: false }
                          )
                        }
                      >
                        {busyKey === approveKey ? "Saving..." : "Approve"}
                      </Button>
                      <Button
                        size="sm"
                        disabled={busyKey === approveKey || busyKey === listKey || busyKey === rejectKey}
                        onClick={() =>
                          void handleReview(
                            { sourceShopId: row.sourceShopId, themeId: row.themeId },
                            { approvalStatus: "APPROVED", marketplaceStatus: "LISTED", marketplaceFeatured: true }
                          )
                        }
                      >
                        {busyKey === listKey ? "Listing..." : "List + feature"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyKey === approveKey || busyKey === listKey || busyKey === rejectKey}
                        onClick={() =>
                          void handleReview(
                            { sourceShopId: row.sourceShopId, themeId: row.themeId },
                            {
                              approvalStatus: "REJECTED",
                              rejectionReason: "Needs stronger visual polish and section consistency before listing.",
                            }
                          )
                        }
                      >
                        {busyKey === rejectKey ? "Rejecting..." : "Reject"}
                      </Button>
                    </div>
                  );
                },
              },
            ]}
            rows={themes.map((theme) => ({
              id: `${theme.sourceShopId || ""}:${theme.id || ""}`,
              themeId: String(theme.id || ""),
              sourceShopId: String(theme.sourceShopId || ""),
              theme: `${theme.name || "Custom theme"}${theme.version ? ` v${theme.version}` : ""}${theme.versionNotes ? ` • ${theme.versionNotes}` : ""}`,
              merchant: theme.sourceShopName || "Merchant shop",
              plan: theme.plan || "ENTERPRISE",
              approvalStatus: String(theme.approvalStatus || "PENDING"),
              marketplaceStatus: String(theme.marketplaceStatus || "PRIVATE"),
              marketplaceFeatured: Boolean(theme.marketplaceFeatured),
              notes: `${theme.reviewedByName ? `Reviewed by ${theme.reviewedByName}` : "Awaiting review"}${theme.rejectionReason ? ` • ${theme.rejectionReason}` : ""}`,
              rejectionReason: theme.rejectionReason || "",
            }))}
          />
        </div>
      </Card>
    </div>
  );
}
