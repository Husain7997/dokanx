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
import { DokanXLogo } from "../components/dokanx-logo";
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

const BRAND = {
  navy: "#0B1E3C",
  navySoft: "#17325F",
  orange: "#FF7A00",
  bg: "#F4F7FB",
  surface: "#FFFFFF",
  surfaceMuted: "#EEF3F9",
  border: "#D7DFEA",
  text: "#122033",
  textMuted: "#5F6F86",
  successBg: "#ECFDF3",
  successBorder: "#9AD9B0",
  dangerBg: "#FEF2F2",
  dangerBorder: "#F4B6B6",
  infoBg: "#EFF6FF",
  infoBorder: "#BFDBFE",
};

const TIMELINE = ["PLACED", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];

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
    if (!accessToken) return;

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

      const globalCustomerId = String(((await getCustomerOverviewFromOrders(accessToken)).globalCustomerId) || "");
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
          setStatus("Payment is still pending. Complete payment and return here to refresh the order again.");
        }
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load your orders right now.");
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

  const normalizedStatus = String(selectedOrder?.status || "PLACED").toUpperCase();
  const normalizedPayment = String(selectedOrder?.paymentStatus || "PENDING").toUpperCase();
  const activeTimelineIndex = Math.max(TIMELINE.indexOf(normalizedStatus), 0);

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
      setStatus(error instanceof Error ? error.message : "Unable to reopen payment right now.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateClaim() {
    if (!accessToken || !selectedOrder?._id || !eligibleItems.length || !reason.trim()) return;
    const productId = String(eligibleItems[0].productId || eligibleItems[0].product?._id || "");
    if (!productId) return;

    setSubmitting(true);
    setStatus(null);
    try {
      const customerInfo = await getCustomerOverviewFromOrders(accessToken);
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
      setStatus("Your claim has been submitted.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to submit your claim right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <DokanXLogo variant="full" size="sm" />
          <Text style={styles.heroEyebrow}>Order Tracking</Text>
          <Text style={styles.heroTitle}>Stay on top of payment, delivery, and after-sales support.</Text>
          <Text style={styles.heroDescription}>
            We keep every order, retry action, and claim-ready item visible from one place.
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Orders</Text>
              <Text style={styles.heroStatValue}>{orders.length}</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Active payment</Text>
              <Text style={styles.heroStatValueSmall}>{normalizedPayment}</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Claims</Text>
              <Text style={styles.heroStatValue}>{claims.length}</Text>
            </View>
          </View>
        </View>
        {!orders.length ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No customer orders found</Text>
            <Text style={styles.cardDescription}>Place an order first to unlock tracking, payment retries, and claims.</Text>
          </View>
        ) : null}

        {orders.length ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent orders</Text>
            <Text style={styles.cardDescription}>Jump between orders quickly and keep the active one pinned below.</Text>
            <View style={styles.orderTabs}>
              {orders.map((order) => {
                const active = selectedOrderId === String(order._id || "");
                return (
                  <Pressable
                    key={String(order._id || "")}
                    style={[styles.orderTab, active ? styles.orderTabActive : null]}
                    onPress={() => setSelectedOrderId(String(order._id || ""))}
                  >
                    <Text style={[styles.orderTabText, active ? styles.orderTabTextActive : null]}>
                      #{String(order._id || "").slice(-6)}
                    </Text>
                    <Text style={[styles.orderTabMeta, active ? styles.orderTabTextActive : null]}>
                      {String(order.status || "PLACED").toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {selectedOrder ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Order snapshot</Text>
              <Text style={styles.cardDescription}>Monitor fulfillment progress, payment confirmation, and claim readiness.</Text>
              <View style={styles.snapshotGrid}>
                <View style={styles.snapshotCard}>
                  <Text style={styles.snapshotLabel}>Order ID</Text>
                  <Text style={styles.snapshotValue}>#{String(selectedOrder._id || "").slice(-8)}</Text>
                </View>
                <View style={styles.snapshotCard}>
                  <Text style={styles.snapshotLabel}>Payment</Text>
                  <Text style={styles.snapshotValue}>{normalizedPayment}</Text>
                </View>
                <View style={styles.snapshotCard}>
                  <Text style={styles.snapshotLabel}>Delivery group</Text>
                  <Text style={styles.snapshotValueSmall}>{String(selectedOrder.deliveryGroupId || "Not grouped")}</Text>
                </View>
              </View>
              <View style={styles.timelineCard}>
                <Text style={styles.timelineTitle}>Progress</Text>
                <View style={styles.timelineRow}>
                  {TIMELINE.map((item, index) => {
                    const active = index <= activeTimelineIndex;
                    return (
                      <View key={item} style={styles.timelineStep}>
                        <View style={[styles.timelineDot, active ? styles.timelineDotActive : null]} />
                        <Text style={[styles.timelineText, active ? styles.timelineTextActive : null]}>{item}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
              <View style={styles.paymentBanner}>
                <Text style={styles.paymentBannerTitle}>Payment watch</Text>
                <Text style={styles.paymentBannerText}>
                  {normalizedPayment === "SUCCESS"
                    ? "Payment is confirmed. You can now focus on delivery and support updates."
                    : normalizedPayment === "FAILED"
                      ? "Payment failed for this order. Retry below when you are ready."
                      : "Payment is still pending. Return here after finishing checkout to refresh the status."}
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Items and protection</Text>
              <Text style={styles.cardDescription}>See which items can open a warranty or guarantee claim.</Text>
              {(selectedOrder.items || []).map((item, index) => (
                <View key={`${String(item.productId || index)}`} style={styles.itemRow}>
                  <View style={styles.itemMeta}>
                    <Text style={styles.itemName}>{String(item.product?.name || item.name || item.productId || "Item")}</Text>
                    <Text style={styles.itemSubtle}>Protection status</Text>
                  </View>
                  <Text style={styles.itemValue}>{item.claimEligibility?.any ? "Claim eligible" : "No claim"}</Text>
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
          </>
        ) : null}

        {eligibleItems.length ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Submit claim</Text>
            <Text style={styles.cardDescription}>Send the issue summary now and keep the order reference attached automatically.</Text>
            <TextInput
              style={styles.input}
              placeholder="Describe the issue"
              value={reason}
              onChangeText={setReason}
              multiline
            />
            <Pressable style={styles.actionButton} onPress={handleCreateClaim} disabled={submitting}>
              <Text style={styles.actionText}>{submitting ? "Submitting..." : "Submit claim"}</Text>
            </Pressable>
          </View>
        ) : null}

        {claims.length ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Claim history</Text>
            <Text style={styles.cardDescription}>Recent service requests connected to your customer account.</Text>
            {claims.slice(0, 5).map((claim, index) => (
              <View key={`${String(claim._id || index)}`} style={styles.itemRow}>
                <View style={styles.itemMeta}>
                  <Text style={styles.itemName}>{String(claim.type || "claim").toUpperCase()}</Text>
                  <Text style={styles.itemSubtle}>After-sales request</Text>
                </View>
                <Text style={styles.itemValue}>{String(claim.status || "pending").toUpperCase()}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Pressable style={styles.supportButton} onPress={() => navigation.navigate("LiveChat" as never)}>
          <Text style={styles.supportButtonText}>Open support center</Text>
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

async function getCustomerOverviewFromOrders(token: string) {
  const profile = await getProfileRequest(token).catch(() => null);
  const globalCustomerId = String(profile?.user?.globalCustomerId || "");
  return { globalCustomerId };
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BRAND.bg },
  container: { padding: 16, gap: 16 },
  hero: {
    backgroundColor: BRAND.navy,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: BRAND.navySoft,
    gap: 10,
  },
  heroEyebrow: {
    color: "#C4D2E8",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  heroTitle: { color: "#FFFFFF", fontSize: 24, lineHeight: 30, fontWeight: "800" },
  heroDescription: { color: "#D7E2F1", fontSize: 14, lineHeight: 21 },
  heroStats: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 6 },
  heroStatCard: {
    flexGrow: 1,
    minWidth: 96,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 4,
  },
  heroStatLabel: { color: "#C4D2E8", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  heroStatValue: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  heroStatValueSmall: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  card: {
    backgroundColor: BRAND.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
    gap: 12,
  },
  cardTitle: { fontSize: 18, fontWeight: "800", color: BRAND.text },
  cardDescription: { fontSize: 13, lineHeight: 20, color: BRAND.textMuted },
  orderTabs: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  orderTab: {
    minWidth: 110,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BRAND.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: BRAND.surfaceMuted,
    gap: 2,
  },
  orderTabActive: { backgroundColor: BRAND.navy, borderColor: BRAND.navy },
  orderTabText: { color: BRAND.text, fontSize: 12, fontWeight: "800" },
  orderTabTextActive: { color: "#FFFFFF" },
  orderTabMeta: { color: BRAND.textMuted, fontSize: 11, fontWeight: "600" },
  snapshotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  snapshotCard: {
    minWidth: 96,
    flexGrow: 1,
    backgroundColor: "#F7F9FC",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: BRAND.border,
    gap: 4,
  },
  snapshotLabel: { color: BRAND.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  snapshotValue: { color: BRAND.text, fontSize: 15, fontWeight: "800" },
  snapshotValueSmall: { color: BRAND.text, fontSize: 13, fontWeight: "700" },
  timelineCard: {
    backgroundColor: BRAND.surfaceMuted,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: BRAND.border,
    gap: 10,
  },
  timelineTitle: { color: BRAND.text, fontSize: 13, fontWeight: "800" },
  timelineRow: { gap: 10 },
  timelineStep: { flexDirection: "row", alignItems: "center", gap: 10 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#C6D2E1" },
  timelineDotActive: { backgroundColor: BRAND.orange },
  timelineText: { color: BRAND.textMuted, fontSize: 12, fontWeight: "700" },
  timelineTextActive: { color: BRAND.text },
  paymentBanner: {
    backgroundColor: BRAND.infoBg,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: BRAND.infoBorder,
    gap: 6,
  },
  paymentBannerTitle: { color: BRAND.text, fontSize: 13, fontWeight: "800" },
  paymentBannerText: { color: BRAND.text, fontSize: 12, lineHeight: 18 },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  itemMeta: { flex: 1, gap: 3 },
  itemName: { color: BRAND.text, fontSize: 13, fontWeight: "700" },
  itemSubtle: { color: BRAND.textMuted, fontSize: 11 },
  itemValue: { color: BRAND.navy, fontSize: 12, fontWeight: "800" },
  input: {
    minHeight: 96,
    textAlignVertical: "top",
    backgroundColor: BRAND.surfaceMuted,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: BRAND.text,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  actionButton: {
    alignSelf: "flex-start",
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: BRAND.navy,
  },
  actionText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  secondaryActionButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: BRAND.surface,
  },
  secondaryActionText: { color: BRAND.text, fontSize: 12, fontWeight: "700" },
  supportButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: BRAND.surface,
  },
  supportButtonText: { color: BRAND.navy, fontSize: 14, fontWeight: "800" },
  statusCard: {
    backgroundColor: BRAND.infoBg,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BRAND.infoBorder,
  },
  statusText: { color: "#1D4ED8", fontSize: 12, fontWeight: "700", lineHeight: 18 },
});

