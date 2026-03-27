import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { getMerchantOrdersRequest, updateMerchantOrderStatusRequest } from "../lib/api-client";
import { useMerchantAuthStore } from "../store/auth-store";
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

const STATUS_FILTERS = ["ALL", "PENDING", "CONFIRMED", "CANCELLED"] as const;
const VIEW_TABS: OrderViewTab[] = ["DIRECT", "ONLINE", "TRANSACTIONS"];

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

function getFulfillmentLabel(action: FulfillmentAction) {
  if (action === "READY") return "Ready in POS";
  if (action === "HANDOVER") return "Give now";
  return "Ship order";
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
  const [orders, setOrders] = useState<MerchantOrder[]>([]);
  const [viewTab, setViewTab] = useState<OrderViewTab>("DIRECT");
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_FILTERS[number]>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

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

  const visibleOrders = useMemo(
    () => orders.filter((order) => matchesView(order, viewTab) && matchesStatusFilter(order, statusFilter) && matchesSearch(order, searchQuery)),
    [orders, viewTab, statusFilter, searchQuery],
  );
  const directCount = useMemo(() => orders.filter((order) => matchesView(order, "DIRECT")).length, [orders]);
  const onlineCount = useMemo(() => orders.filter((order) => matchesView(order, "ONLINE")).length, [orders]);
  const transactionCount = useMemo(() => orders.filter((order) => matchesView(order, "TRANSACTIONS")).length, [orders]);

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

  return (
    <View style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <MerchantTopNav active="Orders" />
        <View style={styles.headerRow}>
          <Text style={styles.title}>Orders</Text>
          <Pressable style={styles.refreshButton} onPress={() => void loadOrders()}>
            <Text style={styles.refreshButtonText}>{isLoading ? "Refreshing..." : "Refresh"}</Text>
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Direct</Text><Text style={styles.summaryValue}>{directCount}</Text></View>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Online</Text><Text style={styles.summaryValue}>{onlineCount}</Text></View>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Transactions</Text><Text style={styles.summaryValue}>{transactionCount}</Text></View>
        </View>

        <View style={styles.tabRow}>
          {VIEW_TABS.map((tab) => (
            <Pressable key={tab} style={[styles.filterPill, viewTab === tab ? styles.filterPillActive : null]} onPress={() => setViewTab(tab)}>
              <Text style={[styles.filterText, viewTab === tab ? styles.filterTextActive : null]}>{tab}</Text>
            </Pressable>
          ))}
        </View>

        <TextInput style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} placeholder="Search customer, order, item" placeholderTextColor="#6b7280" />

        <View style={styles.filterRow}>
          {STATUS_FILTERS.map((item) => (
            <Pressable key={item} style={[styles.filterPill, statusFilter === item ? styles.filterPillActive : null]} onPress={() => setStatusFilter(item)}>
              <Text style={[styles.filterText, statusFilter === item ? styles.filterTextActive : null]}>{item}</Text>
            </Pressable>
          ))}
        </View>

        {error ? <View style={styles.alertError}><Text style={styles.alertTitle}>Orders unavailable</Text><Text style={styles.alertBody}>{error}</Text></View> : null}
        {statusMessage ? <View style={styles.alertInfo}><Text style={styles.alertBody}>{statusMessage}</Text></View> : null}

        {visibleOrders.map((order) => {
          const isExpanded = expandedOrderId === order.id;
          const isUpdating = updatingOrderId === order.id;
          const readySequence = buildFulfillmentSequence(order, "READY");
          const handoverSequence = buildFulfillmentSequence(order, "HANDOVER");
          const shipSequence = buildFulfillmentSequence(order, "SHIP");
          return (
            <View key={order.id} style={styles.card}>
              <Pressable style={styles.cardHeader} onPress={() => setExpandedOrderId((current) => current === order.id ? null : order.id)}>
                <View style={styles.leftBlock}>
                  <Text style={styles.cardTitle}>{order.customer}</Text>
                  <Text style={styles.cardSubtitle}>Order {order.id.slice(-6)} | {order.createdAt ? order.createdAt.slice(0, 10) : "Recent"} | {order.itemCount} items</Text>
                  <View style={styles.metaRow}>
                    <Text style={[styles.badge, { backgroundColor: getStatusTone(order.status).bg, color: getStatusTone(order.status).fg }]}>{formatStatusLabel(order.status)}</Text>
                    <Text style={[styles.badge, { backgroundColor: getStatusTone(order.paymentStatus).bg, color: getStatusTone(order.paymentStatus).fg }]}>{formatStatusLabel(order.paymentStatus)}</Text>
                    <Text style={styles.modeBadge}>{order.paymentMode}</Text>
                    <Text style={styles.expandHint}>{isExpanded ? "Hide" : "Details"}</Text>
                  </View>
                </View>
                <Text style={styles.amount}>{order.amount} BDT</Text>
              </Pressable>

              {isExpanded ? (
                <View style={styles.detailBlock}>
                  <Text style={styles.detailTitle}>Items</Text>
                  {order.items.map((item, index) => (
                    <View key={`${order.id}-${index}`} style={styles.itemRow}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemMeta}>{item.quantity} x {item.price} BDT</Text>
                    </View>
                  ))}
                  {!order.items.length ? <Text style={styles.completedText}>No item detail available for this order.</Text> : null}

                  {viewTab === "DIRECT" ? (
                    <View style={styles.fulfillmentCard}>
                      <Text style={styles.detailTitle}>Finish direct sale</Text>
                      <Text style={styles.fulfillmentBody}>Select whether this order is ready in POS, handed over now, or will go by shipping.</Text>
                      <View style={styles.actionRow}>
                        <Pressable style={[styles.actionButton, (!readySequence.length || isUpdating) ? styles.actionButtonDisabled : null]} disabled={!readySequence.length || isUpdating} onPress={() => void runStatusSequence(order.id, readySequence)}><Text style={styles.actionButtonText}>{isUpdating ? "Updating..." : getFulfillmentLabel("READY")}</Text></Pressable>
                        <Pressable style={[styles.actionButton, (!handoverSequence.length || isUpdating) ? styles.actionButtonDisabled : null]} disabled={!handoverSequence.length || isUpdating} onPress={() => void runStatusSequence(order.id, handoverSequence)}><Text style={styles.actionButtonText}>{isUpdating ? "Updating..." : getFulfillmentLabel("HANDOVER")}</Text></Pressable>
                        <Pressable style={[styles.actionButton, (!shipSequence.length || isUpdating) ? styles.actionButtonDisabled : null]} disabled={!shipSequence.length || isUpdating} onPress={() => void runStatusSequence(order.id, shipSequence)}><Text style={styles.actionButtonText}>{isUpdating ? "Updating..." : getFulfillmentLabel("SHIP")}</Text></Pressable>
                      </View>
                    </View>
                  ) : null}

                  {viewTab === "ONLINE" ? (
                    <View style={styles.fulfillmentCard}>
                      <Text style={styles.detailTitle}>Online order flow</Text>
                      <Text style={styles.fulfillmentBody}>Keep online orders here. Once payment is confirmed, accept, ship, or deliver from this card.</Text>
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
                      <Text style={styles.fulfillmentBody}>Use this tab later to review direct and online payment records with order items.</Text>
                    </View>
                  ) : null}
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
  safeArea: { flex: 1, backgroundColor: "#f8f4ef" },
  container: { padding: 16, gap: 12, paddingBottom: 118 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "700", color: "#111827" },
  refreshButton: { backgroundColor: "#fff7ed", borderRadius: 10, borderWidth: 1, borderColor: "#fed7aa", paddingHorizontal: 12, paddingVertical: 8 },
  refreshButtonText: { fontSize: 12, fontWeight: "600", color: "#9a3412" },
  searchInput: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#ffffff", color: "#111827" },
  summaryRow: { flexDirection: "row", gap: 8 },
  summaryCard: { flex: 1, backgroundColor: "#ffffff", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#e5e7eb", gap: 4 },
  summaryLabel: { fontSize: 11, color: "#6b7280" },
  summaryValue: { fontSize: 18, fontWeight: "800", color: "#111827" },
  tabRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "#d1d5db", backgroundColor: "#ffffff" },
  filterPillActive: { backgroundColor: "#111827", borderColor: "#111827" },
  filterText: { fontSize: 12, fontWeight: "600", color: "#111827" },
  filterTextActive: { color: "#ffffff" },
  alertError: { backgroundColor: "#fef2f2", borderColor: "#fecaca", borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  alertInfo: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe", borderWidth: 1, borderRadius: 14, padding: 14 },
  alertTitle: { fontSize: 13, fontWeight: "700", color: "#991b1b" },
  alertBody: { fontSize: 12, color: "#374151" },
  card: { backgroundColor: "#ffffff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#e5e7eb", gap: 12 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  leftBlock: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 14, fontWeight: "600", color: "#111827" },
  cardSubtitle: { fontSize: 12, color: "#6b7280" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2, alignItems: "center" },
  badge: { fontSize: 10, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, overflow: "hidden" },
  modeBadge: { fontSize: 10, fontWeight: "700", color: "#374151", backgroundColor: "#f3f4f6", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, overflow: "hidden" },
  expandHint: { fontSize: 10, fontWeight: "700", color: "#9a3412" },
  amount: { fontSize: 13, fontWeight: "700", color: "#111827" },
  detailBlock: { gap: 10, borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 10 },
  detailTitle: { fontSize: 12, fontWeight: "700", color: "#111827" },
  itemRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  itemName: { flex: 1, fontSize: 12, color: "#111827" },
  itemMeta: { fontSize: 12, color: "#6b7280" },
  fulfillmentCard: { backgroundColor: "#f8fafc", borderRadius: 12, padding: 12, gap: 8, borderWidth: 1, borderColor: "#e5e7eb" },
  fulfillmentBody: { fontSize: 12, color: "#475569" },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionButton: { backgroundColor: "#111827", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  cancelButton: { backgroundColor: "#fef2f2", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: "#fecaca" },
  actionButtonDisabled: { opacity: 0.55 },
  actionButtonText: { color: "#ffffff", fontSize: 12, fontWeight: "600" },
  cancelButtonText: { color: "#991b1b", fontSize: 12, fontWeight: "700" },
  completedText: { fontSize: 12, color: "#6b7280" },
  emptyText: { fontSize: 12, color: "#6b7280", textAlign: "center", paddingVertical: 20 },
});

