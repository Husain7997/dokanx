"use client";
import { useEffect, useState } from "react";
import { Button, Card, CardDescription, CardTitle, Input } from "@dokanx/ui";
import { adjustWallet, freezeWallet, getDeliveryConfig, listCommissionRules, refundWallet, unfreezeWallet, updateDeliveryConfig, upsertCommissionRule, } from "@/lib/admin-runtime-api";
export function FinanceControlPanel() {
    const [shopId, setShopId] = useState("");
    const [amount, setAmount] = useState("0");
    const [reason, setReason] = useState("");
    const [ruleType, setRuleType] = useState("CATEGORY");
    const [ruleTarget, setRuleTarget] = useState("");
    const [ruleRate, setRuleRate] = useState("0");
    const [deliveryConfig, setDeliveryConfig] = useState({
        groupingRadiusKm: "5",
        sameZoneCharge: "80",
        groupedCharge: "120",
        externalCarrierCharge: "180",
    });
    const [ruleCount, setRuleCount] = useState(0);
    const [status, setStatus] = useState(null);
    const [busy, setBusy] = useState(false);
    async function refreshControls() {
        const [rulesResponse, configResponse] = await Promise.all([
            listCommissionRules(),
            getDeliveryConfig(),
        ]);
        setRuleCount(Array.isArray(rulesResponse.data) ? rulesResponse.data.length : 0);
        const config = configResponse.data || {};
        setDeliveryConfig({
            groupingRadiusKm: String(config.groupingRadiusKm ?? 5),
            sameZoneCharge: String(config.sameZoneCharge ?? 80),
            groupedCharge: String(config.groupedCharge ?? 120),
            externalCarrierCharge: String(config.externalCarrierCharge ?? 180),
        });
    }
    useEffect(() => {
        void refreshControls();
    }, []);
    async function handleAdjust() {
        if (!shopId)
            return;
        setBusy(true);
        setStatus(null);
        try {
            const response = await adjustWallet({ shopId, amount: Number(amount), reason });
            setStatus(`Adjusted wallet. Balance ${response.balance ?? 0}.`);
        }
        catch (err) {
            setStatus(err instanceof Error ? err.message : "Adjustment failed.");
        }
        finally {
            setBusy(false);
        }
    }
    async function handleRefund() {
        if (!shopId)
            return;
        setBusy(true);
        setStatus(null);
        try {
            const response = await refundWallet({ shopId, amount: Number(amount), reason });
            setStatus(`Refund processed. Balance ${response.balance ?? 0}.`);
        }
        catch (err) {
            setStatus(err instanceof Error ? err.message : "Refund failed.");
        }
        finally {
            setBusy(false);
        }
    }
    async function handleFreeze() {
        if (!shopId)
            return;
        setBusy(true);
        setStatus(null);
        try {
            const response = await freezeWallet(shopId);
            setStatus(response.message || "Wallet frozen.");
        }
        catch (err) {
            setStatus(err instanceof Error ? err.message : "Freeze failed.");
        }
        finally {
            setBusy(false);
        }
    }
    async function handleUnfreeze() {
        if (!shopId)
            return;
        setBusy(true);
        setStatus(null);
        try {
            const response = await unfreezeWallet(shopId);
            setStatus(response.message || "Wallet unfrozen.");
        }
        catch (err) {
            setStatus(err instanceof Error ? err.message : "Unfreeze failed.");
        }
        finally {
            setBusy(false);
        }
    }
    async function handleSaveRule() {
        setBusy(true);
        setStatus(null);
        try {
            await upsertCommissionRule({
                type: ruleType,
                rate: Number(ruleRate),
                category: ruleType === "CATEGORY" ? ruleTarget || undefined : undefined,
                merchantTier: ruleType === "MERCHANT_TIER" ? ruleTarget || undefined : undefined,
                campaignId: ruleType === "CAMPAIGN" ? ruleTarget || undefined : undefined,
            });
            await refreshControls();
            setStatus("Commission rule saved.");
        }
        catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to save commission rule.");
        }
        finally {
            setBusy(false);
        }
    }
    async function handleSaveDeliveryConfig() {
        setBusy(true);
        setStatus(null);
        try {
            await updateDeliveryConfig({
                groupingRadiusKm: Number(deliveryConfig.groupingRadiusKm),
                sameZoneCharge: Number(deliveryConfig.sameZoneCharge),
                groupedCharge: Number(deliveryConfig.groupedCharge),
                externalCarrierCharge: Number(deliveryConfig.externalCarrierCharge),
            });
            setStatus("Delivery config updated.");
        }
        catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to update delivery config.");
        }
        finally {
            setBusy(false);
        }
    }
    return (<div className="grid gap-6 lg:grid-cols-3">
      <Card>
        <CardTitle>Wallet controls</CardTitle>
        <CardDescription className="mt-2">Adjust balances, issue refunds, or freeze merchant wallets.</CardDescription>
        <div className="mt-4 grid gap-3">
          <Input value={shopId} onChange={(event) => setShopId(event.target.value)} placeholder="Shop ID"/>
          <Input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Amount"/>
          <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason"/>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={handleAdjust} disabled={busy}>Adjust</Button>
          <Button variant="secondary" onClick={handleRefund} disabled={busy}>Refund</Button>
          <Button variant="secondary" onClick={handleFreeze} disabled={busy}>Freeze</Button>
          <Button variant="ghost" onClick={handleUnfreeze} disabled={busy}>Unfreeze</Button>
        </div>
      </Card>

      <Card>
        <CardTitle>Commission rules</CardTitle>
        <CardDescription className="mt-2">Rule count {ruleCount}. Add category, merchant tier, or campaign commission overrides.</CardDescription>
        <div className="mt-4 grid gap-3">
          <Input value={ruleType} onChange={(event) => setRuleType(event.target.value.toUpperCase())} placeholder="CATEGORY / MERCHANT_TIER / CAMPAIGN"/>
          <Input value={ruleTarget} onChange={(event) => setRuleTarget(event.target.value)} placeholder="Category, tier, or campaign ID"/>
          <Input value={ruleRate} onChange={(event) => setRuleRate(event.target.value)} placeholder="Rate %"/>
        </div>
        <div className="mt-4">
          <Button onClick={handleSaveRule} disabled={busy}>Save rule</Button>
        </div>
      </Card>

      <Card>
        <CardTitle>Delivery config</CardTitle>
        <CardDescription className="mt-2">Set grouped radius and charge thresholds for multi-shop delivery.</CardDescription>
        <div className="mt-4 grid gap-3">
          <Input value={deliveryConfig.groupingRadiusKm} onChange={(event) => setDeliveryConfig((current) => ({ ...current, groupingRadiusKm: event.target.value }))} placeholder="Grouping radius km"/>
          <Input value={deliveryConfig.sameZoneCharge} onChange={(event) => setDeliveryConfig((current) => ({ ...current, sameZoneCharge: event.target.value }))} placeholder="Same zone charge"/>
          <Input value={deliveryConfig.groupedCharge} onChange={(event) => setDeliveryConfig((current) => ({ ...current, groupedCharge: event.target.value }))} placeholder="Grouped charge"/>
          <Input value={deliveryConfig.externalCarrierCharge} onChange={(event) => setDeliveryConfig((current) => ({ ...current, externalCarrierCharge: event.target.value }))} placeholder="External carrier charge"/>
        </div>
        <div className="mt-4">
          <Button onClick={handleSaveDeliveryConfig} disabled={busy}>Save delivery config</Button>
        </div>
      </Card>

      {status ? <p className="text-xs text-muted-foreground lg:col-span-3">{status}</p> : null}
    </div>);
}
