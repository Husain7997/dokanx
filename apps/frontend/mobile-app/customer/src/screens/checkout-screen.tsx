import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { clearCartRequest, getMyCreditRequest, getMyWalletRequest, getProfileRequest, placeOrderRequest } from "../lib/api-client";
import { startOnlinePaymentFlow } from "../lib/payment-flow";
import { useAuthStore } from "../store/auth-store";
import { useCartStore } from "../store/cart-store";
import { useTenantStore } from "../store/tenant-store";

const deliveryOptions = [
  { id: "standard", label: "Standard delivery", fee: 120 },
  { id: "express", label: "Express delivery", fee: 220 },
  { id: "pickup", label: "Store pickup", fee: 0 },
];

const paymentMethods = [
  { id: "cash_on_delivery", label: "Cash on delivery" },
  { id: "mobile_wallet", label: "Mobile wallet" },
  { id: "card_payment", label: "Card payment" },
  { id: "wallet_balance", label: "Wallet balance" },
  { id: "pay_later", label: "Pay Later (Baki)" },
];

export function CheckoutScreen() {
  const navigation = useNavigation();
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
    return {
      subtotal,
      shipping,
      total: subtotal + shipping,
    };
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
        if (addresses[0]?.id) {
          setSelectedAddressId(addresses[0].id);
        }
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

  async function handleConfirm() {
    if (!cartItems.length) {
      setError("Add items to your cart before checkout.");
      return;
    }
    if (!accessToken) {
      setError("Please sign in to place an order.");
      navigation.navigate("Auth" as never);
      return;
    }
    if (!selectedShop) {
      setError("Select a shop before checkout.");
      navigation.navigate("ShopSelect" as never);
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
          ? "Order confirmed. Opening payment page..."
          : payment === "wallet_balance"
            ? "Order confirmed. Wallet payment succeeded."
            : payment === "pay_later"
              ? "Order confirmed. Due added to your shop credit account."
            : "Order confirmed. Tracking is ready.";
      let paymentMeta: { paymentUrl?: string; provider?: string } | null = null;
      if ((payment === "mobile_wallet" || payment === "card_payment") && orderId) {
        paymentMeta = await startOnlinePaymentFlow({
          accessToken,
          orderId,
          provider: payment === "card_payment" ? "stripe" : "bkash",
        });
        latestOrderMessage = "Payment page opened. Return here after completing payment to refresh status.";
      }
      if (selectedShop?.id) {
        try {
          const response = await clearCartRequest({
            shopId: selectedShop.id,
            token: accessToken,
            cartToken: guestToken,
          });
          if (response.guestToken) {
            setGuestToken(response.guestToken);
          }
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
      navigation.navigate("OrderTracking" as never, {
        orderId,
        watchPayment: payment === "mobile_wallet" || payment === "card_payment",
        paymentUrl: paymentMeta?.paymentUrl,
        paymentProvider: paymentMeta?.provider,
      } as never);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Order failed";
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
        <Text style={styles.title}>Checkout</Text>
        <View style={styles.stepRow}>
          {["Address", "Delivery", "Payment", "Review"].map((label, index) => (
            <View key={label} style={[styles.stepPill, step === index + 1 ? styles.stepActive : null]}>
              <Text style={[styles.stepText, step === index + 1 ? styles.stepTextActive : null]}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        {step === 1 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Shipping address</Text>
            {savedAddresses.length ? (
              <View style={styles.savedAddressRow}>
                {savedAddresses.map((row) => (
                  <Pressable
                    key={row.id}
                    style={[
                      styles.savedAddressChip,
                      selectedAddressId === row.id ? styles.savedAddressChipActive : null,
                    ]}
                    onPress={() => setSelectedAddressId(row.id || "")}
                  >
                    <Text
                      style={[
                        styles.savedAddressChipText,
                        selectedAddressId === row.id ? styles.savedAddressChipTextActive : null,
                      ]}
                    >
                      {row.label}
                    </Text>
                  </Pressable>
                ))}
                <Pressable
                  style={[
                    styles.savedAddressChip,
                    !selectedAddressId ? styles.savedAddressChipActive : null,
                  ]}
                  onPress={() => setSelectedAddressId("")}
                >
                  <Text
                    style={[
                      styles.savedAddressChipText,
                      !selectedAddressId ? styles.savedAddressChipTextActive : null,
                    ]}
                  >
                    Manual
                  </Text>
                </Pressable>
              </View>
            ) : null}
            <TextInput
              style={styles.input}
              placeholder="District"
              value={address.district}
              onChangeText={(value) => setAddress((current) => ({ ...current, district: value }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Thana"
              value={address.thana}
              onChangeText={(value) => setAddress((current) => ({ ...current, thana: value }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Area"
              value={address.area}
              onChangeText={(value) => setAddress((current) => ({ ...current, area: value }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Street"
              value={address.street}
              onChangeText={(value) => setAddress((current) => ({ ...current, street: value }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone number"
              value={address.phone}
              onChangeText={(value) => setAddress((current) => ({ ...current, phone: value }))}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Delivery note"
              value={address.note}
              onChangeText={(value) => setAddress((current) => ({ ...current, note: value }))}
            />
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Delivery options</Text>
            {deliveryOptions.map((option) => (
              <Pressable
                key={option.id}
                style={[
                  styles.optionCard,
                  delivery === option.id ? styles.optionCardActive : null,
                ]}
                onPress={() => setDelivery(option.id)}
              >
                <Text
                  style={[
                    styles.optionTitle,
                    delivery === option.id ? styles.optionTitleActive : null,
                  ]}
                >
                  {option.label}
                </Text>
                <Text
                  style={[
                    styles.optionSubtitle,
                    delivery === option.id ? styles.optionSubtitleActive : null,
                  ]}
                >
                  {option.fee} BDT
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment method</Text>
            <Text style={styles.cardSubtitle}>Wallet balance: {walletBalance} BDT</Text>
            <Text style={styles.cardSubtitle}>Due balance: {Number(creditSnapshot?.totalDue || 0)} BDT</Text>
            {paymentMethods.map((method) => (
              <Pressable
                key={method.id}
                style={[
                  styles.optionCard,
                  payment === method.id ? styles.optionCardActive : null,
                ]}
                onPress={() => setPayment(method.id)}
              >
                <Text
                  style={[
                    styles.optionTitle,
                    payment === method.id ? styles.optionTitleActive : null,
                  ]}
                >
                  {method.id === "wallet_balance"
                    ? `${method.label} (${walletBalance} BDT)`
                    : method.id === "pay_later"
                      ? `${method.label} (${creditAvailable} BDT available)`
                      : method.label}
                </Text>
              </Pressable>
            ))}
            {payment === "wallet_balance" ? (
              <View style={[styles.walletCard, walletInsufficient ? styles.walletCardWarn : null]}>
                <Text style={styles.walletCardTitle}>Wallet payment</Text>
                <Text style={styles.walletCardText}>Available: {walletBalance} BDT</Text>
                <Text style={styles.walletCardText}>Required: {totals.total} BDT</Text>
                {walletInsufficient ? (
                  <View style={styles.walletFallbackRow}>
                    <Pressable style={styles.walletFallbackButton} onPress={() => setPayment("cash_on_delivery")}>
                      <Text style={styles.walletFallbackText}>Use COD</Text>
                    </Pressable>
                    <Pressable style={styles.walletFallbackButton} onPress={() => setPayment("mobile_wallet")}>
                      <Text style={styles.walletFallbackText}>Use Mobile Wallet</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : null}
            {payment === "pay_later" ? (
              <View style={[styles.walletCard, creditBlocked ? styles.walletCardWarn : null]}>
                <Text style={styles.walletCardTitle}>Pay Later (বাকি)</Text>
                <Text style={styles.walletCardText}>Current due: {Number(creditSnapshot?.totalDue || 0)} BDT</Text>
                <Text style={styles.walletCardText}>Available at this shop: {creditAvailable} BDT</Text>
                <Text style={styles.walletCardText}>Order total: {totals.total} BDT</Text>
                {creditBlocked ? (
                  <View style={styles.walletFallbackRow}>
                    <Pressable style={styles.walletFallbackButton} onPress={() => setPayment("cash_on_delivery")}>
                      <Text style={styles.walletFallbackText}>Use COD</Text>
                    </Pressable>
                    <Pressable style={styles.walletFallbackButton} onPress={() => setPayment("mobile_wallet")}>
                      <Text style={styles.walletFallbackText}>Use Mobile Banking</Text>
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
            <View style={styles.reviewSection}>
              <Text style={styles.reviewLabel}>Deliver to</Text>
              <Text style={styles.reviewValue}>
                {address.street}, {address.area}, {address.thana}, {address.district}
              </Text>
              <Text style={styles.reviewValue}>{address.phone}</Text>
            </View>
            <View style={styles.reviewSection}>
              <Text style={styles.reviewLabel}>Delivery</Text>
              <Text style={styles.reviewValue}>{delivery}</Text>
            </View>
            <View style={styles.reviewSection}>
              <Text style={styles.reviewLabel}>Payment</Text>
              <Text style={styles.reviewValue}>{payment.replaceAll("_", " ")}</Text>
            </View>
            {cartItems.map((item) => (
              <View key={item.id} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{item.name} x {item.quantity}</Text>
                <Text style={styles.summaryValue}>{item.price * item.quantity} BDT</Text>
              </View>
            ))}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping</Text>
              <Text style={styles.summaryValue}>{totals.shipping} BDT</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={styles.summaryTotalValue}>{totals.total} BDT</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.secondaryButton, step === 1 ? styles.disabledButton : null]}
            onPress={() => setStep((current) => Math.max(1, current - 1))}
            disabled={step === 1}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>
          {step < 4 ? (
            <Pressable
              style={styles.primaryButton}
              onPress={() => setStep((current) => Math.min(4, current + 1))}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.primaryButton} onPress={handleConfirm} disabled={submitting}>
              <Text style={styles.primaryButtonText}>
                {submitting ? "Confirming..." : "Confirm order"}
              </Text>
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
  safeArea: {
    flex: 1,
    backgroundColor: "#f8f4ef",
  },
  container: {
    padding: 16,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
  },
  stepRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  stepPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
  },
  stepActive: {
    backgroundColor: "#111827",
  },
  stepText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4b5563",
  },
  stepTextActive: {
    color: "#ffffff",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 12,
  },
  savedAddressRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  savedAddressChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  savedAddressChipActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  savedAddressChipText: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "600",
  },
  savedAddressChipTextActive: {
    color: "#ffffff",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#6b7280",
  },
  input: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderColor: "#e5e7eb",
    borderWidth: 1,
  },
  optionCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  optionCardActive: {
    borderColor: "#111827",
    backgroundColor: "#111827",
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  optionTitleActive: {
    color: "#ffffff",
  },
  optionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#6b7280",
  },
  optionSubtitleActive: {
    color: "#e5e7eb",
  },
  walletCard: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    backgroundColor: "#f0fdf4",
    padding: 12,
    gap: 6,
  },
  walletCardWarn: {
    borderColor: "#fcd34d",
    backgroundColor: "#fffbeb",
  },
  walletCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  walletCardText: {
    fontSize: 12,
    color: "#374151",
  },
  walletFallbackRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  walletFallbackButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  walletFallbackText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },
  reviewSection: {
    gap: 4,
  },
  reviewLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  reviewValue: {
    fontSize: 13,
    color: "#111827",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  summaryValue: {
    fontSize: 12,
    color: "#111827",
  },
  summaryTotalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  summaryTotalValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
  },
  secondaryButtonText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
  errorCard: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: {
    fontSize: 13,
    color: "#b91c1c",
    fontWeight: "600",
  },
  statusCard: {
    backgroundColor: "#ecfdf3",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#86efac",
  },
  statusText: {
    fontSize: 13,
    color: "#166534",
  },
});
