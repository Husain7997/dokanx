import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  createClaimRequest,
  getCustomerClaimsRequest,
  getMyOrdersRequest,
  getOrderDetailRequest,
  getProfileRequest,
} from "../lib/api-client";
import { startOnlinePaymentFlow } from "../lib/payment-flow";
import { useAuthStore } from "../store/auth-store";

type OrderRow = {
  _id?: string;
  status?: string;
  paymentStatus?: string;
  createdAt?: string;
  deliveryGroupId?: string | null;
  items?: Array<{
    productId?: string;
    product?: { _id?: string; name?: string };
    name?: string;
    claimEligibility?: { any?: boolean; warranty?: boolean; guarantee?: boolean };
  }>;
};

export function OrderTrackingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const accessToken = useAuthStore((state) => state.accessToken);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [claims, setClaims] = useState<Array<Record<string, unknown>>>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const routeParams = (route.params as { orderId?: string; watchPayment?: boolean; paymentUrl?: string; paymentProvider?: string } | undefined) || undefined;
  const routeOrderId = String(routeParams?.orderId || "");
  const routeWatchPayment = Boolean(routeParams?.watchPayment);
  const routePaymentUrl = String(routeParams?.paymentUrl || "");
  const routePaymentProvider = String(routeParams?.paymentProvider || "bkash");
  const appStateRef = useRef(AppState.currentState);

  const refreshOrders = useCallback(async (options?: { preserveStatus?: boolean }) => {
    if (!accessToken) {
      return;
    }

    try {
      const response = await getMyOrdersRequest(accessToken);
      const rows = Array.isArray(response.data) ? (response.data as OrderRow[]) : [];
      setOrders(rows);
      const preferredId = routeOrderId || selectedOrderId || String(rows[0]?._id || "");
      setSelectedOrderId(preferredId);

      const detail = preferredId ? await getOrderDetailRequest(accessToken, preferredId).catch(() => null) : null;
      if (detail?.data) {
        const detailedOrder = detail.data as OrderRow;
        setOrders((current) => {
          const next = current.filter((row) => String(row._id || "") !== String(detailedOrder._id || ""));
          return [detailedOrder, ...next];
        });
      }

      const globalCustomerId = String(
        ((await getCustomerOverviewFromOrders(accessToken, rows, detail?.data as OrderRow | undefined)).globalCustomerId) || ""
      );
      if (globalCustomerId) {
        const claimResponse = await getCustomerClaimsRequest(accessToken, globalCustomerId).catch(() => null);
        setClaims(Array.isArray(claimResponse?.data) ? claimResponse.data : []);
      }

      const activeOrder = (detail?.data as OrderRow | undefined) || rows.find((row) => String(row._id || "") === preferredId);
      if (!options?.preserveStatus && routeWatchPayment && activeOrder) {
        const paymentStatus = String(activeOrder.paymentStatus || "PENDING").toUpperCase();
        const orderStatus = String(activeOrder.status || "PLACED").toUpperCase();
        if (paymentStatus === "SUCCESS") {
          setStatus("Payment completed successfully. Order status refreshed.");
        } else if (paymentStatus === "FAILED" || orderStatus === "PAYMENT_FAILED") {
          setStatus("Payment failed. You can retry below.");
        } else {
          setStatus("Payment still pending. Complete payment and return here to refresh again.");
        }
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load orders.");
    }
  }, [accessToken, routeOrderId, routeWatchPayment, selectedOrderId]);

  useEffect(() => {
    void refreshOrders({ preserveStatus: true });
  }, [refreshOrders]);

  useFocusEffect(
    useCallback(() => {
      if (routeWatchPayment) {
        void refreshOrders();
      }

      return undefined;
    }, [refreshOrders, routeWatchPayment])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const wasBackgrounded = appStateRef.current === "background" || appStateRef.current === "inactive";
      appStateRef.current = nextState;
      if (routeWatchPayment && wasBackgrounded && nextState === "active") {
        void refreshOrders();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refreshOrders, routeWatchPayment]);

  const selectedOrder = useMemo(
    () => orders.find((row) => String(row._id || "") === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  const eligibleItems = useMemo(
    () =>
      (selectedOrder?.items || []).filter((item) => {
        const eligibility = item.claimEligibility || {};
        return Boolean(eligibility.any || eligibility.warranty || eligibility.guarantee);
      }),
    [selectedOrder]
  );

  async function handleRetryPayment() {
    if (!accessToken || !selectedOrder?._id) return;
    setSubmitting(true);
    setStatus(null);
    try {
      const result = await startOnlinePaymentFlow({
        accessToken,
        orderId: String(selectedOrder._id),
        provider: routePaymentProvider || "bkash",
      });
      setStatus(result.message || "Payment page opened. Return here after completing payment to refresh status.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to retry payment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateClaim() {
    if (!accessToken || !selectedOrder?._id || !eligibleItems.length || !reason.trim()) return;
    const productId = String(
      eligibleItems[0].productId || eligibleItems[0].product?._id || ""
    );
    if (!productId) return;

    setSubmitting(true);
    setStatus(null);
    try {
      const customerInfo = await getCustomerOverviewFromOrders(accessToken, orders, selectedOrder);
      if (!customerInfo.globalCustomerId) {
        throw new Error("Customer identity not found.");
      }
      await createClaimRequest(accessToken, {
        orderId: String(selectedOrder._id),
        productId,
        customerId: customerInfo.globalCustomerId,
        type: "warranty",
        reason: reason.trim(),
      });
      const claimResponse = await getCustomerClaimsRequest(accessToken, customerInfo.globalCustomerId);
      setClaims(Array.isArray(claimResponse.data) ? claimResponse.data : []);
      setReason("");
      setStatus("Claim submitted.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to submit claim.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Order tracking</Text>
        {!orders.length ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No customer orders found</Text>
            <Text style={styles.cardSubtitle}>Place an order first to unlock tracking and claims.</Text>
          </View>
        ) : null}

        {orders.length ? (
          <View style={styles.orderTabs}>
            {orders.map((order) => (
              <Pressable
                key={String(order._id || "")}
                style={[
                  styles.orderTab,
                  selectedOrderId === String(order._id || "") ? styles.orderTabActive : null,
                ]}
                onPress={() => setSelectedOrderId(String(order._id || ""))}
              >
                <Text
                  style={[
                    styles.orderTabText,
                    selectedOrderId === String(order._id || "") ? styles.orderTabTextActive : null,
                  ]}
                >
                  {String(order._id || "").slice(-6)}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {selectedOrder ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Order {String(selectedOrder._id || "")}</Text>
            <Text style={styles.cardSubtitle}>
              {String(selectedOrder.status || "PLACED")} · Payment {String(selectedOrder.paymentStatus || "PENDING")}
            </Text>
            <Text style={styles.cardSubtitle}>
              Delivery group {String(selectedOrder.deliveryGroupId || "Not grouped")}
            </Text>
            {(selectedOrder.items || []).map((item, index) => (
              <View key={`${String(item.productId || index)}`} style={styles.row}>
                <Text style={styles.summaryLabel}>
                  {String(item.product?.name || item.name || item.productId || "Item")}
                </Text>
                <Text style={styles.summaryValue}>
                  {item.claimEligibility?.any ? "Claim eligible" : "No claim"}
                </Text>
              </View>
            ))}
            {selectedOrder.paymentStatus === "FAILED" || (routeWatchPayment && selectedOrder.paymentStatus !== "SUCCESS") ? (
              <Pressable style={styles.actionButton} onPress={handleRetryPayment} disabled={submitting}>
                <Text style={styles.actionText}>{submitting ? "Opening payment..." : "Retry payment"}</Text>
              </Pressable>
            ) : null}
            {routeWatchPayment && routePaymentUrl ? (
              <Pressable style={styles.secondaryActionButton} onPress={handleRetryPayment} disabled={submitting}>
                <Text style={styles.secondaryActionText}>Open payment page again</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {eligibleItems.length ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Submit claim</Text>
            <TextInput
              style={styles.input}
              placeholder="Describe the issue"
              value={reason}
              onChangeText={setReason}
            />
            <Pressable style={styles.actionButton} onPress={handleCreateClaim} disabled={submitting}>
              <Text style={styles.actionText}>{submitting ? "Submitting..." : "Submit claim"}</Text>
            </Pressable>
          </View>
        ) : null}

        {claims.length ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Claim history</Text>
            {claims.slice(0, 5).map((claim, index) => (
              <View key={`${String(claim._id || index)}`} style={styles.row}>
                <Text style={styles.summaryLabel}>{String(claim.type || "claim").toUpperCase()}</Text>
                <Text style={styles.summaryValue}>{String(claim.status || "pending").toUpperCase()}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate("LiveChat" as never)}>
          <Text style={styles.secondaryButtonText}>Support chat</Text>
        </Pressable>

        {status ? (
          <View style={styles.statusCard}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

async function getCustomerOverviewFromOrders(
  token: string,
  _orders: OrderRow[],
  _selectedOrder?: OrderRow
) {
  const profile = await getProfileRequest(token).catch(() => null);
  const globalCustomerId = String(profile?.user?.globalCustomerId || "");
  return { globalCustomerId };
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8f4ef" },
  container: { padding: 16, gap: 16 },
  title: { fontSize: 20, fontWeight: "700", color: "#1f2937" },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  cardSubtitle: { fontSize: 13, color: "#6b7280" },
  orderTabs: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  orderTab: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  orderTabActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  orderTabText: { color: "#111827", fontSize: 12, fontWeight: "600" },
  orderTabTextActive: { color: "#ffffff" },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  summaryLabel: { fontSize: 12, color: "#374151", flex: 1 },
  summaryValue: { fontSize: 12, color: "#111827", fontWeight: "600" },
  input: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderColor: "#e5e7eb",
    borderWidth: 1,
  },
  actionButton: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#111827",
  },
  actionText: { color: "#ffffff", fontSize: 12, fontWeight: "600" },
  secondaryActionButton: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
  },
  secondaryActionText: { color: "#111827", fontSize: 12, fontWeight: "600" },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  secondaryButtonText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
  },
  statusCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  statusText: { color: "#1d4ed8", fontSize: 12, fontWeight: "600" },
});
