import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";

import { getMerchantOrdersRequest, updateMerchantOrderStatusRequest } from "../lib/api-client";
import { DokanXLogo } from "../components/dokanx-logo";
import { useMerchantAuthStore } from "../store/auth-store";
import { useMerchantOrdersHandoffStore } from "../store/orders-handoff-store";
import { MerchantTopNav } from "./merchant-top-nav";

type MerchantOrderItem = {
  name: string;
  quantity: number;
  price: number;
};

type MerchantOrder = {
  id: string;
  status: string;
  amount: number;
  customer: string;
  createdAt: string;
  paymentStatus: string;
  paymentMode: string;
  itemCount: number;
  items: MerchantOrderItem[];
};

type OrderViewTab = "DIRECT" | "ONLINE" | "TRANSACTIONS";
type FulfillmentAction = "READY" | "HANDOVER" | "SHIP";
type ReceiptPreset = "THERMAL_58" | "THERMAL_80" | "A4";

const STATUS_FILTERS = ["ALL", "PENDING", "CONFIRMED", "CANCELLED"] as const;
const VIEW_TABS: OrderViewTab[] = ["DIRECT", "ONLINE", "TRANSACTIONS"];
const BRAND = {
  navy: "#0B1E3C",
  orange: "#FF7A00",
  ink: "#0f172a",
  slate: "#475569",
  muted: "#64748b",
  border: "#dbe4f0",
  surface: "#ffffff",
  surfaceSoft: "#f8fafc",
  cream: "#f4efe8",
};

function normalizeStatus(status: string) {
  return String(status || "").toUpperCase();
}

function mapOrder(row: {
  _id?: string;
  status?: string;
  totalAmount?: number;
  createdAt?: string;
  paymentStatus?: string;
  paymentMode?: string;
  contact?: { phone?: string; email?: string };
  user?: { name?: string; email?: string; phone?: string };
  items?: Array<{ quantity?: number; price?: number; product?: { _id?: string; name?: string }; name?: string }>;
}) {
  const items = Array.isArray(row.items)
    ? row.items.map((item) => ({
        name: String(item.name || item.product?.name || "Item"),
        quantity: Number(item.quantity || 0),
        price: Number(item.price || 0),
      }))
    : [];

  return {
    id: String(row._id || ""),
    status: String(row.status || "PENDING"),
    amount: Number(row.totalAmount || 0),
    customer: String(row.user?.name || row.contact?.phone || row.contact?.email || "Customer"),
    createdAt: String(row.createdAt || ""),
    paymentStatus: String(row.paymentStatus || "PENDING"),
    paymentMode: String(row.paymentMode || "UNKNOWN"),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    items,
  };
}

function formatStatusLabel(status: string) {
  const value = normalizeStatus(status);
  if (value === "PAYMENT_PENDING") return "PAYMENT PENDING";
  return value || "UNKNOWN";
}

function matchesSearch(order: MerchantOrder, query: string) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return true;
  return [order.customer, order.id.slice(-6), order.status, order.paymentStatus, order.paymentMode, ...order.items.map((item) => item.name)].some((value) => String(value || "").toLowerCase().includes(needle));
}

function getStatusTone(status: string) {
  const value = normalizeStatus(status);
  if (["DELIVERED", "SUCCESS"].includes(value)) return { bg: "#dcfce7", fg: "#166534" };
  if (["SHIPPED", "CONFIRMED"].includes(value)) return { bg: "#dbeafe", fg: "#1d4ed8" };
  if (["CANCELLED", "FAILED"].includes(value)) return { bg: "#fee2e2", fg: "#991b1b" };
  return { bg: "#fef3c7", fg: "#92400e" };
}

function isOnlineOrder(order: MerchantOrder) {
  return String(order.paymentMode || "").toUpperCase() === "ONLINE";
}

