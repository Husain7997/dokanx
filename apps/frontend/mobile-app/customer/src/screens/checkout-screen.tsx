import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { clearCartRequest, getMyCreditRequest, getMyWalletRequest, getProfileRequest, placeOrderRequest } from "../lib/api-client";
import { startOnlinePaymentFlow } from "../lib/payment-flow";
import { DokanXLogo } from "../components/dokanx-logo";
import { useAuthStore } from "../store/auth-store";
import { useCartStore } from "../store/cart-store";
import { useTenantStore } from "../store/tenant-store";
import type { RootStackParamList } from "../navigation/root-navigator";

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
  warnBg: "#FFF7E8",
  warnBorder: "#FFD08A",
};

const deliveryOptions = [
  { id: "standard", label: "Standard delivery", fee: 120, note: "Best for routine orders across the city." },
  { id: "express", label: "Express delivery", fee: 220, note: "Faster handoff when timing matters more." },
  { id: "pickup", label: "Store pickup", fee: 0, note: "Collect directly from the selected shop." },
];

const paymentMethods = [
  { id: "cash_on_delivery", label: "Cash on delivery", note: "Pay after the order reaches you." },
  { id: "mobile_wallet", label: "Mobile wallet", note: "Complete payment through a mobile banking provider." },
  { id: "card_payment", label: "Card payment", note: "Use online card checkout and confirm from the gateway." },
  { id: "wallet_balance", label: "Wallet balance", note: "Use your DokanX wallet cash balance instantly." },
  { id: "pay_later", label: "Pay Later (Baki)", note: "Apply the order against your approved shop credit." },
];

const steps = ["Address", "Delivery", "Payment", "Review"];

