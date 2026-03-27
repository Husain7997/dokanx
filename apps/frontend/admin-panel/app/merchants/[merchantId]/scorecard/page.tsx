"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, CardDescription, CardTitle } from "@dokanx/ui";

import { getFraudOverview, listClaims, listMerchants, listOrders, listSettlements, listShipments } from "@/lib/admin-runtime-api";

export default function MerchantScorecardPage({ params }: { params: { merchantId: string } }) {
  const merchantId = String(params.merchantId || "");
  const [merchant, setMerchant] = useState<Record<string, unknown> | null>(null);
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const [claims, setClaims] = useState<Array<Record<string, unknown>>>([]);
  const [shipments, setShipments] = useState<Array<Record<string, unknown>>>([]);
  const [fraudOverview, setFraudOverview] = useState<Record<string, unknown> | null>(null);
  const [settlements, setSettlements] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    let active = true;
    async function load() {
      const [merchantResponse, orderResponse, claimResponse, shipmentResponse, fraudResponse, settlementResponse] = await Promise.all([
        listMerchants(),
        listOrders(),
        listClaims(),
        listShipments(),
        getFraudOverview(),
        listSettlements(),
      ]);
      if (!active) return;
      const merchantList = Array.isArray(merchantResponse.data) ? merchantResponse.data : [];
      const current = merchantList.find((row) => String((row as Record<string, unknown>)._id || "") === merchantId) || null;
      setMerchant((current || null) as Record<string, unknown> | null);
      setOrders(Array.isArray(orderResponse.data) ? orderResponse.data as Array<Record<string, unknown>> : []);
      setClaims(Array.isArray(claimResponse.data) ? claimResponse.data as Array<Record<string, unknown>> : []);
      setShipments(Array.isArray(shipmentResponse.data) ? shipmentResponse.data as Array<Record<string, unknown>> : []);
      setFraudOverview((fraudResponse.data || null) as Record<string, unknown> | null);
      setSettlements(Array.isArray(settlementResponse.data) ? settlementResponse.data as Array<Record<string, unknown>> : []);
    }
    void load();
    return () => {
      active = false;
    };
  }, [merchantId]);

  const shop = (merchant?.shopId || {}) as Record<string, unknown>;
  const shopName = String(shop.name || "");
  const shopId = String(shop._id || "");

  const scopedOrders = useMemo(
    () => orders.filter((order) => String((order.shop as Record<string, unknown> | undefined)?.name || "") === shopName),
    [orders, shopName]
  );
  const scopedClaims = useMemo(
    () => claims.filter((claim) => String(claim.shopId || "") === shopId),
    [claims, shopId]
  );
  const scopedShipments = useMemo(
    () => shipments.filter((shipment) => String(shipment.shopId || shipment.orderId || "").includes(shopId)),
    [shipments, shopId]
  );
  const scopedSettlements = useMemo(
    () => settlements.filter((settlement) => String(settlement.shopId || "") === shopId),
    [settlements, shopId]
  );

  const totalSales = scopedOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
  const totalCommission = Math.round(scopedOrders.reduce((sum, order) => {
    const snapshot = (order.commissionSnapshot || {}) as Record<string, unknown>;
    return sum + Number(snapshot.amount || 0);
  }, 0));
  const claimRate = scopedOrders.length ? Number(((scopedClaims.length / scopedOrders.length) * 100).toFixed(1)) : 0;
  const fraudCases = Array.isArray(fraudOverview?.flaggedOrders) ? fraudOverview?.flaggedOrders as Array<Record<string, unknown>> : [];
  const fraudScore = fraudCases
    .filter((item) => String(item.shopId || "") === shopId)
    .reduce((max, item) => Math.max(max, Number(item.score || 0)), 0);
  const delivered = scopedShipments.filter((shipment) => String(shipment.status || "").toUpperCase() === "DELIVERED").length;
  const deliverySuccessRate = scopedShipments.length ? Number(((delivered / scopedShipments.length) * 100).toFixed(1)) : 0;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
          <h1 className="dx-display text-3xl">{String(merchant?.name || "Merchant")} Scorecard</h1>
          <p className="text-sm text-muted-foreground">{String(shop.name || shop.domain || "Unknown shop")}</p>
        </div>
        <Button asChild variant="secondary">
          <a href={`/merchants/${merchantId}`}>Open merchant profile</a>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <MetricCard title="Total sales" value={`${totalSales} BDT`} />
        <MetricCard title="Commission" value={`${totalCommission} BDT`} />
        <MetricCard title="Claim rate" value={`${claimRate}%`} />
        <MetricCard title="Fraud score" value={`${fraudScore}/100`} />
        <MetricCard title="Delivery success" value={`${deliverySuccessRate}%`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Performance signals</CardTitle>
          <CardDescription className="mt-2">Core merchant health indicators.</CardDescription>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
              <span>Orders</span>
              <span>{scopedOrders.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
              <span>Claims</span>
              <span>{scopedClaims.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
              <span>Settlements</span>
              <span>{scopedSettlements.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
              <span>Shipment success</span>
              <span>{deliverySuccessRate}%</span>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>Risk view</CardTitle>
          <CardDescription className="mt-2">Fraud and claim pressure on this merchant.</CardDescription>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            {scopedClaims.slice(0, 5).map((claim, index) => (
              <div key={`${String(claim._id || index)}`} className="rounded-2xl border border-border/60 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-foreground">{String(claim.type || "CLAIM").toUpperCase()}</span>
                  <Badge variant={Number((claim.fraudFlags as unknown[] | undefined)?.length || 0) ? "warning" : "neutral"}>
                    {String(claim.status || "pending")}
                  </Badge>
                </div>
                <p className="mt-1 text-xs">{String(claim.reason || "")}</p>
              </div>
            ))}
            {!scopedClaims.length ? <p>No claim pressure detected.</p> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </Card>
  );
}