function isTransactionOrder(order: MerchantOrder) {
  return normalizeStatus(order.paymentStatus) === "SUCCESS" || normalizeStatus(order.status) === "DELIVERED";
}

function matchesStatusFilter(order: MerchantOrder, filter: typeof STATUS_FILTERS[number]) {
  const status = normalizeStatus(order.status);
  if (filter === "ALL") return true;
  if (filter === "PENDING") return ["PLACED", "PAYMENT_PENDING"].includes(status);
  if (filter === "CONFIRMED") return ["CONFIRMED", "SHIPPED", "DELIVERED"].includes(status);
  if (filter === "CANCELLED") return status === "CANCELLED";
  return true;
}

function matchesView(order: MerchantOrder, view: OrderViewTab) {
  if (view === "ONLINE") return isOnlineOrder(order);
  if (view === "DIRECT") return !isOnlineOrder(order);
  return isTransactionOrder(order);
}

function needsPosFollowUp(order: MerchantOrder) {
  const paymentPending = ["PENDING", "PAYMENT_PENDING"].includes(normalizeStatus(order.paymentStatus));
  const orderPending = ["PLACED", "PENDING", "PAYMENT_PENDING"].includes(normalizeStatus(order.status));
  return isOnlineOrder(order) && (paymentPending || orderPending);
}

function getFulfillmentLabel(action: FulfillmentAction) {
  if (action === "READY") return "Ready in POS";
  if (action === "HANDOVER") return "Give now";
  return "Ship order";
}

function getPrintModule() {
  const printModule = require("react-native-print");
  return printModule.default ?? printModule;
}

function buildOrderPrintHtml(order: MerchantOrder, receiptPreset: ReceiptPreset) {
  const rows = order.items.map((item) => `
    <tr>
      <td style="padding:6px 0;border-bottom:1px dashed #e5e7eb;">${item.name}</td>
      <td style="padding:6px 0;border-bottom:1px dashed #e5e7eb;text-align:center;">${item.quantity}</td>
      <td style="padding:6px 0;border-bottom:1px dashed #e5e7eb;text-align:right;">${item.price.toFixed(2)} BDT</td>
    </tr>`).join("");
  const isA4 = receiptPreset === "A4";
  const isThermal80 = receiptPreset === "THERMAL_80";
  const pageWidth = isA4 ? "760px" : isThermal80 ? "302px" : "220px";
  const pageSize = isA4 ? "A4 portrait" : isThermal80 ? "80mm auto" : "58mm auto";
  return `
    <html><head><style>@page { size: ${pageSize}; margin: 8mm; } * { box-sizing: border-box; }</style></head><body style="font-family:Arial,sans-serif;padding:${isA4 ? 18 : 0}px;color:#111827;background:#fff;">
      <div style="width:${pageWidth};margin:0 auto;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
        <div style="background:#111827;color:#fff;padding:16px;">
          <div style="font-size:20px;font-weight:800;">Order Receipt</div>
          <div style="font-size:12px;color:#cbd5e1;margin-top:4px;">Order ${order.id.slice(-6)} | ${order.createdAt ? order.createdAt.slice(0, 19).replace("T", " ") : "Recent"}</div>
        </div>
        <div style="padding:16px;">
          <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:14px;">
            <div><div style="font-size:11px;color:#64748b;">Customer</div><div style="font-weight:700;">${order.customer}</div></div>
            <div style="text-align:right;"><div style="font-size:11px;color:#64748b;">Payment</div><div style="font-weight:700;">${order.paymentMode} | ${order.paymentStatus}</div></div>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr><th align="left">Item</th><th align="center">Qty</th><th align="right">Price</th></tr></thead><tbody>${rows}</tbody></table>
          <div style="margin-top:14px;padding-top:14px;border-top:2px solid #111827;display:flex;justify-content:space-between;">
            <div><div style="font-size:11px;color:#64748b;">Status</div><div style="font-weight:700;">${formatStatusLabel(order.status)}</div></div>
            <div style="text-align:right;"><div style="font-size:11px;color:#64748b;">Total</div><div style="font-size:22px;font-weight:800;">${order.amount.toFixed(2)} BDT</div></div>
          </div>
        </div>
      </div>
    </body></html>`;
}