export function CheckoutScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const accessToken = useAuthStore((state) => state.accessToken);
  const cartItems = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clear);
  const guestToken = useCartStore((state) => state.guestToken);
  const setGuestToken = useCartStore((state) => state.setGuestToken);
  const selectedShop = useTenantStore((state) => state.shop);

  const [step, setStep] = useState(1);
  const [delivery, setDelivery] = useState("standard");
  const [payment, setPayment] = useState("cash_on_delivery");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [savedAddresses, setSavedAddresses] = useState<Array<{ id?: string; label?: string; line1?: string }>>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [creditSnapshot, setCreditSnapshot] = useState<{
    totalDue?: number;
    creditAccounts?: Array<{ shopId?: string; outstandingBalance?: number; creditLimit?: number; availableCredit?: number; status?: string }>;
    perShopDue?: Array<{ shopId?: string; amount?: number }>;
  } | null>(null);
  const [address, setAddress] = useState({
    district: "Dhaka",
    thana: "Gulshan",
    area: "Gulshan-1",
    street: "House 12, Road 4",
    phone: "01700000000",
    note: "",
  });

  const totals = useMemo(() => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = deliveryOptions.find((item) => item.id === delivery)?.fee ?? 0;
    return { subtotal, shipping, total: subtotal + shipping };
  }, [cartItems, delivery]);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      if (!accessToken) return;
      try {
        const [response, walletResponse, creditResponse] = await Promise.all([
          getProfileRequest(accessToken),
          getMyWalletRequest(accessToken).catch(() => null),
          getMyCreditRequest(accessToken).catch(() => null),
        ]);
        if (!active) return;
        const addresses = Array.isArray(response.user?.addresses)
          ? response.user.addresses.map((row) => ({
              id: String(row.id || ""),
              label: String(row.label || "Address"),
              line1: String(row.line1 || ""),
            }))
          : [];
        setSavedAddresses(addresses.filter((row) => row.id));
        if (addresses[0]?.id) setSelectedAddressId(addresses[0].id);
        setWalletBalance(Number(walletResponse?.data?.balance?.cash || 0));
        setCreditSnapshot(creditResponse?.data || null);
      } catch {
        if (!active) return;
      }
    }
    void loadProfile();
    return () => {
      active = false;
    };
  }, [accessToken]);

  const walletInsufficient = payment === "wallet_balance" && walletBalance < totals.total;
  const activeCreditAccount = (creditSnapshot?.creditAccounts || []).find(
    (account) => String(account.shopId || "") === String(selectedShop?.id || "")
  );
  const creditAvailable = Number(activeCreditAccount?.availableCredit || 0);
  const creditBlocked =
    payment === "pay_later" &&
    (!activeCreditAccount || String(activeCreditAccount.status || "ACTIVE").toUpperCase() === "BLOCKED" || creditAvailable < totals.total);

  const selectedDelivery = deliveryOptions.find((item) => item.id === delivery);
  const selectedPayment = paymentMethods.find((item) => item.id === payment);
  const selectedAddressLabel = selectedAddressId
    ? savedAddresses.find((row) => row.id === selectedAddressId)?.label || "Saved address"
    : "Manual delivery address";

  async function handleConfirm() {
    if (!cartItems.length) {
      setError("Add items to your cart before starting checkout.");
      return;
    }
    if (!accessToken) {
      setError("Please sign in before placing this order.");
      navigation.navigate("Auth");
      return;
    }
    if (!selectedShop) {
      setError("Select a shop before checkout.");
      navigation.navigate("ShopSelect");
      return;
    }

    setSubmitting(true);
    setStatus(null);
    setError(null);
    if (payment === "wallet_balance" && walletInsufficient) {
      setSubmitting(false);
      setError(`Wallet balance is too low. Available ${walletBalance} BDT, required ${totals.total} BDT. Switch to COD or mobile wallet.`);
      return;
    }
    if (payment === "pay_later" && creditBlocked) {
      setSubmitting(false);
      setError(`Pay Later is not available for this shop. Available credit ${creditAvailable} BDT, required ${totals.total} BDT.`);
      return;
    }
    try {
      const orderResponse = await placeOrderRequest(
        accessToken,
        {
          items: cartItems.map((item) => ({ product: item.productId, quantity: item.quantity })),
          addressId: selectedAddressId || undefined,
          deliveryMode: delivery,
          paymentMode:
            payment === "cash_on_delivery"
              ? "COD"
              : payment === "wallet_balance"
                ? "WALLET"
                : payment === "pay_later"
                  ? "CREDIT"
                  : payment === "card_payment" || payment === "mobile_wallet"
                    ? "ONLINE"
                    : "ONLINE",
          notes: address.note,
          deliveryAddress: selectedAddressId
            ? undefined
            : {
                line1: `${address.street}, ${address.area}`,
                city: address.district,
                area: address.thana,
                postalCode: "",
                country: "BD",
              },
          shopId: selectedShop.id,
          totalAmount: totals.total,
        },
        selectedShop.id
      );
      const orderData = orderResponse.data as { _id?: string; orderId?: string } | undefined;
      const orderId = String(orderData?._id || orderData?.orderId || "");
      let latestOrderMessage =
        payment === "mobile_wallet" || payment === "card_payment"
          ? "Order confirmed. Opening your payment page..."
          : payment === "wallet_balance"
            ? "Order confirmed. Wallet payment is complete."
            : payment === "pay_later"
              ? "Order confirmed. The due has been added to your shop credit account."
              : "Order confirmed. Order tracking is ready.";
      let paymentMeta: { paymentUrl?: string; provider?: string } | null = null;
      if ((payment === "mobile_wallet" || payment === "card_payment") && orderId) {
        paymentMeta = await startOnlinePaymentFlow({
          accessToken,
          orderId,
          provider: payment === "card_payment" ? "stripe" : "bkash",
        });
        latestOrderMessage = "Payment page opened. Return here after completing payment to refresh the order status.";
      }
      if (selectedShop?.id) {
        try {
          const response = await clearCartRequest({
            shopId: selectedShop.id,
            token: accessToken,
            cartToken: guestToken,
          });
          if (response.guestToken) setGuestToken(response.guestToken);
        } catch {
          // Ignore cart clear errors after order placement.
        }
      }
      clearCart();
      setSubmitting(false);
      if (payment === "wallet_balance") {
        setWalletBalance((current) => Math.max(0, current - totals.total));
      }
      setStatus(latestOrderMessage);
      navigation.navigate("OrderTracking", {
        orderId,
        watchPayment: payment === "mobile_wallet" || payment === "card_payment",
        paymentUrl: paymentMeta?.paymentUrl,
        paymentProvider: paymentMeta?.provider,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Order could not be completed right now.";
      setSubmitting(false);
      setError(
        payment === "wallet_balance" && message.toLowerCase().includes("wallet")
          ? `${message} Choose COD or mobile wallet to finish checkout.`
          : payment === "pay_later" && message.toLowerCase().includes("credit")
            ? `${message} Ask the shop to raise your credit limit or choose another payment method.`
            : payment === "mobile_wallet" || payment === "card_payment"
              ? `${message} You can retry payment from order tracking.`
              : message
      );
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <DokanXLogo variant="full" size="sm" />
          <Text style={styles.heroEyebrow}>Checkout Command Center</Text>
          <Text style={styles.heroTitle}>Review everything once, then place the order with confidence.</Text>
          <Text style={styles.heroDescription}>
            Delivery, payment, wallet coverage, and shop credit stay visible in one flow so you can finish faster.
          </Text>
          <View style={styles.statRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Items</Text>
              <Text style={styles.statValue}>{cartItems.length}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Shop</Text>
              <Text style={styles.statValueSmall}>{selectedShop?.name || "Not selected"}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total</Text>
              <Text style={styles.statValue}>{totals.total} BDT</Text>
            </View>
          </View>
        </View>

        <View style={styles.stepRow}>
          {steps.map((label, index) => {
            const active = step === index + 1;
            return (
              <View key={label} style={[styles.stepPill, active ? styles.stepPillActive : null]}>
                <Text style={[styles.stepIndex, active ? styles.stepIndexActive : null]}>{index + 1}</Text>
                <Text style={[styles.stepText, active ? styles.stepTextActive : null]}>{label}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.overviewCard}>
          <View style={styles.overviewBlock}>
            <Text style={styles.overviewLabel}>Address mode</Text>
            <Text style={styles.overviewValue}>{selectedAddressLabel}</Text>
          </View>
          <View style={styles.overviewBlock}>
            <Text style={styles.overviewLabel}>Delivery mode</Text>
            <Text style={styles.overviewValue}>{selectedDelivery?.label || "Not selected"}</Text>
          </View>
          <View style={styles.overviewBlock}>
            <Text style={styles.overviewLabel}>Payment mode</Text>
            <Text style={styles.overviewValue}>{selectedPayment?.label || "Not selected"}</Text>
          </View>
        </View>

        {step === 1 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Shipping address</Text>
            <Text style={styles.cardDescription}>Use a saved address or switch to manual entry for this order.</Text>
            {savedAddresses.length ? (
              <View style={styles.savedAddressRow}>
                {savedAddresses.map((row) => {
                  const active = selectedAddressId === row.id;
                  return (
                    <Pressable
                      key={row.id}
                      style={[styles.savedAddressChip, active ? styles.savedAddressChipActive : null]}
                      onPress={() => setSelectedAddressId(row.id || "")}
                    >
                      <Text style={[styles.savedAddressChipTitle, active ? styles.savedAddressChipTitleActive : null]}>{row.label}</Text>
                      <Text style={[styles.savedAddressChipText, active ? styles.savedAddressChipTextActive : null]}>{row.line1 || "Saved location"}</Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  style={[styles.savedAddressChip, !selectedAddressId ? styles.savedAddressChipActive : null]}
                  onPress={() => setSelectedAddressId("")}
                >
                  <Text style={[styles.savedAddressChipTitle, !selectedAddressId ? styles.savedAddressChipTitleActive : null]}>Manual</Text>
                  <Text style={[styles.savedAddressChipText, !selectedAddressId ? styles.savedAddressChipTextActive : null]}>Type a one-time delivery address</Text>
                </Pressable>
              </View>
            ) : null}
            <TextInput style={styles.input} placeholder="District" value={address.district} onChangeText={(value) => setAddress((current) => ({ ...current, district: value }))} />
            <TextInput style={styles.input} placeholder="Thana" value={address.thana} onChangeText={(value) => setAddress((current) => ({ ...current, thana: value }))} />
            <TextInput style={styles.input} placeholder="Area" value={address.area} onChangeText={(value) => setAddress((current) => ({ ...current, area: value }))} />
            <TextInput style={styles.input} placeholder="Street" value={address.street} onChangeText={(value) => setAddress((current) => ({ ...current, street: value }))} />
            <TextInput style={styles.input} placeholder="Phone number" value={address.phone} onChangeText={(value) => setAddress((current) => ({ ...current, phone: value }))} keyboardType="phone-pad" />
            <TextInput style={styles.input} placeholder="Delivery note" value={address.note} onChangeText={(value) => setAddress((current) => ({ ...current, note: value }))} />
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Delivery options</Text>
            <Text style={styles.cardDescription}>Pick the speed that fits this order and keep the shipping cost visible.</Text>
            {deliveryOptions.map((option) => {
              const active = delivery === option.id;
              return (
                <Pressable key={option.id} style={[styles.optionCard, active ? styles.optionCardActive : null]} onPress={() => setDelivery(option.id)}>
                  <View style={styles.optionHeader}>
                    <Text style={[styles.optionTitle, active ? styles.optionTitleActive : null]}>{option.label}</Text>
                    <Text style={[styles.optionPrice, active ? styles.optionTitleActive : null]}>{option.fee} BDT</Text>
                  </View>
                  <Text style={[styles.optionSubtitle, active ? styles.optionSubtitleActive : null]}>{option.note}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        {step === 3 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment method</Text>
            <Text style={styles.cardDescription}>Compare wallet coverage, online payment, and shop credit before you confirm.</Text>
            <View style={styles.financeSnapshot}>
              <View style={styles.financeCard}>
                <Text style={styles.financeLabel}>Wallet cash</Text>
                <Text style={styles.financeValue}>{walletBalance} BDT</Text>
              </View>
              <View style={styles.financeCard}>
                <Text style={styles.financeLabel}>Current due</Text>
                <Text style={styles.financeValue}>{Number(creditSnapshot?.totalDue || 0)} BDT</Text>
              </View>
              <View style={styles.financeCard}>
                <Text style={styles.financeLabel}>Credit free</Text>
                <Text style={styles.financeValue}>{creditAvailable} BDT</Text>
              </View>
            </View>
            {paymentMethods.map((method) => {
              const active = payment === method.id;
              const summary =
                method.id === "wallet_balance"
                  ? `${method.label} (${walletBalance} BDT)`
                  : method.id === "pay_later"
                    ? `${method.label} (${creditAvailable} BDT available)`
                    : method.label;
              return (
                <Pressable key={method.id} style={[styles.optionCard, active ? styles.optionCardActive : null]} onPress={() => setPayment(method.id)}>
                  <Text style={[styles.optionTitle, active ? styles.optionTitleActive : null]}>{summary}</Text>
                  <Text style={[styles.optionSubtitle, active ? styles.optionSubtitleActive : null]}>{method.note}</Text>
                </Pressable>
              );
            })}
            {payment === "wallet_balance" ? (
              <View style={[styles.noticeCard, walletInsufficient ? styles.warnCard : styles.goodCard]}>
                <Text style={styles.noticeTitle}>Wallet payment check</Text>
                <Text style={styles.noticeText}>Available: {walletBalance} BDT</Text>
                <Text style={styles.noticeText}>Required: {totals.total} BDT</Text>
                {walletInsufficient ? (
                  <View style={styles.fallbackRow}>
                    <Pressable style={styles.fallbackButton} onPress={() => setPayment("cash_on_delivery")}>
                      <Text style={styles.fallbackText}>Switch to COD</Text>
                    </Pressable>
                    <Pressable style={styles.fallbackButton} onPress={() => setPayment("mobile_wallet")}>
                      <Text style={styles.fallbackText}>Switch to Mobile Wallet</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : null}
            {payment === "pay_later" ? (
              <View style={[styles.noticeCard, creditBlocked ? styles.warnCard : styles.goodCard]}>
                <Text style={styles.noticeTitle}>Pay Later credit check</Text>
                <Text style={styles.noticeText}>Current due: {Number(creditSnapshot?.totalDue || 0)} BDT</Text>
                <Text style={styles.noticeText}>Available at this shop: {creditAvailable} BDT</Text>
                <Text style={styles.noticeText}>Order total: {totals.total} BDT</Text>
                {creditBlocked ? (
                  <View style={styles.fallbackRow}>
                    <Pressable style={styles.fallbackButton} onPress={() => setPayment("cash_on_delivery")}>
                      <Text style={styles.fallbackText}>Switch to COD</Text>
                    </Pressable>
                    <Pressable style={styles.fallbackButton} onPress={() => setPayment("mobile_wallet")}>
                      <Text style={styles.fallbackText}>Switch to Mobile Banking</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        {step === 4 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Order review</Text>
            <Text style={styles.cardDescription}>This is the final confirmation snapshot before order placement.</Text>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewLabel}>Deliver to</Text>
              <Text style={styles.reviewValue}>{address.street}, {address.area}, {address.thana}, {address.district}</Text>
              <Text style={styles.reviewValue}>{address.phone}</Text>
            </View>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewLabel}>Delivery</Text>
              <Text style={styles.reviewValue}>{selectedDelivery?.label || delivery}</Text>
              <Text style={styles.reviewSubtle}>{selectedDelivery?.note}</Text>
            </View>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewLabel}>Payment</Text>
              <Text style={styles.reviewValue}>{selectedPayment?.label || payment.replaceAll("_", " ")}</Text>
              <Text style={styles.reviewSubtle}>{selectedPayment?.note}</Text>
            </View>
            <View style={styles.lineItemCard}>
              {cartItems.map((item) => (
                <View key={item.id} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{item.name} x {item.quantity}</Text>
                  <Text style={styles.summaryValue}>{item.price * item.quantity} BDT</Text>
                </View>
              ))}
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{totals.subtotal} BDT</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping</Text>
                <Text style={styles.summaryValue}>{totals.shipping} BDT</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotalLabel}>Total</Text>
                <Text style={styles.summaryTotalValue}>{totals.total} BDT</Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <Pressable style={[styles.secondaryButton, step === 1 ? styles.disabledButton : null]} onPress={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>
          {step < 4 ? (
            <Pressable style={styles.primaryButton} onPress={() => setStep((current) => Math.min(4, current + 1))}>
              <Text style={styles.primaryButtonText}>Continue</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.primaryButton} onPress={handleConfirm} disabled={submitting}>
              <Text style={styles.primaryButtonText}>{submitting ? "Confirming..." : "Confirm order"}</Text>
            </Pressable>
          )}
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {status ? (
          <View style={styles.statusCard}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
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
  statRow: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 6 },
  statCard: {
    flexGrow: 1,
    minWidth: 96,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 4,
  },
  statLabel: { color: "#C4D2E8", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  statValue: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  statValueSmall: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  stepRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stepPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  stepPillActive: { backgroundColor: BRAND.navy, borderColor: BRAND.navy },
  stepIndex: {
    width: 20,
    height: 20,
    borderRadius: 10,
    textAlign: "center",
    lineHeight: 20,
    fontSize: 11,
    fontWeight: "800",
    color: BRAND.navy,
    backgroundColor: BRAND.surfaceMuted,
  },
  stepIndexActive: { color: BRAND.navy, backgroundColor: "#FFFFFF" },
  stepText: { color: BRAND.textMuted, fontSize: 12, fontWeight: "700" },
  stepTextActive: { color: "#FFFFFF" },
  overviewCard: {
    backgroundColor: BRAND.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
    gap: 12,
  },
  overviewBlock: { gap: 4 },
  overviewLabel: { color: BRAND.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  overviewValue: { color: BRAND.text, fontSize: 15, fontWeight: "700" },
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
  savedAddressRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  savedAddressChip: {
    minWidth: 140,
    flexGrow: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: BRAND.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  savedAddressChipActive: { backgroundColor: BRAND.navy, borderColor: BRAND.navy },
  savedAddressChipTitle: { color: BRAND.text, fontSize: 12, fontWeight: "800" },
  savedAddressChipTitleActive: { color: "#FFFFFF" },
  savedAddressChipText: { color: BRAND.textMuted, fontSize: 11 },
  savedAddressChipTextActive: { color: "#D7E2F1" },
  input: {
    backgroundColor: BRAND.surfaceMuted,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: BRAND.text,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  optionCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: BRAND.surfaceMuted,
    gap: 6,
  },
  optionCardActive: { borderColor: BRAND.navy, backgroundColor: BRAND.navy },
  optionHeader: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  optionTitle: { flex: 1, fontSize: 14, fontWeight: "800", color: BRAND.text },
  optionTitleActive: { color: "#FFFFFF" },
  optionPrice: { fontSize: 13, fontWeight: "800", color: BRAND.orange },
  optionSubtitle: { fontSize: 12, lineHeight: 18, color: BRAND.textMuted },
  optionSubtitleActive: { color: "#D7E2F1" },
  financeSnapshot: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  financeCard: {
    minWidth: 96,
    flexGrow: 1,
    backgroundColor: "#F7F9FC",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: BRAND.border,
    gap: 4,
  },
  financeLabel: { color: BRAND.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  financeValue: { color: BRAND.text, fontSize: 15, fontWeight: "800" },
  noticeCard: { borderRadius: 18, padding: 14, borderWidth: 1, gap: 6 },
  goodCard: { backgroundColor: BRAND.successBg, borderColor: BRAND.successBorder },
  warnCard: { backgroundColor: BRAND.warnBg, borderColor: BRAND.warnBorder },
  noticeTitle: { color: BRAND.text, fontSize: 13, fontWeight: "800" },
  noticeText: { color: BRAND.text, fontSize: 12 },
  fallbackRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  fallbackButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: "#FFFFFF",
  },
  fallbackText: { color: BRAND.navy, fontSize: 12, fontWeight: "800" },
  reviewCard: {
    backgroundColor: BRAND.surfaceMuted,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: BRAND.border,
    gap: 4,
  },
  reviewLabel: { color: BRAND.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  reviewValue: { color: BRAND.text, fontSize: 14, fontWeight: "700" },
  reviewSubtle: { color: BRAND.textMuted, fontSize: 12, lineHeight: 18 },
  lineItemCard: {
    backgroundColor: "#F9FBFD",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: BRAND.border,
    gap: 10,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  summaryLabel: { flex: 1, fontSize: 13, color: BRAND.textMuted },
  summaryValue: { fontSize: 13, fontWeight: "700", color: BRAND.text },
  summaryDivider: { height: 1, backgroundColor: BRAND.border },
  summaryTotalLabel: { fontSize: 15, fontWeight: "800", color: BRAND.text },
  summaryTotalValue: { fontSize: 15, fontWeight: "800", color: BRAND.navy },
  actionRow: { flexDirection: "row", gap: 12 },
  primaryButton: { flex: 1, backgroundColor: BRAND.navy, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  secondaryButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: BRAND.surface,
  },
  secondaryButtonText: { color: BRAND.text, fontSize: 14, fontWeight: "700" },
  disabledButton: { opacity: 0.45 },
  errorCard: { backgroundColor: BRAND.dangerBg, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: BRAND.dangerBorder },
  errorText: { fontSize: 13, color: "#B42318", fontWeight: "700", lineHeight: 19 },
  statusCard: { backgroundColor: BRAND.successBg, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: BRAND.successBorder },
  statusText: { fontSize: 13, color: "#166534", lineHeight: 19 },
});