function buildFulfillmentSequence(order: MerchantOrder, action: FulfillmentAction) {
  const status = normalizeStatus(order.status);
  if (action === "READY") {
    if (["PLACED", "PAYMENT_PENDING"].includes(status)) return ["CONFIRMED"];
    return [];
  }
  if (action === "SHIP") {
    if (["PLACED", "PAYMENT_PENDING"].includes(status)) return ["CONFIRMED", "SHIPPED"];
    if (status === "CONFIRMED") return ["SHIPPED"];
    return [];
  }
  if (["PLACED", "PAYMENT_PENDING"].includes(status)) return ["CONFIRMED", "SHIPPED", "DELIVERED"];
  if (status === "CONFIRMED") return ["SHIPPED", "DELIVERED"];
  if (status === "SHIPPED") return ["DELIVERED"];
  return [];
}

export function MerchantOrdersScreen() {
  const accessToken = useMerchantAuthStore((state) => state.accessToken);
  const preferOnlineTab = useMerchantOrdersHandoffStore((state) => state.preferOnlineTab);
  const preferFollowUpOnly = useMerchantOrdersHandoffStore((state) => state.preferFollowUpOnly);
  const requestedOrderId = useMerchantOrdersHandoffStore((state) => state.requestedOrderId);
  const clearOrderHandoff = useMerchantOrdersHandoffStore((state) => state.clearHandoff);
  const markOrderReviewed = useMerchantOrdersHandoffStore((state) => state.markOrderReviewed);
  const [orders, setOrders] = useState<MerchantOrder[]>([]);
  const [viewTab, setViewTab] = useState<OrderViewTab>("DIRECT");
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_FILTERS[number]>("ALL");
  const [followUpOnly, setFollowUpOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [acknowledgedOrderIds, setAcknowledgedOrderIds] = useState<string[]>([]);
  const [receiptPreset, setReceiptPreset] = useState<ReceiptPreset>("THERMAL_58");

  const loadOrders = useCallback(async () => {
    if (!accessToken) {
      setOrders([]);
      setIsLoading(false);
      setError("Merchant session missing. Please sign in again.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await getMerchantOrdersRequest(accessToken);
      const rows = (response.data || []).map(mapOrder).filter((row) => row.id);
      setOrders(rows);
      setStatusMessage(`Loaded ${rows.length} live orders.`);
    } catch (loadError) {
      setOrders([]);
      setError(loadError instanceof Error ? loadError.message : "Unable to load merchant orders.");
      setStatusMessage(null);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (!preferOnlineTab && !preferFollowUpOnly && !requestedOrderId) return;
    if (preferOnlineTab) {
      setViewTab("ONLINE");
    }
    if (preferFollowUpOnly) {
      setFollowUpOnly(true);
    }
    setStatusFilter("ALL");
    if (requestedOrderId) {
      setExpandedOrderId(requestedOrderId);
      setSearchQuery(requestedOrderId.slice(-6));
      setStatusMessage(`POS follow-up queue opened for order ${requestedOrderId.slice(-6)}.`);
    } else {
      setStatusMessage("POS follow-up queue opened.");
    }
    clearOrderHandoff();
  }, [clearOrderHandoff, preferFollowUpOnly, preferOnlineTab, requestedOrderId]);

  const visibleOrders = useMemo(
    () => orders.filter((order) => matchesView(order, viewTab) && matchesStatusFilter(order, statusFilter) && matchesSearch(order, searchQuery) && (!followUpOnly || (needsPosFollowUp(order) && !acknowledgedOrderIds.includes(order.id)))),
    [acknowledgedOrderIds, followUpOnly, orders, viewTab, statusFilter, searchQuery],
  );
  const directCount = useMemo(() => orders.filter((order) => matchesView(order, "DIRECT")).length, [orders]);
  const onlineCount = useMemo(() => orders.filter((order) => matchesView(order, "ONLINE")).length, [orders]);
  const transactionCount = useMemo(() => orders.filter((order) => matchesView(order, "TRANSACTIONS")).length, [orders]);
  const totalVisibleAmount = useMemo(() => visibleOrders.reduce((sum, order) => sum + order.amount, 0), [visibleOrders]);
  const pendingVisibleCount = useMemo(() => visibleOrders.filter((order) => ["PLACED", "PAYMENT_PENDING", "PENDING"].includes(normalizeStatus(order.status))).length, [visibleOrders]);
  const followUpVisibleCount = useMemo(() => visibleOrders.filter((order) => needsPosFollowUp(order) && !acknowledgedOrderIds.includes(order.id)).length, [acknowledgedOrderIds, visibleOrders]);
  const followUpTotalCount = useMemo(() => orders.filter((order) => needsPosFollowUp(order) && !acknowledgedOrderIds.includes(order.id)).length, [acknowledgedOrderIds, orders]);

  async function runStatusSequence(orderId: string, nextStatuses: string[]) {
    if (!accessToken || !nextStatuses.length) return;
    setUpdatingOrderId(orderId);
    setError(null);
    setStatusMessage(null);
    try {
      for (const nextStatus of nextStatuses) {
        await updateMerchantOrderStatusRequest(accessToken, orderId, nextStatus);
      }
      await loadOrders();
      setStatusMessage(`Order ${orderId.slice(-6)} updated.`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update order status.");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  const handleAcknowledgeFollowUp = useCallback((orderId: string) => {
    setAcknowledgedOrderIds((current) => current.includes(orderId) ? current : [...current, orderId]);
    markOrderReviewed(orderId);
    setStatusMessage(`POS follow-up cleared for order ${orderId.slice(-6)}.`);
  }, [markOrderReviewed]);

  async function handlePrintOrder(order: MerchantOrder) {
    try {
      await getPrintModule().print({ html: buildOrderPrintHtml(order, receiptPreset), jobName: `Order ${order.id.slice(-6)}` });
      setStatusMessage(`Order ${order.id.slice(-6)} sent to printer.`);
    } catch {
      await Share.share({
        title: `Order ${order.id.slice(-6)}`,
        message: `Order ${order.id.slice(-6)}\nCustomer: ${order.customer}\nPayment: ${order.paymentMode} | ${order.paymentStatus}\nTotal: ${order.amount.toFixed(2)} BDT\n${order.items.map((item) => `- ${item.name} x${item.quantity} @ ${item.price.toFixed(2)}`).join("\n")}`,
      });
      setStatusMessage(`Printer unavailable. Order ${order.id.slice(-6)} opened in share options.`);
    }
  }

  return (
    <View style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <MerchantTopNav active="Orders" />

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroBrandWrap}>
              <DokanXLogo variant="icon" size="sm" />
              <View style={styles.heroBrandCopy}>
                <Text style={styles.eyebrow}>Fulfillment desk</Text>
                <Text style={styles.heroTitle}>Merchant orders</Text>
              </View>
            </View>
            <Pressable style={styles.heroGhostButton} onPress={() => void loadOrders()}>
              <Text style={styles.heroGhostText}>{isLoading ? "Refreshing" : "Refresh"}</Text>
            </Pressable>
          </View>
          <Text style={styles.heroSubtitle}>Track direct sales, online orders, and completed transaction records from one operational queue.</Text>
          <View style={styles.heroSignalRow}>
            <View style={styles.heroSignalCard}><Text style={styles.heroSignalLabel}>Visible volume</Text><Text style={styles.heroSignalValue}>{visibleOrders.length}</Text></View>
            <View style={styles.heroSignalCard}><Text style={styles.heroSignalLabel}>Pending now</Text><Text style={styles.heroSignalValue}>{pendingVisibleCount}</Text></View>
            <View style={styles.heroSignalCard}><Text style={styles.heroSignalLabel}>POS follow-up</Text><Text style={styles.heroSignalValue}>{followUpVisibleCount}</Text></View>
            <View style={styles.heroSignalCard}><Text style={styles.heroSignalLabel}>Visible total</Text><Text style={styles.heroSignalValue}>BDT {totalVisibleAmount.toFixed(0)}</Text></View>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Direct</Text><Text style={styles.summaryValue}>{directCount}</Text><Text style={styles.summaryHint}>Counter and walk-in flow</Text></View>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Online</Text><Text style={styles.summaryValue}>{onlineCount}</Text><Text style={styles.summaryHint}>Delivery and remote orders</Text></View>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Transactions</Text><Text style={styles.summaryValue}>{transactionCount}</Text><Text style={styles.summaryHint}>Completed payment records</Text></View>
        </View>

        <View style={styles.toolbarCard}>
          <TextInput style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} placeholder="Search customer, order, item" placeholderTextColor={BRAND.muted} />
          <View style={styles.tabRow}>
            {VIEW_TABS.map((tab) => (
              <Pressable key={tab} style={[styles.filterPill, viewTab === tab ? styles.filterPillActive : null]} onPress={() => setViewTab(tab)}>
                <Text style={[styles.filterText, viewTab === tab ? styles.filterTextActive : null]}>{tab}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.filterRow}>
            <Pressable style={[styles.filterPill, followUpOnly ? styles.filterPillActive : styles.followUpPill]} onPress={() => setFollowUpOnly((current) => !current)}>
              <Text style={[styles.filterText, followUpOnly ? styles.filterTextActive : styles.followUpPillText]}>POS follow-up {followUpOnly ? `(${followUpVisibleCount})` : `(${followUpTotalCount})`}</Text>
            </Pressable>
            {STATUS_FILTERS.map((item) => (
              <Pressable key={item} style={[styles.filterPill, statusFilter === item ? styles.filterPillActive : null]} onPress={() => setStatusFilter(item)}>
                <Text style={[styles.filterText, statusFilter === item ? styles.filterTextActive : null]}>{item}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.receiptRow}>
            {["THERMAL_58", "THERMAL_80", "A4"].map((preset) => (
              <Pressable key={preset} style={[styles.receiptPill, receiptPreset === preset ? styles.receiptPillActive : null]} onPress={() => setReceiptPreset(preset as ReceiptPreset)}>
                <Text style={[styles.receiptText, receiptPreset === preset ? styles.receiptTextActive : null]}>{preset}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {error ? <View style={styles.alertError}><Text style={styles.alertTitle}>Orders unavailable</Text><Text style={styles.alertBody}>{error}</Text></View> : null}
        {statusMessage ? <View style={styles.alertInfo}><Text style={styles.alertBody}>{statusMessage}</Text></View> : null}

        {visibleOrders.map((order) => {
          const isExpanded = expandedOrderId === order.id;
          const isUpdating = updatingOrderId === order.id;
          const readySequence = buildFulfillmentSequence(order, "READY");
          const handoverSequence = buildFulfillmentSequence(order, "HANDOVER");
          const shipSequence = buildFulfillmentSequence(order, "SHIP");
          const statusTone = getStatusTone(order.status);
          const paymentTone = getStatusTone(order.paymentStatus);
          const needsPosAttention = needsPosFollowUp(order) && !acknowledgedOrderIds.includes(order.id);
          return (
            <View key={order.id} style={[styles.card, needsPosAttention ? styles.cardPriority : null]}>
              <Pressable style={styles.cardHeader} onPress={() => setExpandedOrderId((current) => current === order.id ? null : order.id)}>
                <View style={styles.leftBlock}>
                  <Text style={styles.cardTitle}>{order.customer}</Text>
                  <Text style={styles.cardSubtitle}>Order {order.id.slice(-6)} • {order.createdAt ? order.createdAt.slice(0, 10) : "Recent"} • {order.itemCount} items</Text>
                  <View style={styles.metaRow}>
                    <Text style={[styles.badge, { backgroundColor: statusTone.bg, color: statusTone.fg }]}>{formatStatusLabel(order.status)}</Text>
                    <Text style={[styles.badge, { backgroundColor: paymentTone.bg, color: paymentTone.fg }]}>{formatStatusLabel(order.paymentStatus)}</Text>
                    <Text style={styles.modeBadge}>{order.paymentMode}</Text>
                    {needsPosAttention ? <Text style={styles.priorityBadge}>POS follow-up</Text> : null}
                    <Text style={styles.expandHint}>{isExpanded ? "Hide" : "Details"}</Text>
                  </View>
                </View>
                <Text style={styles.amount}>BDT {order.amount.toFixed(2)}</Text>
              </Pressable>

              {isExpanded ? (
                <View style={styles.detailBlock}>
                  <Text style={styles.detailTitle}>Items</Text>
                  {order.items.map((item, index) => (
                    <View key={`${order.id}-${index}`} style={styles.itemRow}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemMeta}>{item.quantity} x {item.price.toFixed(2)} BDT</Text>
                    </View>
                  ))}
                  {!order.items.length ? <Text style={styles.completedText}>No item detail available for this order.</Text> : null}

                  {viewTab === "DIRECT" ? (
                    <View style={styles.fulfillmentCard}>
                      <Text style={styles.detailTitle}>Finish direct sale</Text>
                      <Text style={styles.fulfillmentBody}>Confirm whether the order is ready in POS, handed over now, or should go out through shipping.</Text>
                      <View style={styles.actionRow}>
                        <Pressable style={[styles.actionButton, (!readySequence.length || isUpdating) ? styles.actionButtonDisabled : null]} disabled={!readySequence.length || isUpdating} onPress={() => void runStatusSequence(order.id, readySequence)}><Text style={styles.actionButtonText}>{isUpdating ? "Updating..." : getFulfillmentLabel("READY")}</Text></Pressable>
                        <Pressable style={[styles.actionButton, (!handoverSequence.length || isUpdating) ? styles.actionButtonDisabled : null]} disabled={!handoverSequence.length || isUpdating} onPress={() => void runStatusSequence(order.id, handoverSequence)}><Text style={styles.actionButtonText}>{isUpdating ? "Updating..." : getFulfillmentLabel("HANDOVER")}</Text></Pressable>
                        <Pressable style={[styles.actionButton, (!shipSequence.length || isUpdating) ? styles.actionButtonDisabled : null]} disabled={!shipSequence.length || isUpdating} onPress={() => void runStatusSequence(order.id, shipSequence)}><Text style={styles.actionButtonText}>{isUpdating ? "Updating..." : getFulfillmentLabel("SHIP")}</Text></Pressable>
                      </View>
                    </View>
                  ) : null}

                  {needsPosAttention ? (
                    <View style={styles.priorityCallout}>
                      <Text style={styles.detailTitle}>Needs payment follow-up</Text>
                      <Text style={styles.fulfillmentBody}>This online order still looks pending. Review payment status before shipping or handover.</Text>
                      <View style={styles.actionRow}>
                        <Pressable style={styles.priorityActionButton} onPress={() => handleAcknowledgeFollowUp(order.id)}><Text style={styles.priorityActionText}>Acknowledge</Text></Pressable>
                      </View>
                    </View>
                  ) : null}

                  {viewTab === "ONLINE" ? (
                    <View style={styles.fulfillmentCard}>
                      <Text style={styles.detailTitle}>Online order flow</Text>
                      <Text style={styles.fulfillmentBody}>Accept, ship, or cancel the order after payment and delivery readiness are confirmed.</Text>
                      <View style={styles.actionRow}>
                        <Pressable style={[styles.actionButton, (buildFulfillmentSequence(order, "READY").length === 0 || isUpdating) ? styles.actionButtonDisabled : null]} disabled={buildFulfillmentSequence(order, "READY").length === 0 || isUpdating} onPress={() => void runStatusSequence(order.id, buildFulfillmentSequence(order, "READY"))}><Text style={styles.actionButtonText}>{isUpdating ? "Updating..." : "Accept"}</Text></Pressable>
                        <Pressable style={[styles.actionButton, (shipSequence.length === 0 || isUpdating) ? styles.actionButtonDisabled : null]} disabled={shipSequence.length === 0 || isUpdating} onPress={() => void runStatusSequence(order.id, shipSequence)}><Text style={styles.actionButtonText}>{isUpdating ? "Updating..." : "Ship"}</Text></Pressable>
                        <Pressable style={[styles.cancelButton, (normalizeStatus(order.status) === "CANCELLED" || isUpdating) ? styles.actionButtonDisabled : null]} disabled={normalizeStatus(order.status) === "CANCELLED" || isUpdating} onPress={() => void runStatusSequence(order.id, ["CANCELLED"])}><Text style={styles.cancelButtonText}>{isUpdating ? "Updating..." : "Cancel"}</Text></Pressable>
                      </View>
                    </View>
                  ) : null}

                  {viewTab === "TRANSACTIONS" ? (
                    <View style={styles.fulfillmentCard}>
                      <Text style={styles.detailTitle}>Transaction record</Text>
                      <Text style={styles.fulfillmentBody}>Use this tab to review completed records, payment states, and receipt actions without touching active fulfillment queues.</Text>
                    </View>
                  ) : null}

                  <View style={styles.actionRow}>
                    <Pressable style={styles.printButton} onPress={() => void handlePrintOrder(order)}><Text style={styles.printButtonText}>Print order</Text></Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}

        {!visibleOrders.length ? <Text style={styles.emptyText}>No orders match the current tab and filter.</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BRAND.cream },
  container: { padding: 16, gap: 12, paddingBottom: 118 },
  heroCard: { backgroundColor: BRAND.navy, borderRadius: 26, padding: 18, gap: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  heroBrandWrap: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  heroBrandCopy: { flex: 1, gap: 4 },
  eyebrow: { color: "#ffd49f", fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  heroTitle: { color: "#ffffff", fontSize: 24, fontWeight: "800" },
  heroSubtitle: { color: "#dbe7fb", fontSize: 13, lineHeight: 20 },
  heroGhostButton: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.16)", backgroundColor: "rgba(255,255,255,0.06)" },
  heroGhostText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
  heroSignalRow: { flexDirection: "row", gap: 10 },
  heroSignalCard: { flex: 1, borderRadius: 16, padding: 12, backgroundColor: "rgba(255,255,255,0.08)", gap: 4 },
  heroSignalLabel: { color: "#bfd2f2", fontSize: 11, fontWeight: "600" },
  heroSignalValue: { color: "#ffffff", fontSize: 16, fontWeight: "800" },
  summaryRow: { flexDirection: "row", gap: 8 },
  summaryCard: { flex: 1, backgroundColor: BRAND.surface, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: BRAND.border, gap: 4 },
  summaryLabel: { fontSize: 11, color: BRAND.muted, fontWeight: "700" },
  summaryValue: { fontSize: 18, fontWeight: "800", color: BRAND.ink },
  summaryHint: { fontSize: 11, color: BRAND.slate, lineHeight: 16 },
  toolbarCard: { backgroundColor: BRAND.surface, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: BRAND.border, gap: 12 },
  searchInput: { borderWidth: 1, borderColor: BRAND.border, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: BRAND.surfaceSoft, color: BRAND.ink },
  tabRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: BRAND.border, backgroundColor: BRAND.surfaceSoft },
  filterPillActive: { backgroundColor: BRAND.navy, borderColor: BRAND.navy },
  followUpPill: { backgroundColor: "#fff7ed", borderColor: "#fdba74" },
  followUpPillText: { color: "#9a3412" },
  filterText: { fontSize: 12, fontWeight: "700", color: BRAND.ink },
  filterTextActive: { color: "#ffffff" },
  receiptRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  receiptPill: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: "#fed7aa", backgroundColor: "#fff7ed" },
  receiptPillActive: { backgroundColor: BRAND.orange, borderColor: BRAND.orange },
  receiptText: { color: "#9a3412", fontSize: 11, fontWeight: "700" },
  receiptTextActive: { color: "#ffffff" },
  alertError: { backgroundColor: "#fef2f2", borderColor: "#fecaca", borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  alertInfo: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe", borderWidth: 1, borderRadius: 14, padding: 14 },
  alertTitle: { fontSize: 13, fontWeight: "700", color: "#991b1b" },
  alertBody: { fontSize: 12, color: BRAND.slate },
  card: { backgroundColor: BRAND.surface, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: BRAND.border, gap: 12 },
  cardPriority: { borderColor: "#fdba74", backgroundColor: "#fffaf2" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  leftBlock: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: BRAND.ink },
  cardSubtitle: { fontSize: 12, color: BRAND.muted, lineHeight: 18 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2, alignItems: "center" },
  badge: { fontSize: 10, fontWeight: "800", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, overflow: "hidden" },
  priorityBadge: { fontSize: 10, fontWeight: "800", color: "#9a3412", backgroundColor: "#ffedd5", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, overflow: "hidden" },
  modeBadge: { fontSize: 10, fontWeight: "800", color: BRAND.slate, backgroundColor: BRAND.surfaceSoft, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, overflow: "hidden" },
  expandHint: { fontSize: 10, fontWeight: "800", color: "#9a3412" },
  amount: { fontSize: 13, fontWeight: "800", color: BRAND.ink },
  detailBlock: { gap: 10, borderTopWidth: 1, borderTopColor: "#eef2f7", paddingTop: 10 },
  detailTitle: { fontSize: 12, fontWeight: "800", color: BRAND.ink },
  itemRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  itemName: { flex: 1, fontSize: 12, color: BRAND.ink },
  itemMeta: { fontSize: 12, color: BRAND.muted },
  fulfillmentCard: { backgroundColor: BRAND.surfaceSoft, borderRadius: 14, padding: 12, gap: 8, borderWidth: 1, borderColor: BRAND.border },
  priorityCallout: { backgroundColor: "#fff7ed", borderRadius: 14, padding: 12, gap: 8, borderWidth: 1, borderColor: "#fdba74" },
  priorityActionButton: { alignSelf: "flex-start", backgroundColor: "#ffffff", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: "#fdba74" },
  priorityActionText: { color: "#9a3412", fontSize: 12, fontWeight: "800" },
  fulfillmentBody: { fontSize: 12, color: BRAND.slate, lineHeight: 18 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionButton: { backgroundColor: BRAND.navy, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  cancelButton: { backgroundColor: "#fef2f2", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: "#fecaca" },
  actionButtonDisabled: { opacity: 0.55 },
  actionButtonText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
  cancelButtonText: { color: "#991b1b", fontSize: 12, fontWeight: "800" },
  printButton: { backgroundColor: "#fff7ed", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: "#fdba74" },
  printButtonText: { color: "#9a3412", fontSize: 12, fontWeight: "800" },
  completedText: { fontSize: 12, color: BRAND.muted },
  emptyText: { fontSize: 12, color: BRAND.muted, textAlign: "center", paddingVertical: 20 },
});






